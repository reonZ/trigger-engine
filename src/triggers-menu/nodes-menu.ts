import {
    BaseEntrySchemaInput,
    BridgeSchemaInput,
    ConnectionId,
    ENTRY_GATE_TYPE,
    EntryId,
    EXIT_GATE_TYPE,
    GATE_CATEGORY,
    getInputsSchemas,
    getNodeStates,
    getOutputsSchemas,
    getOutsSchemas,
    GETTER_VARIABLE_TYPE,
    InputEntrySchema,
    isGateExitNode,
    NodeCustomsData,
    NodeData,
    NodeDataInput,
    NodeDataOutput,
    OpenTrigger,
    OpenTriggerNode,
    PreciseEntryCategory,
    SPECIAL_CATEGORY,
    SPECIAL_NODES,
    TriggerApplication,
    TriggerNode,
    VARIABLE_CATEGORY,
} from "engine";
import { htmlQuery, localize, R, render } from "foundry-helpers";
import {
    BaseBlueprintEntry,
    Blueprint,
    BlueprintEntry,
    editLabelDialog,
    ExtendedMultiSelectElement,
    ExtendedTextInputElement,
    filterElements,
    isBlueprintEntry,
} from ".";

class BlueprintNodesMenu extends foundry.applications.api.ApplicationV2 {
    #abortController = new AbortController();
    #availableTypes?: { value: string; label: string }[];
    #blueprint: Blueprint;
    #entry: BaseBlueprintEntry | undefined;
    #inClipboard: NodeDataOutput[] = [];
    #position: Point;
    #resolve: BlueprintNodesMenuResolve;
    #searchInput: ExtendedTextInputElement | null = null;
    #tagsInput: ExtendedMultiSelectElement | null = null;

    static DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        classes: ["application"],
        id: "trigger-engine-nodes-menu",
        window: {
            frame: false,
            positioned: false,
        },
    };

    constructor(
        blueprint: Blueprint,
        position: Point,
        resolve: BlueprintNodesMenuResolve,
        entry: BaseBlueprintEntry | undefined,
        options?: DeepPartial<fa.ApplicationConfiguration>,
    ) {
        super(options);

        this.#blueprint = blueprint;
        this.#entry = entry;
        this.#position = position;
        this.#resolve = resolve;
    }

    get key(): string {
        return "nodes-menu";
    }

    get blueprint(): Blueprint {
        return this.#blueprint;
    }

    get application(): TriggerApplication {
        return this.blueprint.application;
    }

    get trigger(): OpenTrigger | undefined {
        return this.blueprint.trigger;
    }

    get availableTypes(): { value: string; label: string }[] {
        return (this.#availableTypes ??= this.application.availableEntryTypes.map((type) => {
            return {
                value: type,
                label: this.application.localize("entry", type, "title") ?? type,
            };
        }));
    }

    static async wait(blueprint: Blueprint, position: Point, entry?: BaseBlueprintEntry): Promise<boolean | null> {
        return new Promise((resolve: BlueprintNodesMenuResolve) => {
            new BlueprintNodesMenu(blueprint, position, resolve, entry).render(true);
        });
    }

    close(options: fa.ApplicationClosingOptions = {}): Promise<this> {
        options.animate = false;
        return super.close(options);
    }

    protected _onClose(): void {
        this.#abortController.abort();
        this.#resolve(null);
    }

    async _prepareContext(): Promise<NodesMenuContext> {
        const allNodes = this.#getNodes();
        const gateNodes = this.#getGateNodes();
        const [allEvents, nodes] = R.partition(allNodes, (node) => node.isEvent);
        const variables = this.#prepareVariablesGroup();

        const tags: { value: string; label: string }[] = R.pipe(
            [...allNodes, ...gateNodes],
            R.flatMap((node) => {
                return (node.tags ?? []).map((tag) => {
                    return {
                        label: localizeNodeTag(this.application, tag),
                        value: tag,
                    };
                });
            }),
            R.uniqueBy(R.prop("label")),
            R.sortBy(R.prop("label")),
        );

        const existingEvents = R.pipe(
            this.trigger?.nodes.contents ?? [],
            R.filter((node) => node.isEvent),
            R.map((node) => node.type),
        );

        const events = allEvents.filter((event) => !R.isIncludedIn(event.type, existingEvents));

        this.#inClipboard = await this.#nodesFromClipboard();

        return {
            events: this.#prepareNodesGroups(events, "event"),
            gates: [this.#prepareGatesGroup(gateNodes)],
            groups: this.#prepareNodesGroups(nodes, "node"),
            inClipboard: this.#inClipboard.length > 0,
            specials: [this.#prepareSpecialsGroup()],
            tags,
            variables: [variables],
        };
    }

    _renderHTML(context: NodesMenuContext): Promise<string> {
        return render(this.key, context);
    }

    _replaceHTML(result: string, content: HTMLElement): void {
        content.innerHTML = result;
        this.#addEventListeners(content);
    }

    localize(...path: string[]): string {
        return localize(this.key, ...path);
    }

    protected _onClickAction(event: PointerEvent, target: HTMLElement) {
        if (event.button !== 0) return;

        const action = target.dataset.action as EventAction;

        switch (action) {
            case "create-gate": {
                return this.#createGate();
            }

            case "paste-nodes": {
                return this.#pasteFromClipboard();
            }

            case "select-gate": {
                const id = target.dataset.id as string;
                return this.#selectGate(id);
            }

            case "select-node": {
                const type = target.dataset.type as string;
                this.#selectNode({ type });
                return this.close();
            }

            case "select-variable": {
                const id = target.dataset.id as ConnectionId;
                return this.#selectVariable(id);
            }
        }
    }

    async #createGate() {
        this.#abortController.abort();

        const label = await editLabelDialog("gate");
        if (!label) {
            return this.close();
        }

        const source: NodeDataInput = {
            custom: {
                title: label,
            },
            type: EXIT_GATE_TYPE,
        };

        this.#selectNode(source);
        this.close();
    }

    #selectVariable(id: ConnectionId) {
        if (!this.trigger?.data.variables[id]) return;

        const entry = this.#entry;
        if (entry && (entry.isOutput || !isBlueprintEntry(entry))) return;

        const source: NodeDataInput = {
            inputs: {
                entry: {
                    connection: id,
                },
            },
            type: GETTER_VARIABLE_TYPE,
        };

        this.#createNode(source, entry ? "outputs:entry" : undefined);
    }

    #selectGate(exitId: string) {
        const trigger = this.trigger;
        if (!trigger) return;

        const entry = this.#entry;
        if (entry && entry.isInput) return;

        const exitNode = trigger.nodes.get(exitId);
        if (!exitNode) return;

        let otherIdSuffix: EntryIdSuffix | undefined;

        const newSource: NodeDataInput = {
            outs: {
                out: {
                    connection: `${exitNode.id}:ins:in`,
                },
            },
            type: ENTRY_GATE_TYPE,
        };

        if (entry && isBlueprintEntry(entry)) {
            const isArray = !!entry.isArray;
            const exitEntry = exitNode.entries.outputs.find(({ schema: other }) => {
                return other.type === entry.type && isArray === !!other.isArray;
            });

            if (exitEntry) {
                otherIdSuffix = `inputs:${exitEntry.key}`;
                newSource.inputs = {
                    [exitEntry.key]: {
                        connection: entry.id as ConnectionId,
                    },
                };
            }
        } else if (entry) {
            otherIdSuffix = "ins:in";
        }

        this.#createNode(newSource, otherIdSuffix);
    }

    async #selectNode(newSource: NodeDataInput) {
        const trigger = this.trigger;
        if (!trigger) return;

        const OtherCls = this.application.nodes.get(newSource.type) as typeof TriggerNode;
        if (!OtherCls) return;

        const entry = this.#entry;
        const onCreateResult = await OtherCls._onCreate({ availableTypes: this.availableTypes });
        if (onCreateResult === false) return;

        const custom: Partial<NodeCustomsData> = R.pipe(
            R.isPlainObject(onCreateResult) ? onCreateResult : {},
            R.pick(["inputs", "outputs"]),
            R.mapValues((entries, category) => {
                return R.mapValues(entries, (entry, id) => {
                    const slug = entry.slug;
                    const label =
                        entry.label ??
                        this.application.localize("node", OtherCls.category, OtherCls.type, category, slug, "title") ??
                        this.application.localize("entry", slug, "title") ??
                        slug;

                    return {
                        id,
                        isArray: entry.isArray ?? false,
                        label,
                        slug,
                        type: entry.type,
                    };
                });
            }),
        );

        newSource.custom = {
            ...newSource.custom,
            ...custom,
        };

        let otherIdSuffix: EntryIdSuffix | undefined;
        const nodeStates = getNodeStates(OtherCls) ?? [null];
        const getOtherSchema = <T extends BaseEntrySchemaInput | BridgeSchemaInput>(
            category: "outs" | "inputs" | "outputs",
            callback: (entries: T[]) => T | undefined,
        ): T | undefined => {
            const schemaFn =
                category === "outs" ? getOutsSchemas : category === "inputs" ? getInputsSchemas : getOutputsSchemas;

            for (const state of nodeStates) {
                const schemas = schemaFn(OtherCls, { state, data: { custom } }) as T[];
                const schema = callback(schemas);

                if (schema) {
                    if (state) {
                        newSource.state = state;
                    } else {
                        delete newSource.state;
                    }

                    return schema;
                }
            }
        };

        const getOtherEntrySchema = (category: "inputs" | "outputs") => {
            const isArray = !!(entry as BlueprintEntry).isArray;
            const entryType = (entry as BlueprintEntry).type;

            return getOtherSchema<BaseEntrySchemaInput>(category, (schemas) => {
                return R.pipe(
                    schemas,
                    R.sortBy((schema) => schema.group ?? ""),
                    R.find((schema) => {
                        return schema.type === entryType && isArray === !!schema.isArray;
                    }),
                );
            });
        };

        if (entry?.isInput) {
            if (isBlueprintEntry(entry)) {
                const otherEntry = getOtherEntrySchema("outputs");
                otherIdSuffix = otherEntry ? `outputs:${otherEntry.key}` : undefined;
            } else {
                const otherOut = getOtherSchema("outs", (schemas) => schemas.at(0))?.key;

                if (otherOut) {
                    otherIdSuffix = otherOut ? `outs:${otherOut}` : undefined;
                    newSource.outs = {
                        [otherOut]: {
                            connection: entry.id as ConnectionId,
                        },
                    };
                }
            }
        } else if (entry?.isOutput) {
            if (isBlueprintEntry(entry)) {
                const otherEntry = getOtherEntrySchema("inputs");

                if (otherEntry) {
                    otherIdSuffix = `inputs:${otherEntry.key}`;
                    newSource.inputs = {
                        [otherEntry.key]: {
                            connection: entry.id as ConnectionId,
                        },
                    };
                }
            } else {
                otherIdSuffix = "ins:in";
            }
        }

        this.#createNode(newSource, otherIdSuffix);
    }

    #createNode(newSource: NodeDataInput, otherIdSuffix: EntryIdSuffix | undefined) {
        newSource.position = this.#position;

        const newNode = this.trigger?.addNode(newSource);

        if (!newNode) {
            return this.close();
        }

        const entry = this.#entry;
        const otherId: EntryId | undefined = otherIdSuffix ? `${newNode.id}:${otherIdSuffix}` : undefined;

        if (entry && otherId) {
            // we do it before creating the node so we don't have to update it
            this.trigger?.addComputedConnections(entry.id, otherId);
        }

        const blueprintNode = this.blueprint.nodes.add(newNode, true);

        if (entry && otherId) {
            this.blueprint.connections.add(entry.id, otherId);

            if (entry.isConnectionInitiator) {
                entry.node.addConnection(entry.preciseCategory, entry.key, otherId);
                entry.node.draw();
            }

            const targetEntry = this.blueprint.nodes.getEntryFromId(otherId);

            if (targetEntry) {
                const { x, y } = this.blueprint.unscalePoint(targetEntry.connectorOffset);
                blueprintNode.setPosition(blueprintNode.x - x, blueprintNode.y - y);
            }
        }

        this.#resolve(true);
        this.close();
    }

    #pasteFromClipboard() {
        const sources = this.#inClipboard;

        if (!sources.length) {
            return this.close();
        }

        const offset: Point = {
            x: this.#position.x - sources[0].position.x,
            y: this.#position.y - sources[0].position.y,
        };

        for (const source of sources) {
            source.position.x += offset.x;
            source.position.y += offset.y;
        }

        this.blueprint.nodes.addFromSources(sources);
        this.close();
    }

    async #nodesFromClipboard(): Promise<NodeDataOutput[]> {
        if (this.#entry) return [];

        try {
            const str = await navigator.clipboard.readText();
            const data = JSON.parse(str);
            if (!R.isArray(data)) return [];

            const nodes: NodeDataOutput[] = [];

            for (const entry of data) {
                const node = new NodeData(entry as NodeDataOutput);
                if (node.invalid) continue;

                nodes.push(node.toObject());
            }

            return nodes;
        } catch (error) {
            return [];
        }
    }

    #prepareVariablesGroup(): VariablesGroup {
        const entry = this.#entry;
        const group: VariablesGroup = {
            action: "select-variable",
            label: this.localize("category.variable"),
            nodes: [],
        };

        if (entry && (!isBlueprintEntry(entry) || entry.isOutput)) {
            return group;
        }

        for (const [id, variable] of R.entries(this.trigger?.data.variables ?? {})) {
            if (entry && entry.type !== variable.type) continue;

            group.nodes.push({
                id,
                tags: [],
                title: variable.label,
                type: variable.type,
            });
        }

        return group;
    }

    #getGateNodes(): OpenTriggerNode[] {
        const entry = this.#entry;

        // entry-gates don't have outputs and we never create another instance of exit-gate
        if (entry && (entry.isInput || isGateExitNode(entry.node))) {
            return [];
        }

        // to create an entry-gate, we need to look at the existing exit-gate schemas
        const nodes = this.trigger?.nodes.filter(isGateExitNode) ?? [];

        // all gates have an 'in' so we don't even need to check further
        if (!entry || !isBlueprintEntry(entry)) {
            return nodes;
        }

        const isArray = !!entry.isArray;

        return nodes.filter((node) => {
            // entry-gates input schemas is a mirror of exit-gates output schemas
            return node.entries.outputs.some((other) => {
                return other.type === entry.type && isArray === !!other.isArray;
            });
        });
    }

    #getNodes(): (typeof TriggerNode)[] {
        const entry = this.#entry;

        let nodes = this.application.nodes.filter(
            (node) => !R.isIncludedIn(node.category, [GATE_CATEGORY, SPECIAL_CATEGORY, VARIABLE_CATEGORY]),
        );

        if (!entry) {
            return nodes;
        }

        const entryIsInput = entry.isInput;

        // events never have input connectors, so we get rid of them all
        if (!entryIsInput) {
            nodes = nodes.filter((node) => !node.isEvent);
        }

        if (!isBlueprintEntry(entry)) {
            return entryIsInput
                ? nodes.filter((node) => getOutsSchemas(node).length)
                : nodes.filter((node) => node.hasIn);
        }

        const isArray = !!entry.isArray;

        return nodes.filter((node) => {
            const schemasFn = entryIsInput ? getOutputsSchemas : getInputsSchemas;
            const entries = schemasFn(node);

            return entries.some((other) => {
                if (!entryIsInput) {
                    const otherSchema = other as InputEntrySchema;
                    const OtherCls = this.application.entries.get(otherSchema.type);
                    if (OtherCls?.FieldClass && !node.inputsHaveConnector) return false;
                    if (OtherCls?.FieldClass && !OtherCls.FieldClass.entryHasConnector(otherSchema.field)) return false;
                }

                return other.type === entry.type && isArray === !!other.isArray;
            });
        });
    }

    #prepareGatesGroup(nodes: OpenTriggerNode[]): GatesGroup {
        const group: GatesGroup = {
            action: "select-gate",
            add: { action: "create-gate", tooltip: this.localize("add.gate") },
            label: this.localize("category.gate"),
            nodes: [],
        };

        for (const node of nodes) {
            group.nodes.push({
                id: node.id,
                tags: node.tags,
                title: node.data.custom.title ?? node.id,
                type: node.type,
            });
        }

        return group;
    }

    #prepareSpecialsGroup(): SpecialsGroup {
        const group: SpecialsGroup = {
            action: "select-node",
            label: this.localize("category.special"),
            nodes: [],
        };

        if (this.#entry) {
            return group;
        }

        for (const Special of R.values(SPECIAL_NODES)) {
            group.nodes.push({
                tags: Special.tags ?? [],
                title: localizeNodeProperty(this.application, Special as typeof TriggerNode, "type"),
                type: Special.type,
            });
        }

        return group;
    }

    #prepareNodesGroups(nodes: (typeof TriggerNode)[], empty: string): NodesGroup[] {
        if (!nodes.length) {
            return [{ action: "select-node", label: this.localize("category", empty), nodes: [] }];
        }

        return R.pipe(
            nodes,
            R.groupBy((node) => node.category.trim() || empty),
            R.entries(),
            R.map(([category, Nodes]): NodesGroup => {
                const value = category === empty ? "" : category;

                const label = value
                    ? localizeNodeProperty(this.application, Nodes[0], "category")
                    : this.localize("category", category);

                const nodes = R.pipe(
                    Nodes,
                    R.map((Node): NodesGroup["nodes"][number] => {
                        return {
                            aliases: (Node.aliases ?? []).map((alias) => {
                                return localizeNodeAlias(this.application, Node, alias);
                            }),
                            tags: Node.tags ?? [],
                            title: localizeNodeProperty(this.application, Node, "type"),
                            type: Node.type,
                        };
                    }),
                    R.sortBy(R.prop("title")),
                );

                return {
                    action: "select-node",
                    label,
                    nodes,
                };
            }),
            R.sortBy(R.prop("label")),
        );
    }

    #addEventListeners(html: HTMLElement) {
        requestAnimationFrame(() => {
            window.addEventListener(
                "pointerdown",
                (event) => {
                    if (event.target instanceof HTMLElement && !html.contains(event.target)) {
                        this.#abortController.abort();
                        this.close();
                    }
                },
                { signal: this.#abortController.signal },
            );
        });

        this.#searchInput = htmlQuery<ExtendedTextInputElement>(html, `[name="search"]`);
        this.#searchInput?.addEventListener("input", () => this.#filterNodes());
        this.#searchInput?.addEventListener("keydown", this.#searchKeyDown.bind(this));

        this.#tagsInput = htmlQuery<ExtendedMultiSelectElement>(html, `[name="tags"]`);
        this.#tagsInput?.addEventListener("change", () => this.#filterNodes());
        this.#tagsInput?.addEventListener("mode", () => this.#filterNodes());
    }

    #searchKeyDown(event: KeyboardEvent) {
        if (event.key !== "Enter") return;

        const selectable = this.element.querySelectorAll(".selectable.node:not(.hidden)");
        if (selectable.length !== 1) return;

        event.preventDefault();
        event.stopPropagation();

        const element = selectable.item(0) as HTMLElement;
        element.click();
    }

    #filterNodes() {
        filterElements(
            this.element.querySelectorAll<HTMLElement>(`.nodes .node`),
            this.#searchInput?.value,
            this.#tagsInput?.value,
            this.#tagsInput?.mode,
        );
    }
}

function localizeNodeProperty(
    application: TriggerApplication,
    node: typeof TriggerNode,
    property: TriggerNodeStringProperty,
): string {
    const path = getNodePropertyLocalizePath(node, property);
    return application.localize(path) ?? node[property];
}

function getNodePropertyLocalizePath(node: typeof TriggerNode, property: TriggerNodeStringProperty): string {
    switch (property) {
        case "category": {
            return `category.${node.category}.title`;
        }

        case "type": {
            return `node.${node.category}.${node.type}.title`;
        }
    }
}

function localizeNodeTag(application: TriggerApplication, tag: string): string {
    return application.localize("tag", tag, "title") ?? application.localize("entry", tag, "title") ?? tag;
}

function localizeNodeAlias(application: TriggerApplication, node: typeof TriggerNode, alias: string): string {
    return (
        application.localize("node", node.category, node.type, "alias", alias, "title") ??
        application.localize("alias", alias, "title") ??
        application.localize("entry", alias, "title") ??
        game.i18n.localize(alias)
    );
}

type TriggerNodeStringProperty = keyof {
    [P in keyof typeof TriggerNode as (typeof TriggerNode)[P] extends string ? P : never]: (typeof TriggerNode)[P];
};

type EventAction = "create-gate" | "paste-nodes" | "select-gate" | "select-node" | "select-variable";

type NodesMenuContext = fa.ApplicationRenderContext & {
    events: NodesGroup[];
    gates: [GatesGroup];
    groups: NodesGroup[];
    inClipboard: boolean;
    specials: [SpecialsGroup];
    tags: { value: string; label: string }[];
    variables: VariablesGroup[];
};

type NodesGroup = {
    action: string;
    label: string;
    nodes: (PreparedNode & { aliases: string[] })[];
};

type SpecialsGroup = Omit<NodesGroup, "nodes"> & {
    nodes: PreparedNode[];
};

type VariablesGroup = Omit<NodesGroup, "nodes"> & {
    nodes: PreparedNode[];
};

type GatesGroup = Omit<NodesGroup, "nodes"> & {
    nodes: (PreparedNode & { id: string })[];
    add: { action: string; tooltip: string };
};

type PreparedNode = {
    id?: string;
    tags: string[];
    title: string;
    type: string;
};

type BlueprintNodesMenuResolve = (result: boolean | null) => void;

type EntryIdSuffix = `${PreciseEntryCategory}:${string}`;

export { BlueprintNodesMenu };
