import { IconObject, zIconObj } from "_zod";
import {
    BaseCustomData,
    BaseCustomEntryDataSource,
    BaseCustomEntrySchema,
    BaseCustomSchema,
    CONSOLE_LOG,
    ConnectionId,
    ENTRY_GATE_TYPE,
    EXIT_GATE_TYPE,
    EntryCategory,
    EntryId,
    GATE_CATEGORY,
    NodeData,
    NodeDataInput,
    NodeDataOutput,
    OpenNodeEntry,
    OpenTrigger,
    OpenTriggerNode,
    PreciseEntryCategory,
    RETURN_GATE_TYPE,
    TriggerNode,
    VARIABLE_CATEGORY,
    isConnectionId,
    isOppositeConnection,
    isVariableGetterNode,
    zCustomInputData,
    zCustomInputSchema,
    zCustomOutData,
    zCustomOutSchema,
    zCustomOutputData,
    zCustomOutputSchema,
} from "engine";
import {
    ContextMenuEntry,
    LocalizeArgs,
    MouseInteractionManager,
    R,
    addListener,
    addPoints,
    confirmDialog,
    createHTMLElement,
    drawRectangleMask,
    htmlQuery,
    localize,
    subtractPoint,
    waitDialog,
} from "foundry-helpers";
import {
    BaseBlueprintEntry,
    BlueprintBridgeEntry,
    BlueprintEntry,
    BlueprintNodesLayer,
    NodeHeaderSource,
    NodePart,
    alignHorizontally,
    getBottom,
    getRight,
    maxBottom,
    maxRight,
    zNodeHeaderBackground,
    zNodeHeaderData,
} from ".";
import { Blueprint, editLabelDialog } from "..";

class BlueprintNode extends PIXI.Container {
    #border?: PIXI.Graphics;
    #calculatedheight: number = 0;
    #calculatedWith: number = 0;
    #entries: BaseBlueprintEntry[] = [];
    #hitArea: PIXI.Rectangle = new PIXI.Rectangle();
    #in: BlueprintBridgeEntry | undefined;
    #initialized: boolean = false;
    #inputs: Collection<string, BlueprintEntry> = new Collection();
    #mouseManager?: MouseInteractionManager;
    #node: OpenTriggerNode;
    #outputs: Collection<string, BlueprintEntry> = new Collection();
    #outs: Collection<string, BlueprintBridgeEntry> = new Collection();
    #selected: boolean = false;

    static SELECTED_COLOR: ColorSource = 0xff9829;

    static customCategoryParsers = {
        outs: ["defineCustomOuts", zCustomOutSchema],
        inputs: ["defineCustomInputs", zCustomInputSchema],
        outputs: ["defineCustomOutputs", zCustomOutputSchema],
    } as const;

    constructor(node: OpenTriggerNode) {
        super();

        this.#node = node;
    }

    get category(): string {
        return this.#node.category;
    }

    get type(): string {
        return this.#node.type;
    }

    get ins(): Collection<string, BaseBlueprintEntry> {
        return new Collection(this.#in ? [["in", this.#in]] : undefined);
    }

    get outs(): Collection<string, BaseBlueprintEntry> {
        return this.#outs;
    }

    get inputs(): Collection<string, BlueprintEntry> {
        return this.#inputs;
    }

    get outputs(): Collection<string, BlueprintEntry> {
        return this.#outputs;
    }

    get blueprint(): Blueprint {
        return this.parent.blueprint;
    }

    get stage(): PIXI.Container {
        return this.blueprint.stage;
    }

    get trigger(): OpenTrigger {
        return this.#node.parent;
    }

    get id(): string {
        return this.#node.id;
    }

    get gateId(): string | undefined {
        return this.isExitGate ? this.#node.id : this.#node.exitGate?.id;
    }

    get exitGate(): BlueprintNode | undefined {
        return this.#node.exitGate ? this.parent.get(this.#node.exitGate.id) : undefined;
    }

    get variableId(): ConnectionId | undefined {
        return isVariableGetterNode(this) ? this.#node.data.inputs.entry?.connection : undefined;
    }

    get icon(): string | undefined {
        return zIconObj.safeParse(this.#node.icon)?.data?.unicode;
    }

    get isEvent(): boolean {
        return this.#node.isEvent;
    }

    get isGate(): boolean {
        return this.category === GATE_CATEGORY;
    }

    get isEntryGate(): boolean {
        return this.type === ENTRY_GATE_TYPE;
    }

    get isExitGate(): boolean {
        return this.type === EXIT_GATE_TYPE;
    }

    get isReturnGate(): boolean {
        return this.type === RETURN_GATE_TYPE;
    }

    get isVariable(): boolean {
        return this.category === VARIABLE_CATEGORY;
    }

    get isCustom(): boolean {
        return (["defineCustomInputs", "defineCustomOutputs", "defineCustomOuts"] as const).some((category) => {
            return (this.#node.constructor as typeof TriggerNode)[category]?.some((entry) => !!entry.slug);
        });
    }

    get canBreak(): boolean {
        return this.#node.canBreak;
    }

    get canStop(): boolean {
        return this.#node.canStop;
    }

    get isEmit(): boolean {
        return this.#node.isEmit;
    }

    get isLoop(): boolean {
        return this.#node.isLoop;
    }

    get hasMultipleStates() {
        return !!this.#node.states?.length;
    }

    get isDuplicable(): boolean {
        return !this.isEvent && !this.isGate && !this.isVariable;
    }

    get title(): string | null {
        return this.#node.exitGate?.data.custom.title ?? this.#node.data.custom.title ?? this.#node.title;
    }

    get label(): string {
        return this.title ?? this.#node.id;
    }

    get inputsHaveConnector(): boolean {
        return (this.#node.constructor as typeof TriggerNode).inputsHaveConnector;
    }

    get inputsHaveField(): boolean {
        return (this.#node.constructor as typeof TriggerNode).inputsHaveField;
    }

    get fontSize(): number {
        return 15;
    }

    get entryHeight(): number {
        return this.fontSize * 1.5;
    }

    get rowSpacing(): number {
        return 2;
    }

    get outerPadding(): Point {
        return { x: 8, y: 4 };
    }

    get opacity(): number {
        return 0.6;
    }

    get backgroundColor(): ColorSource {
        return 0x000000;
    }

    get connectorWidth(): number {
        return 16;
    }

    get connectorSpacing(): number {
        return 6;
    }

    get borderRadius(): number {
        return 10;
    }

    get borderOptions(): ILineStyleOptions {
        return {
            color: 0x000000,
            width: 1,
            alpha: 0.6,
        };
    }

    get selectedBorderOptions(): ILineStyleOptions {
        return {
            color: BlueprintNode.SELECTED_COLOR,
            width: 2,
            alpha: 0.6,
        };
    }

    get minWidth(): number {
        return 100;
    }

    get minWidthHeader(): number {
        return 200;
    }

    get maxWidth(): number {
        return Infinity;
    }

    get width(): number {
        return this.#calculatedWith || super.width;
    }

    get height(): number {
        return this.#calculatedheight || super.height;
    }

    get isLocked(): boolean {
        return this.blueprint.locked;
    }

    get selected(): boolean {
        return this.#selected;
    }

    set selected(value) {
        if (this.selected === value) return;

        this.#selected = value;
        this.#drawBorder();
    }

    get entries(): BaseBlueprintEntry[] {
        return this.#entries;
    }

    initialize() {
        if (this.#initialized) return;

        this.#initialized = true;

        const handlers: ConstructorParameters<typeof MouseInteractionManager>[3] = {
            clickLeft: this._onClickLeft.bind(this),
            clickRight: this._onClickRight.bind(this),
            unclickLeft: this._onUnclickLeft.bind(this),
            unclickRight: this._onUnclickRight.bind(this),
            dragLeftStart: this._onDragLeftStart.bind(this),
            dragLeftMove: this._onDragLeftMove.bind(this),
            dragLeftDrop: this._onDragLeftDrop.bind(this),
            dragRightStart: this._onDragRightStart.bind(this),
            dragRightMove: this._onDragRightMove.bind(this),
            dragRightDrop: this._onDragRightDrop.bind(this),
        };

        const permissions: ConstructorParameters<typeof MouseInteractionManager>[2] = R.fromKeys(
            ["dragLeftStart", "dragLeftMove", "dragLeftDrop"] as const,
            () => !this.isLocked,
        );

        this.#mouseManager = new foundry.canvas.interaction.MouseInteractionManager(
            this,
            this.stage,
            permissions,
            handlers,
            { application: this.blueprint },
        );

        this.#mouseManager.activate();
    }

    bringToTop() {
        const highest = R.firstBy(this.parent.children, [R.prop("zIndex"), "desc"])?.zIndex ?? 0;
        this.zIndex = highest + 1;
        this.parent.sortChildren();
    }

    clear() {
        this.#in = undefined;
        this.#entries = [];
        this.#outs.clear();
        this.#inputs.clear();
        this.#outputs.clear();

        const removed = this.removeChildren();

        for (let i = 0; i < removed.length; ++i) {
            removed[i].destroy();
        }
    }

    draw() {
        this.clear();

        const header = this.#drawHeader();
        const body = this.#drawBody();

        const height = body.calculatedHeight + (header?.calculatedHeight ?? 0);
        const width = Math.min(
            Math.max(header?.calculatedWith ?? 0, body.calculatedWith, header ? this.minWidthHeader : this.minWidth),
            this.maxWidth,
        );

        this.#calculatedWith = width;
        this.#calculatedheight = height;

        // background
        const background = new PIXI.Graphics();
        const backgroundMask = drawRectangleMask(0, 0, width, height, this.borderRadius);

        background.mask = backgroundMask;
        background.addChild(backgroundMask);

        this.addChild(background);

        // header
        if (header) {
            background.beginFill(header.background, this.opacity);
            background.drawRect(0, 0, width, header.calculatedHeight);
            background.endFill();

            this.addChild(header);

            body.y = header.calculatedHeight;

            const mask = drawRectangleMask(0, 0, width, header.calculatedHeight, this.borderRadius);

            header.mask = mask;
            header.addChild(mask);
        }

        // body
        const targetWidth = width - this.outerPadding.x * 2;
        for (const row of body.children as NodePart[]) {
            const output = R.last(row.children) as NodePart;

            // x is not 0 so it is indeed an output
            if (output.x !== 0) {
                output.x = targetWidth - output.width;
            }
        }

        background.beginFill(this.backgroundColor, this.opacity);
        background.drawRect(0, body.y, width, body.calculatedHeight);
        background.endFill();

        this.addChild(body);

        // border
        this.addChild((this.#border = new PIXI.Graphics()));
        this.#drawBorder();

        // special icons
        const specials = this.#drawSpecialIcons();

        if (specials) {
            specials.x = width - specials.width + specials.children[0].width * 0.3;
        }

        // set position
        const { x, y } = this.#node.data.position;
        this.position.set(x, y);

        // set hit area
        this.#hitArea.width = width;
        this.#hitArea.height = height;
    }

    localize(...args: LocalizeArgs): string | undefined {
        return this.#node.localize(...args);
    }

    rootLocalize(...args: LocalizeArgs): string | undefined {
        return this.#node.rootLocalize(...args);
    }

    selectOnly() {
        this.bringToTop();
        this.parent.clearSelected();
        this.selected = true;
    }

    cancelMouse() {
        this.#mouseManager?.cancel();
    }

    update(changes: DeepPartial<NodeDataInput> & { [k: string]: any }): NodeData {
        this.trigger.setUpdated();
        return this.#node.data.update(changes);
    }

    setPosition(x: number, y: number) {
        this.position.set(x, y);
        this.update({ position: { x, y } });

        for (const entry of this.entries) {
            this.blueprint.connections.refreshConnection(entry);
        }
    }

    addConnection(category: PreciseEntryCategory, key: string, targetId: EntryId) {
        if (!isOppositeConnection(category) || !isConnectionId(targetId)) return;

        this.update({
            [category]: {
                [key]: {
                    connection: targetId,
                    value: undefined,
                },
            },
        });
    }

    removeConnection(category: PreciseEntryCategory, key: string, targetId: EntryId) {
        if (!isOppositeConnection(category) || !isConnectionId(targetId)) return;

        this.update({
            [category]: {
                [key]: undefined,
            },
        });
    }

    async edit() {
        const label = await editLabelDialog("gate", { value: this.#node.data.custom.title });
        if (!label) return;

        this.update({
            custom: {
                title: label,
            },
        });

        this.refresh({ renderApplication: true });
    }

    _onClickLeft(event: FederatedEvent) {
        this.blueprint.cancelMouse();

        if (event.shiftKey) {
            this.selected = !this.selected;
        } else if (!this.selected) {
            this.selectOnly();
        }
    }

    _onClickRight() {
        this.blueprint.cancelMouse();
    }

    _onUnclickLeft(event: FederatedEvent) {
        this.blueprint.cancelMouse();

        if (!event.shiftKey) {
            this.selectOnly();
        }
    }

    _onUnclickRight(event: FederatedEvent) {
        this.blueprint.cancelMouse();

        this.bringToTop();

        if (!this.selected) {
            this.selectOnly();
        }

        this.#onNodeContextMenu(event);
    }

    _onDragLeftStart(event: FederatedEvent) {
        this.blueprint.cancelMouse();
        if (event.shiftKey) return;

        this.parent.interactiveChildren = false;

        const selected = this.parent.selected;
        const interactionData = event.interactionData as InteractionData;
        // we offset the distance buffer of the drag
        const offset = this.blueprint.subtractPointFromEvent(event, interactionData.origin);

        interactionData.selected = R.map(selected.length ? selected : [this], (node) => {
            return {
                node,
                origin: subtractPoint(this.blueprint.subtractPointFromEvent(event, node), offset),
            };
        });
    }

    _onDragLeftMove(event: FederatedEvent) {
        this.blueprint.cancelMouse();

        const { selected } = event.interactionData as InteractionData;
        if (!selected?.length) return;

        for (const { node, origin } of selected) {
            const { x, y } = this.blueprint.subtractPointFromEvent(event, origin);
            node.setPosition(x, y);
        }
    }

    _onDragLeftDrop() {
        this.blueprint.cancelMouse();
        this.parent.interactiveChildren = true;
    }

    _onDragRightStart(event: FederatedEvent) {
        this.blueprint._onDragRightStart(event);
    }

    _onDragRightMove(event: FederatedEvent) {
        this.blueprint._onDragRightMove(event);
    }

    _onDragRightDrop() {
        this.blueprint.cancelMouse();
    }

    fontAwesomeIcon(icon: IconObject): PreciseText;
    fontAwesomeIcon(icon: Maybe<IconObject>): PreciseText | undefined;
    fontAwesomeIcon(icon: Maybe<IconObject>) {
        if (!icon) return;

        return this.preciseText(icon.unicode, {
            fontFamily: "Font Awesome 7 Pro",
            fontWeight: icon.fontWeight || "400",
            fontMult: icon.fontMult || 1,
        });
    }

    preciseText(text: string, options?: PreciseTextOptions): PreciseText;
    preciseText(text: Maybe<string>, options?: PreciseTextOptions): PreciseText | undefined;
    preciseText(text: Maybe<string>, options?: PreciseTextOptions) {
        if (!R.isString(text)) return;
        const style = this.preciseTextStyle(options);
        return new foundry.canvas.containers.PreciseText(text, style);
    }

    preciseTextStyle(options: Exclude<PreciseTextOptions, PIXI.TextStyle> = {}): PIXI.TextStyle {
        if (R.isNumber(options.fontMult)) {
            options.fontSize = this.fontSize * options.fontMult;
        }

        delete options.fontMult;

        return new PIXI.TextStyle(
            foundry.utils.mergeObject(
                {
                    fontFamily: "Signika",
                    fontSize: this.fontSize,
                    fontStyle: "normal",
                    fontWeight: "normal",
                    fill: "#ffffff",
                    stroke: "#111111",
                    strokeThickness: 0,
                    dropShadow: true,
                    dropShadowColor: "#000000",
                    dropShadowBlur: 2,
                    dropShadowAngle: 0,
                    dropShadowDistance: 0,
                    wordWrap: false,
                    wordWrapWidth: 100,
                    lineJoin: "miter",
                },
                options,
            ),
        );
    }

    getCustomCategorySchemas(category: EntryCategory | "outs"): BaseCustomSchema[] {
        const [method, parser] = BlueprintNode.customCategoryParsers[category];
        return R.pipe(
            (this.#node.constructor as typeof TriggerNode)[method] ?? [],
            R.map((schema) => parser.safeParse(schema)?.data),
            R.filter(R.isTruthy),
        );
    }

    #drawBorder() {
        const border = this.#border;
        if (!border) return;

        border.clear();
        border.lineStyle(this.selected ? this.selectedBorderOptions : this.borderOptions);
        border.drawRoundedRect(0, 0, this.width, this.height, this.borderRadius);
    }

    #drawBody(): NodePart {
        const spacing = 20;
        const padding = this.outerPadding;
        const body = new PIXI.Container() as NodePart;
        const entries = this.#node.entries;

        const ins = Number(!!entries.in);

        const outs = this.isEntryGate // we don't want to display entry gates 'out'
            ? entries.outs.filter((x) => x.key !== "out")
            : this.isReturnGate // we don't want to display return gates outs
              ? []
              : entries.outs.contents;

        const [inputs, outputs] = R.pipe(
            ["inputs", "outputs"] as const,
            R.map((category) => {
                if (
                    category === "inputs" &&
                    // both getters & exit gates don't have inputs
                    (this.isExitGate || isVariableGetterNode(this.#node))
                ) {
                    return [];
                }

                const groups = R.pipe(
                    entries[category].contents,
                    R.groupBy((entry) => entry.schema.group ?? ""),
                    R.entries(),
                );

                const emptyGroup = groups.findSplice(([group]) => group === "");

                if (emptyGroup) {
                    groups.unshift(emptyGroup);
                }

                return groups;
            }),
        );

        const nbEntries = (section: [key: string, value: OpenNodeEntry[]][]): number => {
            return R.sum(
                section.map(([group, entries]) => {
                    return R.sumBy(entries, (entry) => 1 + entry.schema.spacing) + (group === "" ? 0 : 1);
                }),
            );
        };

        const nbRows = Math.max(nbEntries(inputs) + ins, nbEntries(outputs) + outs.length);
        const rows: NodePart[] = R.times(nbRows, () => new PIXI.Container() as NodePart);

        const addToRow = (rowIndex: number, column: 0 | 1, el: BaseBlueprintEntry | PIXI.Container) => {
            const row = rows[rowIndex];

            if ("draw" in el) {
                el.draw();
            }

            row.addChild(el);

            if (column === 0) {
                row.calculatedWith = getRight(el) + spacing;
            } else {
                el.x = row.calculatedWith || spacing;
                row.calculatedWith = getRight(el);
            }
        };

        const createGroup = (group: string): PIXI.Container => {
            const container = new PIXI.Container();
            const localized = this.localize("groups", group) ?? this.rootLocalize("group", group) ?? group;
            const label = this.preciseText(localized, { fill: "#a6a6a6", fontVariant: "small-caps" });

            const icon = new PIXI.Graphics();

            icon.beginFill("#7a7a7a");
            icon.lineStyle(1, "#7a7a7a");
            icon.drawCircle(this.connectorWidth / 2 - 1, 4, 4);
            icon.endFill();

            alignHorizontally(container, [icon, label], { height: this.entryHeight });

            label.x = this.connectorWidth + this.connectorSpacing;

            return container;
        };

        // we process all inputs first to make layout computation easier

        if (entries.in && !this.isExitGate) {
            this.#in = new BlueprintBridgeEntry(this, "inputs", entries.in);
            this.#entries.push(this.#in);

            addToRow(0, 0, this.#in);
        }

        let inputIndex = ins;
        for (const [group, entries] of inputs) {
            if (group) {
                const label = createGroup(group);
                addToRow(inputIndex++, 0, label);
            }

            for (const input of entries) {
                const entry = new BlueprintEntry(this, input);

                this.#inputs.set(entry.key, entry);
                this.#entries.push(entry);

                inputIndex += input.schema.spacing;
                addToRow(inputIndex++, 0, entry);
            }
        }

        // we process all outputs after that

        let outsIndex = 0;
        for (const out of outs) {
            const entry = new BlueprintBridgeEntry(this, "outputs", out);

            this.#outs.set(entry.key, entry);
            this.#entries.push(entry);

            outsIndex += out.spacing;
            addToRow(outsIndex++, 1, entry);
        }

        let outputIndex = outs.length;
        for (const [group, entries] of outputs) {
            if (group) {
                const label = createGroup(group);
                addToRow(outputIndex++, 0, label);
            }

            for (const output of entries) {
                const entry = new BlueprintEntry(this, output);

                this.#outputs.set(entry.key, entry);
                this.#entries.push(entry);

                outputIndex += output.schema.spacing;
                addToRow(outputIndex++, 1, entry);
            }
        }

        // return

        const rowHeight = this.entryHeight + this.rowSpacing;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            row.x = padding.x;
            row.y = padding.y + i * rowHeight;

            body.addChild(row);
        }

        body.calculatedWith = padding.x * 2 + Math.max(...rows.map((row) => row.calculatedWith));
        body.calculatedHeight = nbRows * rowHeight + padding.y * 2;

        return body;
    }

    #drawSpecialIcons(): PIXI.Container<PIXI.Graphics> | undefined {
        const headerColor = zNodeHeaderBackground.parse(this.#node.headerColor);

        const specials: { icon: IconObject; name?: string }[] = R.pipe(
            this.#node.specialIcons ?? [],
            R.map(({ icon, name }) => {
                const parsed = zIconObj.safeParse(icon)?.data;
                return parsed && { icon: parsed, name };
            }),
            R.filter(R.isTruthy),
        );

        const tooltip = this.#node.generateTooltip().trim();
        if (tooltip) {
            specials.unshift({
                icon: { unicode: "\uf129", fontWeight: "900", fontMult: 1.1 },
                name: tooltip,
            });
        }

        const builtinsSpecials: [boolean, string, IconObject | string][] = [
            [this.hasMultipleStates, "state", "\uf364"],
            [this.isCustom, "custom", "\uf013"],
            [this.isEmit, "emit", "\uf1eb"],
            [this.isLoop, "loop", "\uf0e2"],
            [this.canBreak, "break", "\uf256"],
            [this.canStop, "stop", "\uf127"],
        ] as const;

        for (const [condition, name, icon] of builtinsSpecials) {
            if (!condition) continue;
            specials.push({ icon: R.isString(icon) ? { unicode: icon } : icon, name });
        }

        if (!specials.length) return;

        const borderOptions = this.borderOptions;

        const elements = R.map(specials, ({ icon: { unicode, fontMult, fontWeight }, name }) => {
            const icon = this.fontAwesomeIcon({
                fontMult: (fontMult ?? 1) * 0.86,
                fontWeight: fontWeight ?? "900",
                unicode,
            });

            const width = 22;
            const height = 20;

            icon.x = (width - icon.width) / 2;
            icon.y = (height - icon.height) / 2;

            const helper = new PIXI.Graphics();

            helper.beginFill(headerColor, this.opacity);
            helper.lineStyle(borderOptions);
            helper.drawCircle(width / 2, height / 2, height * 0.5);
            helper.endFill();

            helper.addChild(icon);

            if (name) {
                this.blueprint.addTooltip(
                    helper,
                    () => this.localize("specials", name) ?? this.rootLocalize("special", name) ?? name,
                    "UP",
                );
            }

            return helper;
        });

        const wrapper = new PIXI.Container<PIXI.Graphics>();

        alignHorizontally(wrapper, elements, { spacing: 3 });

        wrapper.y = wrapper.height * -0.6;

        return this.addChild(wrapper);
    }

    #drawHeader(): NodeheaderPart | undefined {
        const title = this.title;
        if (!R.isString(title)) return;

        const headerSource: NodeHeaderSource = {
            background: this.#node.headerColor ?? undefined,
            icon: this.#node.icon,
            subtitle: this.#node.subtitle,
            title,
        };

        const { data } = zNodeHeaderData.safeParse(headerSource);
        if (!data) return;

        const padding = this.outerPadding;
        const headerEl = new PIXI.Container() as NodeheaderPart;
        const titleEl = this.preciseText(data.title);
        const subtitleEl = this.preciseText(data.subtitle, {
            fontMult: 0.93,
            fontStyle: "italic",
            fill: "d9d9d9",
        });
        const iconEl = R.isObjectType(data.icon)
            ? this.fontAwesomeIcon(data.icon)
            : R.isString(data.icon)
              ? PIXI.Sprite.from(data.icon)
              : undefined;

        const iconIsImage = !!iconEl && !(iconEl instanceof foundry.canvas.containers.PreciseText);

        if (iconIsImage) {
            iconEl.width = titleEl.height + padding.y * 2;
            iconEl.height = iconEl.width;
        }

        alignHorizontally(headerEl, [iconEl, titleEl], {
            offset: iconIsImage ? new PIXI.Point(0.5, 0.5) : padding,
            spacing: 5,
        });

        if (subtitleEl) {
            subtitleEl.x = titleEl.x + (iconEl ? 0 : 2);
            subtitleEl.y = getBottom(titleEl);

            headerEl.addChild(subtitleEl);
        }

        titleEl.getBounds();

        headerEl.background = new PIXI.Color(data.background ?? this.backgroundColor);
        headerEl.calculatedHeight = maxBottom(titleEl, subtitleEl) + padding.y;
        headerEl.calculatedWith = maxRight(titleEl, subtitleEl) + padding.x;

        return headerEl;
    }

    async createContextMenu(event: PIXI.FederatedPointerEvent, entries: ContextMenuEntry[]) {
        if (!entries.length) return;

        const anchor = createHTMLElement("div", {
            id: "trigger-engine-context-menu",
            style: {
                left: `${event.globalX}px`,
                top: `${event.globalY}px`,
                position: "absolute",
                zIndex: "100",
            },
        });

        document.body.appendChild(anchor);

        const menu = new foundry.applications.ux.ContextMenu.implementation(anchor, "", entries, {
            fixed: true,
            jQuery: false,
            onClose: () => {
                anchor.remove();
            },
        });

        await menu.render(anchor, {
            event: new PointerEvent("contextmenu", {
                clientX: event.globalX - 20,
                clientY: event.globalY - 10,
            }),
        });

        menu.element.addEventListener("pointerleave", () => {
            menu.close();
        });
    }

    refresh({
        forceComputeConnections,
        renderApplication,
        selectNodes,
    }: {
        forceComputeConnections?: boolean;
        renderApplication?: boolean;
        selectNodes?: string[];
    } = {}) {
        this.trigger.refreshNode(this.id);

        // we need to refresh all the entry-gates as well
        if (this.isExitGate) {
            for (const node of this.parent.getGateEntries(this.id)) {
                this.trigger.refreshNode(node.id);
            }
        }

        this.blueprint.draw({
            forceComputeConnections,
            renderApplication,
            selectNodes: selectNodes ?? [this.id],
        });
    }

    customEntryLocalize(
        label: string | undefined,
        category: EntryCategory | "outs",
        schema: BaseCustomSchema,
        ...path: string[]
    ): string | undefined {
        return label ? game.i18n.localize(label) : this.localize("customs", category, schema.slug, ...path);
    }

    customEntryLabel(category: EntryCategory | "outs", schema: BaseCustomSchema): string {
        return (
            this.customEntryLocalize(schema.label, category, schema, "label") ??
            this.rootLocalize("custom", schema.slug, "label") ??
            localize.ifExist("node", schema.slug) ??
            schema.slug
        );
    }

    customEntryInputLabel(category: EntryCategory | "outs", schema: BaseCustomSchema) {
        return (
            this.customEntryLocalize(schema.input?.label, category, schema, "input.label") ??
            localize("edit-entry.input")
        );
    }

    toObject(): NodeDataOutput {
        return this.#node.data.toObject();
    }

    #switchState(state: string) {
        const currentState = this.#node.state;

        // we delete the variables
        const outputs = this.outputs.filter((entry) => entry.schema.state === currentState);
        for (const entry of outputs) {
            this.blueprint.deleteVariable(entry.id as ConnectionId, false);
        }

        // we clear the inputs & outs from previous state
        const [inputs, outs] = [this.inputs, this.outs].map((entries) => {
            return R.pipe(
                entries.contents,
                R.filter((entry) => entry.schema.state === currentState),
                R.map((entry) => entry.key),
                R.fromKeys(() => {
                    return { connection: undefined, value: undefined };
                }),
            );
        });

        this.update({ inputs, outs, state });

        this.refresh({
            forceComputeConnections: true,
            renderApplication: true,
        });
    }

    validateCustomEntryInput(
        input: CustomEntryDialogData["input"],
        schema: BaseCustomSchema,
        result: EditEntryData,
    ): boolean {
        if (input && schema.input?.validation) {
            const regex = new RegExp(schema.input.validation);

            if (!regex.test(result.input ?? "")) {
                localize.warning("edit-entry.validation", { name: input.label, pattern: schema.input.validation });
                return false;
            }
        }
        return true;
    }

    async #addCustomEntry(category: EntryCategory | "outs", schema: BaseCustomSchema) {
        const title = this.customEntryLabel(category, schema);
        const replaceLabel = !!schema.input?.replaceLabel;
        const label: CustomEntryDialogData["label"] = !replaceLabel && {
            value: "",
            placeholder: "",
        };

        const input: CustomEntryDialogData["input"] = schema.input && {
            label: this.customEntryInputLabel(category, schema),
            placeholder: this.customEntryLocalize(schema.input.placeholder, category, schema, "input.placeholder"),
            type: schema.input.isNumber ? "number" : "text",
            value: schema.input.isNumber ? 0 : "",
        };

        const dialogData: CustomEntryDialogData = {
            input,
            label,
            type: undefined,
        };

        if (category !== "outs") {
            const availableTypes = this.trigger.application.availableEntryTypes;

            const selectedTypes = (schema as BaseCustomEntrySchema).types?.filter((type) =>
                R.isIncludedIn(type, availableTypes),
            );

            dialogData.array = (schema as BaseCustomEntrySchema).array ? { value: false } : undefined;

            dialogData.types = R.pipe(
                selectedTypes?.length ? selectedTypes : availableTypes,
                R.map((type) => {
                    return {
                        value: type,
                        label: this.rootLocalize("entry", type, "title") ?? type,
                    };
                }),
                R.sortBy(R.prop("label")),
            );

            if (dialogData.label) {
                dialogData.label.placeholder = dialogData.types[0].label;
            }
        }

        const result = await waitDialog<EditEntryData>({
            content: "edit-entry",
            data: dialogData,
            i18n: "edit-entry",
            onRender: (_, dialog) => {
                const html = dialog.element;
                const labelInput = htmlQuery<HTMLInputElement>(html, `[name="label"]`);
                if (!labelInput) return;

                addListener(html, `[name="type"]`, "change", (el: HTMLSelectElement) => {
                    labelInput.placeholder = el.selectedOptions[0].innerText;
                });
            },
            title: localize("blueprint.entry.add.title", { label: title }),
            yes: {
                label: localize("edit-entry.yes.add"),
            },
        });

        if (!result || !this.validateCustomEntryInput(input, schema, result)) return;

        if ((input?.type === "text" && !result.input) || (input?.type === "number" && !R.isNumber(result.input))) {
            localize.warning("edit-entry.required", { name: input.label });
            return;
        }

        if (!dialogData.types?.length && !result.label && !schema.input) {
            localize.warning("edit-entry.required", { name: localize("edit-entry.label") });
            return;
        }

        const entrySchema: BaseCustomData = {
            input: result.input,
            label: result.label ?? "",
            slug: schema.slug,
        };

        if (!entrySchema.label && dialogData.types?.length) {
            entrySchema.label = dialogData.types.find((type) => type.value === result.type)?.label ?? "";
        }

        if ((replaceLabel || !entrySchema.label) && schema.input) {
            entrySchema.label = String(result.input);
        }

        if (result.type) {
            foundry.utils.mergeObject(entrySchema, {
                type: result.type,
                isArray: result.array,
            } satisfies Omit<BaseCustomEntryDataSource, keyof BaseCustomData>);
        }

        const parser =
            category === "inputs" ? zCustomInputData : category === "outputs" ? zCustomOutputData : zCustomOutData;

        const entry = parser.safeParse(entrySchema)?.data;
        if (!entry) return;

        // if we are a return gate, we actually update the exit gate
        const updater = (this.isReturnGate && this.exitGate) || this;

        updater.update({
            custom: {
                [category]: {
                    [entry.id]: entry,
                },
            },
        });

        updater.refresh({ selectNodes: [this.id] });
    }

    async #onNodeContextMenu(event: PIXI.FederatedPointerEvent) {
        const locked = this.isLocked;
        const selected = this.parent.selected;
        const entries: ContextMenuEntry[] = [];

        // states
        if (!locked && this.#node.states && this.#node.state) {
            entries.push(
                ...R.pipe(
                    this.#node.states,
                    R.filter((state) => state !== this.#node.state),
                    R.map((state) => {
                        const label =
                            this.#node.localize("states", state) ??
                            this.#node.rootLocalize("state", state) ??
                            this.#node.rootLocalize("entry", state, "title") ??
                            state;

                        return {
                            label: localize("blueprint.node.state.title", { label }),
                            icon: `<i class="fa-sharp fa-solid fa-arrows-repeat"></i>`,
                            onClick: async () => {
                                const confirm = await confirmDialog("blueprint.node.state", {
                                    data: { label },
                                });
                                return confirm && this.#switchState(state);
                            },
                        };
                    }),
                ),
            );
        }

        const isExitGate = this.isExitGate;

        // custom entries
        if (!locked && !this.isEntryGate) {
            for (const category of R.keys(BlueprintNode.customCategoryParsers)) {
                // we shouldn't display exit gate custom inputs as they are used on the return gate
                if (isExitGate && category !== "outputs") continue;

                const schemas = this.getCustomCategorySchemas(category);

                for (const schema of schemas) {
                    const label = this.customEntryLabel(category, schema);

                    entries.push({
                        label: localize("blueprint.entry.add.title", { label }),
                        icon: `<i class="fa-solid fa-gear"></i>`,
                        onClick: async () => {
                            this.#addCustomEntry(category, schema);
                        },
                    });
                }
            }
        }

        const duplicable = this.isDuplicable;
        const filtered = selected.filter((node) => node.isDuplicable);
        const multiFiltered = filtered.length > 1 ? "multi" : "single";
        const multiSelected = selected.length > 1 ? "multi" : "single";

        entries.push(
            {
                label: localize.path(`blueprint.node.copy.${multiFiltered}`),
                icon: `<i class="fa-solid fa-clipboard"></i>`,
                visible: duplicable,
                onClick: async () => {
                    this.parent.copySelected(selected);
                },
            },
            {
                label: localize.path(`blueprint.node.duplicate.${multiFiltered}`),
                icon: `<i class="fa-solid fa-copy"></i>`,
                visible: duplicable && !locked,
                onClick: async () => {
                    this.parent.duplicateSelected(selected);
                },
            },
            {
                label: localize.path("builtins.node", GATE_CATEGORY, "return"),
                icon: `<i class="fa-solid fa-plug-circle-xmark"></i>`,
                visible: !locked && isExitGate,
                onClick: () => {
                    this.#createReturnGate();
                },
            },
            {
                label: localize.path("builtins.node.action", CONSOLE_LOG, "title"),
                icon: `<i class="fa-solid fa-terminal"></i>`,
                visible:
                    !locked &&
                    selected.length === 1 &&
                    this.outputs.size > 0 &&
                    this.#node.parent.application.nodes.has(CONSOLE_LOG),
                onClick: () => {
                    this.#createConsoleLogNode();
                },
            },
            {
                label: localize.path(`blueprint.node.edit`),
                icon: `<i class="fa-solid fa-pen-to-square"></i>`,
                visible: !locked && isExitGate,
                onClick: () => {
                    this.edit();
                },
            },
            {
                label: localize.path(`blueprint.node.delete.${multiSelected}`),
                icon: `<i class="fa-solid fa-trash fa-fw"></i>`,
                visible: !locked && (!this.isEvent || this.trigger.application.hasMultipleEvents),
                onClick: async () => {
                    const confirm = await confirmDialog("blueprint.node.delete.confirm");
                    return confirm && this.parent.delete(selected);
                },
            },
        );

        this.createContextMenu(event, entries);
    }

    #createReturnGate() {
        const node = this.trigger.addNode({
            type: RETURN_GATE_TYPE,
            position: addPoints(this.#node.data.position, { x: 0, y: this.height + 5 }),
            // custom: {
            //     inputs: foundry.utils.deepClone(this.#node.data.custom.inputs),
            // },
            outs: {
                out: {
                    connection: `${this.id}:ins:in`,
                },
            },
        });

        if (node) {
            this.blueprint.draw({
                forceComputeConnections: true,
                renderApplication: true,
                selectNodes: [node.id],
            });
        }
    }

    #createConsoleLogNode() {
        const hasOut = !!this.outs.get("out")?.connection;
        const offset = hasOut ? { x: 100, y: 50 } : { x: this.width + 50, y: 0 };

        const source: NodeDataOutput = {
            type: CONSOLE_LOG,
            position: addPoints(this.#node.data.position, offset),
            id: foundry.utils.randomID(),
            custom: {
                inputs: {},
                outputs: {},
                outs: {},
            },
            inputs: {},
            outs: {},
        };

        for (const { isArray, key, label, type } of this.outputs) {
            const inputId = foundry.utils.randomID();

            source.custom.inputs[inputId] = {
                id: inputId,
                isArray,
                label,
                slug: "input",
                type,
            };

            source.inputs[inputId] = {
                connection: `${this.id}:outputs:${key}`,
            };
        }

        const node = this.trigger.addNode(source);
        if (!node) return;

        if (!hasOut) {
            this.update({
                outs: {
                    out: {
                        connection: `${source.id}:ins:in`,
                    },
                },
            });
        }

        this.blueprint.draw({
            forceComputeConnections: true,
            renderApplication: true,
            selectNodes: [node.id],
        });
    }
}

interface BlueprintNode {
    readonly parent: BlueprintNodesLayer;
}

type ILineStyleOptions = Parameters<PIXI.Graphics["lineTextureStyle"]>[0];

type NodeheaderPart = NodePart & {
    background: PIXI.ColorSource;
};

type InteractionData = {
    origin: PIXI.Point;
    selected?: { node: BlueprintNode; origin: Point }[];
};

type PreciseTextOptions = Partial<PIXI.ITextStyle> & {
    fontMult?: number;
};

type CustomEntryDialogData = {
    array?: { value: boolean };
    input?: MaybeFalsy<{
        label: string;
        placeholder: string | undefined;
        type: "number" | "text";
        value: number | string;
    }>;
    label: { placeholder: string | undefined; value: string } | false;
    type: string | undefined;
    types?: { value: string; label: string }[];
};

type EditEntryData = {
    label?: string;
    input?: string;
    array?: boolean;
    type?: string;
};

export { BlueprintNode };
export type { CustomEntryDialogData, PreciseTextOptions };
