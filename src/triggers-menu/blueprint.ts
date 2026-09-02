import {
    ConnectionId,
    OpenTrigger,
    splitEntryId,
    TriggerApplication,
    TriggerDataInput,
    TriggerFullId,
    TriggersSetting,
} from "engine";
import {
    MODULE,
    MouseInteractionManager,
    R,
    TooltipDirection,
    confirmDialog,
    createHTMLElement,
    distanceToPoint,
    dividePointBy,
    localize,
    purgeObject,
    subtractPoint,
} from "foundry-helpers";
import {
    BaseBlueprintEntry,
    BlueprintApplication,
    BlueprintConnectionsLayer,
    BlueprintGridLayer,
    BlueprintLayers,
    BlueprintNode,
    BlueprintNodesLayer,
    BlueprintNodesMenu,
    editLabelDialog,
    splitTwoWays,
} from ".";

class Blueprint extends PIXI.Application<HTMLCanvasElement> {
    #background: PIXI.Sprite;
    #disabledIds = new Set<string>();
    #enabledIds = new Set<string>();
    #gridLayer: BlueprintGridLayer;
    #hasDeletedTriggers = false;
    #hitArea: PIXI.Rectangle;
    #layers: BlueprintLayers;
    #modulesFolders: Record<string, string> = {};
    #mouseManager: MouseInteractionManager;
    #parent: BlueprintApplication;
    #triggerId: TriggerFullId | null = null;
    #triggers = new Collection<TriggerFullId, OpenTrigger>();

    constructor(parent: BlueprintApplication) {
        super({
            backgroundAlpha: 0,
            antialias: true,
            autoDensity: true,
            resolution: window.devicePixelRatio,
        });

        this.#parent = parent;

        this.stage.cullable = true;
        this.stage.hitArea = this.#hitArea = new PIXI.Rectangle();

        this.stage.addChild(
            (this.#background = PIXI.Sprite.from(parent.application.background.src)),
            (this.#gridLayer = new BlueprintGridLayer(this)),
            (this.#layers = new BlueprintLayers(this)),
        );

        this.#background.alpha = parent.application.background.alpha ?? 1;

        this.resetTriggers();

        const handlers: ConstructorParameters<typeof MouseInteractionManager>[3] = {
            unclickLeft: this._onUnclickLeft.bind(this),
            unclickRight: this._onUnclickRight.bind(this),
            dragLeftStart: this._onDragLeftStart.bind(this),
            dragLeftMove: this._onDragLeftMove.bind(this),
            dragLeftDrop: this._onDragLeftDrop.bind(this),
            dragRightStart: this._onDragRightStart.bind(this),
            dragRightMove: this._onDragRightMove.bind(this),
        };

        const canHandleMouse = () => {
            return !!this.trigger;
        };

        const permissions: ConstructorParameters<typeof MouseInteractionManager>[2] = {
            ...R.mapValues(handlers, () => canHandleMouse),
            clickLeft: canHandleMouse,
            clickRight: canHandleMouse,
        };

        this.#mouseManager = new foundry.canvas.interaction.MouseInteractionManager(
            this.stage,
            this.stage,
            permissions,
            handlers,
            { application: this },
        );

        this.#mouseManager.activate();

        // free application only has a single trigger so we set it right away
        if (this.application.isFreeApplication) {
            this.trigger = this.#triggers.contents[0];
        }
    }

    get parent(): BlueprintApplication {
        return this.#parent;
    }

    get application(): TriggerApplication {
        return this.parent.application;
    }

    get grid(): BlueprintGridLayer {
        return this.#gridLayer;
    }

    get connections(): BlueprintConnectionsLayer {
        return this.#layers.connections;
    }

    get nodes(): BlueprintNodesLayer {
        return this.#layers.nodes;
    }

    get triggers(): Collection<TriggerFullId, OpenTrigger> {
        return this.#triggers;
    }

    get trigger(): OpenTrigger | undefined {
        return this.#triggerId ? this.triggers.get(this.#triggerId) : undefined;
    }

    set trigger(value: TriggerFullId | OpenTrigger | null) {
        const fullId = value instanceof OpenTrigger ? value.fullId : value;

        if (this.#triggerId === fullId) return;
        if (fullId && !this.triggers.has(fullId)) return;

        this.#triggerId = fullId;

        this.scale = 1;
        this.setPosition(0, 0);

        if (fullId) {
            this.draw();
        } else {
            this.#clear();
        }

        if (fullId && MODULE.isDebug) {
            const trigger = this.triggers.get(fullId);
            MODULE.log("SET TRIGGER", trigger);
        }

        this.parent.render();
    }

    get locked(): boolean {
        const trigger = this.trigger;
        return !trigger || trigger.locked || trigger.invalid;
    }

    get scale(): number {
        return this.stage.scale.x;
    }

    set scale(value) {
        const actualValue = Math.clamp(value, 0.5, 2);
        if (actualValue === this.scale) return;

        this.stage.scale.set(actualValue);
        this.resizeAll();
    }

    get hasUpdatedTriggers() {
        return this.#hasDeletedTriggers || this.triggers.some((trigger) => trigger.updated);
    }

    resetTriggers(): void;
    resetTriggers(settings: TriggersSetting, removedTriggers: string[], updatedTriggers: string[]): void;
    resetTriggers(
        settings = this.parent.getTriggersSetting(),
        removedTriggers: string[] = [],
        updatedTriggers?: string[],
    ) {
        const startTime = performance.now();
        const isFirstReset = this.#triggers.size === 0;

        // we cache every updated trigger
        const currentlyUpdating = new Map(
            this.triggers.filter((trigger) => trigger.updated).map((trigger) => [trigger.id, trigger] as const),
        );

        this.#modulesFolders = settings.folders;

        this.#disabledIds.clear();
        this.#enabledIds.clear();

        for (const id of settings.disabled) {
            this.#disabledIds.add(id);
        }

        for (const id of settings.enabled) {
            this.#enabledIds.add(id);
        }

        // we delete triggers that were removed if not currently updating
        for (const triggerId of removedTriggers) {
            if (currentlyUpdating.has(triggerId)) continue;
            const fullId = `world:${triggerId}` as const;
            this.#triggers.delete(fullId);
        }

        // we add or replace (that are not currently updating) triggers only if needed
        for (const source of settings.sources) {
            if (!R.isObjectType(source) || !R.isString(source.id)) continue;
            if (currentlyUpdating.has(source.id)) continue; // we are currently updating that one
            if (updatedTriggers && !R.isIncludedIn(source.id, updatedTriggers)) continue;

            const trigger = this.application.createTrigger(source, { locked: false });

            if (trigger) {
                this.#triggers.set(trigger.fullId, trigger);
            }
        }

        // we never have to re-instantiate module triggers
        if (isFirstReset) {
            for (const source of this.application.moduleSources) {
                if (!R.isObjectType(source) || !R.isString(source.id)) continue;

                const trigger = this.application.createTrigger(source, { locked: true });

                if (trigger) {
                    this.#triggers.set(trigger.fullId, trigger);
                }
            }
        }

        const endTime = performance.now();
        MODULE.debug("Blueprint triggers (ms)", endTime - startTime);
    }

    toggleLocked(locked: boolean) {
        this.stage.eventMode = locked ? "none" : "static";
        this.parent.toggleUIEnabled(locked);
    }

    resizeAll(): void {
        this.resize();

        const scale = this.scale;
        const width = this.screen.width / scale;
        const height = this.screen.height / scale;

        this.#hitArea.height = height;
        this.#hitArea.width = width;

        this.#gridLayer.height = height;
        this.#gridLayer.width = width;

        const heightRatio = Math.min(this.parent.application.background.heightRatio ?? 1, 1);
        const bgTexture = this.#background.texture;
        const bgWidthScale = (this.screen.width - this.parent.sidebarWidth) / scale / bgTexture.width;
        const bgHeightScale = (height / bgTexture.height) * heightRatio;
        const bgScale = bgTexture.width * bgHeightScale > bgTexture.width * bgWidthScale ? bgWidthScale : bgHeightScale;

        this.#background.scale.set(bgScale);
        this.#background.position.set(width - this.#background.width, height - this.#background.height);
    }

    setPosition(x: number, y: number) {
        this.#layers.position.set(x, y);
        this.#gridLayer.tilePosition.set(x, y);
    }

    moveToNode(nodeId: string, select: boolean) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        const nodePosition = node.position;
        const layerPosition = this.#layers.position;
        const targetPosition = subtractPoint({ x: 600, y: 350 }, nodePosition);
        const distance = distanceToPoint(layerPosition, targetPosition);
        const tilePosition = this.#gridLayer.tilePosition;

        foundry.canvas.animation.CanvasAnimation.animate(
            [
                {
                    parent: layerPosition,
                    attribute: "x",
                    to: targetPosition.x,
                },
                {
                    parent: layerPosition,
                    attribute: "y",
                    to: targetPosition.y,
                },
                {
                    parent: tilePosition,
                    attribute: "x",
                    to: targetPosition.x,
                },
                {
                    parent: tilePosition,
                    attribute: "y",
                    to: targetPosition.y,
                },
                {
                    parent: this,
                    attribute: "scale",
                    to: 1,
                },
            ],
            { duration: Math.min(distance / 4, 500) },
        );

        if (select) {
            node.selectOnly();
        }
    }

    addTrigger(source: TriggerDataInput, setEnabled: boolean, setTrigger: boolean) {
        if (this.application.events.size === 1 && !source.nodes?.length) {
            const event = this.application.events.contents[0];

            source.nodes = [
                {
                    id: foundry.utils.randomID(),
                    position: { x: 400, y: 200 },
                    type: event.type,
                },
            ];
        }

        const trigger = this.application.createTrigger(source, {});
        if (!trigger) return;

        this.triggers.set(trigger.fullId, trigger);

        if (setEnabled) {
            this.enableTrigger(trigger, true);
        } else {
            trigger.setUpdated();
        }

        if (setTrigger) {
            this.trigger = trigger;
        } else {
            this.parent.render();
        }
    }

    async deleteTrigger(fullId: TriggerFullId) {
        const confirm = await confirmDialog("blueprint.trigger.delete");
        if (!confirm) return;

        this.triggers.delete(fullId);

        this.#hasDeletedTriggers = true;
        this.parent.render();
    }

    async saveTriggers(): Promise<void> {
        if (!this.application.isSettingApplication) return;

        const [invalids, valids] = R.partition(this.triggers.contents, (trigger) => trigger.invalid);
        const [locked, triggers] = R.partition(valids, (trigger) => trigger.locked);
        const sources = R.map([...triggers, ...invalids], (trigger) => trigger.toObject());
        const triggersIds = R.map(triggers, (trigger) => trigger.id);
        const lockedIds = R.map(locked, (trigger) => trigger.id);

        const disabled = [...this.#disabledIds].filter((id) => R.isIncludedIn(id, triggersIds));
        const enabled = [...this.#enabledIds].filter((id) => R.isIncludedIn(id, lockedIds));
        const folders = R.pick(this.#modulesFolders, lockedIds) as Record<string, string>;

        this.#hasDeletedTriggers = false;
        for (const trigger of valids) {
            trigger.setUpdated(false);
        }

        const setting: TriggersSetting = {
            disabled,
            enabled,
            folders,
            sources: purgeObject(sources),
        };

        const customSetter = this.application.customSettingsSetter;

        if (customSetter) {
            await customSetter(setting, () => {
                this.application.prepare();
            });
        } else {
            await game.settings.set(this.application.moduleId, this.application.settingKey, setting);
        }

        localize.info("save-triggers.saved");
        this.parent.render();
    }

    isEnabled({ id, locked }: MaybeTrigger): boolean {
        return locked ? this.#enabledIds.has(id) : !this.#disabledIds.has(id);
    }

    enableTrigger(trigger: OpenTrigger | OpenTrigger[], enabled: boolean) {
        const triggers = R.isArray(trigger) ? trigger : [trigger];

        for (const trigger of triggers) {
            if (enabled) {
                if (trigger.locked) {
                    this.#enabledIds.add(trigger.id);
                } else {
                    this.#disabledIds.delete(trigger.id);
                }
            } else {
                if (trigger.locked) {
                    this.#enabledIds.delete(trigger.id);
                } else {
                    this.#disabledIds.add(trigger.id);
                }
            }

            trigger.setUpdated();
        }
    }

    getFolder({ folder, id, locked }: MaybeTrigger): string {
        return (locked ? (this.#modulesFolders[id] ?? folder) : folder) ?? "";
    }

    setFolder({ id, locked }: MaybeTrigger, folder: string) {
        if (!locked) return;

        this.#modulesFolders[id] = folder;
        this.parent.render();
    }

    resetFolder({ id, locked }: MaybeTrigger) {
        if (!locked) return;

        delete this.#modulesFolders[id];
        this.parent.render();
    }

    async editVariable(id: ConnectionId) {
        const trigger = this.trigger;
        if (!trigger) return;

        const current = trigger.data.variables[id]?.label;
        if (current === undefined) return;

        const label = await editLabelDialog("variable", { placeholder: current, value: current });
        if (!label) return;

        trigger.update({
            variables: {
                [id]: { label },
            },
        });

        const [nodeId] = splitEntryId(id);
        if (nodeId) {
            trigger.refreshNode(nodeId);
        }

        const variables = this.nodes.getVariables(id);
        for (const node of variables) {
            trigger.refreshNode(node.id);
        }

        this.draw({ renderApplication: true });
    }

    deleteVariable(id: ConnectionId, redraw: boolean = true) {
        const trigger = this.trigger;
        if (!trigger?.data.variables[id]) return;

        trigger?.update({
            variables: {
                [id]: undefined,
            },
        });

        const nodes = this.nodes.getVariables(id);
        this.nodes.delete(nodes, redraw);
    }

    getTrigger(fullId: TriggerFullId): OpenTrigger | null {
        return this.triggers.get(fullId) ?? null;
    }

    cancelMouse() {
        this.#mouseManager.cancel();
    }

    unscalePoint(point: Point): Point {
        return dividePointBy(point, this.scale);
    }

    subtractPointFromEvent(event: PIXI.FederatedPointerEvent, point: Point): Point {
        return subtractPoint(this.unscalePoint(event.global), point);
    }

    getGlobalBounds(element: PIXI.Container): PIXI.Rectangle {
        const scale = this.stage.scale;
        const position = element.getGlobalPosition();
        const viewBounds = this.view.getBoundingClientRect();

        const x = position.x + viewBounds.x;
        const y = position.y + viewBounds.y;
        const width = element.width * scale.x;
        const height = element.height * scale.y;

        return new PIXI.Rectangle(x, y, width, height);
    }

    async openNodesMenu(event: PIXI.FederatedPointerEvent, entry?: BaseBlueprintEntry): Promise<boolean | undefined> {
        if (this.locked) return;

        // we need to calculate it now as FederatedEvent will be reused
        const position = this.subtractPointFromEvent(event, this.#layers);

        this.toggleLocked(true);
        const result = await BlueprintNodesMenu.wait(this, position, entry);
        this.toggleLocked(false);

        if (result) {
            this.parent.render();
        }

        return !!result;
    }

    addTooltip(target: PIXI.Container, tooltipFn: () => string | undefined, direction: TooltipDirection) {
        target.eventMode = "static";
        target.hitArea = new PIXI.Rectangle(0, 0, target.width, target.height);

        target.on("pointerenter", (event) => {
            event.stopPropagation();

            const tooltip = tooltipFn();
            if (!tooltip) return;

            const offset = 5 * this.scale;
            const { left, top, width, height } = this.getGlobalBounds(target);
            const anchor = createHTMLElement("div", {
                id: "trigger-engine-field-tooltip",
                style: {
                    left: `${left - offset}px`,
                    top: `${top}px`,
                    width: `${width + offset * 2}px`,
                    height: `${height}px`,
                },
            });

            document.body.appendChild(anchor);

            game.tooltip.activate(anchor, {
                cssClass: "trigger-engine-field-tooltip",
                direction,
                html: tooltip,
            });
        });

        target.on("pointerleave", (event) => {
            event.stopPropagation();
            game.tooltip.deactivate();
            document.getElementById("trigger-engine-field-tooltip")?.remove();
        });
    }

    draw({
        forceComputeConnections,
        renderApplication,
        selectNodes,
    }: {
        forceComputeConnections?: boolean;
        renderApplication?: boolean;
        selectNodes?: string[];
    } = {}) {
        selectNodes ??= this.nodes.selected.map((node) => node.id);

        this.#clear();

        const trigger = this.trigger;

        if (!trigger) {
            if (renderApplication) {
                this.parent.render();
            }
            return;
        }

        trigger.computeConnections(forceComputeConnections);

        for (const node of trigger.nodes) {
            this.nodes.add(node, false);
        }

        for (const twoWays of trigger.linkedConnections) {
            const [originId, targetId] = splitTwoWays(twoWays);
            const origin = this.nodes.getEntryFromId(originId);
            const target = this.nodes.getEntryFromId(targetId);

            if (origin && target) {
                this.connections.add(origin.id, target.id);
            }
        }

        this.stage.on("wheel", this.#onWheel, this);

        if (selectNodes.length) {
            this.nodes.selectNodes(selectNodes);
        }

        if (renderApplication) {
            this.parent.render();
        }
    }

    _onUnclickLeft() {
        this.nodes.clearSelected();
        this.#destroySelection();
    }

    _onUnclickRight(event: FederatedEvent) {
        this.openNodesMenu(event);
        this.#destroySelection();
    }

    #selection: PIXI.Graphics | null = null;

    _onDragLeftStart(event: FederatedEvent) {
        this.nodes.clearSelected();
        this.#selection?.destroy();

        const interactionData = event.interactionData as InteractionData;

        this.nodes.interactiveChildren = false;

        interactionData.layerOrigin = this.subtractPointFromEvent(event, this.#layers);
        this.#selection = this.#layers.addChild(new PIXI.Graphics());
    }

    _onDragLeftMove(event: FederatedEvent) {
        const selection = this.#selection as PIXI.Graphics;
        const layerOrigin = event.interactionData.layerOrigin as Point;
        const target = this.subtractPointFromEvent(event, this.#layers);

        const width = Math.abs(target.x - layerOrigin.x);
        const height = Math.abs(target.y - layerOrigin.y);
        selection.x = Math.min(layerOrigin.x, target.x);
        selection.y = Math.min(layerOrigin.y, target.y);

        selection.clear();
        selection.lineStyle(2, BlueprintNode.SELECTED_COLOR, 0.9);
        selection.drawRect(0, 0, width, height);
    }

    _onDragLeftDrop(_event: FederatedEvent) {
        const selection = this.#selection;
        if (!selection) return;

        this.nodes.selectIntersecting(selection);
        this.nodes.interactiveChildren = true;
        this.#layers.removeChild(selection);
    }

    _onDragRightStart(event: FederatedEvent) {
        const interactionData = event.interactionData as InteractionData;
        interactionData.layerOrigin = this.subtractPointFromEvent(event, this.#layers);
    }

    _onDragRightMove(event: FederatedEvent) {
        const layerOrigin = event.interactionData.layerOrigin as Point;
        const { x, y } = this.subtractPointFromEvent(event, layerOrigin);

        this.setPosition(x, y);
    }

    #clear() {
        this.#destroySelection();
        this.#layers.clear();
        this.stage.off("wheel", this.#onWheel, this);
    }

    #onWheel(event: PIXI.FederatedWheelEvent) {
        if (this.#mouseManager.state > this.#mouseManager.states.HOVER) return;

        const mult = event.deltaY < 0 ? 1 : -1;
        this.scale = this.stage.scale.x + 0.1 * mult;
    }

    #destroySelection() {
        if (!this.#selection) return;
        this.#selection.destroy();
        this.#selection = null;
    }
}

type FederatedEvent = PIXI.FederatedPointerEvent & {
    interactionData: Record<string, any>;
};

type InteractionData = {
    layerOrigin: Point;
};

type MaybeTrigger = { folder: string | undefined; id: string; locked?: boolean };

export { Blueprint };
export type { MaybeTrigger };
