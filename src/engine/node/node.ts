import { IconObject } from "_zod";
import {
    ApplicationKey,
    BridgeSchemaInput,
    CustomInputSchema,
    CustomOutputSchema,
    CustomOutSchema,
    ExitGateNodeData,
    getInputsSchemas,
    getNodeStates,
    getOutputsSchemas,
    getOutsSchemas,
    InputEntrySchemaSource,
    instantiateEntry,
    isGateEntryNode,
    isGateReturnNode,
    isSpecialTriggerNode,
    NodeBridge,
    NodeData,
    NodeEntry,
    NodeField,
    OpenNodeEntry,
    OpenTrigger,
    OutputEntrySchema,
    OutputEntrySchemaSource,
    ResolvedNodeEntry,
    ResolvedTriggerNode,
    splitEntryId,
    Trigger,
    TriggerPath,
    UserValue,
} from "engine";
import {
    FirstActiveTokenOptions,
    getTargetsTokens,
    getTargetToken,
    LocalizeArgs,
    MODULE,
    R,
    TokenDocumentPF2e,
    TokenDocumentUUID,
} from "foundry-helpers";

class TriggerNode<
    TOuts extends string | never = string,
    TInputs extends Record<string, any> | never = Record<string, any>,
    TOutputs extends Record<string, any> | never = Record<string, any>,
    TCustomInputs extends string | never = string,
    TCustomOutputs extends string | never = string,
    TState extends string | never = string,
> {
    #data: NodeData;
    #in: NodeBridge | null;
    #inputs: Collection<string, NodeEntry>;
    #nextCalled: boolean = false;
    #outputs: Collection<string, NodeEntry>;
    #outputValues: Record<string, any> = {};
    #outs: Collection<string, NodeBridge>;
    #parent: Trigger;
    #sceneId?: string;
    #state: TState | null;
    #userId?: string;

    /** @private You musn't use constructor in your child class */
    constructor(
        parent: Trigger,
        nodeData: NodeData,
        variableSchemas: OutputEntrySchema[] | undefined,
        exitGate: ExitGateNodeData | undefined,
        open: boolean,
    ) {
        const SelfCls = this.constructor as typeof TriggerNode;
        const isEvent = SelfCls.isEvent;
        const isEntryGate = exitGate && isGateEntryNode(nodeData);
        const isReturnGate = exitGate && isGateReturnNode(nodeData);
        const isSpecialNode = isSpecialTriggerNode(SelfCls);
        const nodeStates = getNodeStates(SelfCls);
        const nodeState = !nodeStates
            ? null
            : R.isString(nodeData.state) && R.isIncludedIn(nodeData.state, nodeStates)
              ? nodeData.state
              : nodeStates[0];

        this.#parent = parent;
        this.#data = nodeData;
        this.#state = nodeState as TState | null;

        // bridges
        const [ins, outs] = R.map(
            [
                [
                    "inputs",
                    !isEvent && SelfCls.hasIn ? [{ key: "in", spacing: 0, state: undefined, tooltip: false }] : [],
                ],
                ["outputs", getOutsSchemas(SelfCls, { data: nodeData, state: nodeState })],
            ] as const,
            ([category, schemas]) => {
                return R.pipe(
                    schemas,
                    R.map((schema) => {
                        try {
                            const bridge = new NodeBridge(this, category, nodeData, schema);
                            return [bridge.key, bridge] as const;
                        } catch (error) {}
                    }),
                    R.filter(R.isTruthy),
                );
            },
        );

        // entries
        const [inputs, outputs] = R.map(
            [
                [
                    "inputs",
                    variableSchemas ?? // unique schema for variables
                        (isSpecialNode ? SelfCls.buildInputsSchemas(nodeData) : null) ??
                        (isEntryGate ? exitGate.outputs : null) ?? // we use the exit output schemas
                        (isReturnGate ? exitGate.inputs : null) ?? // we use the exit input schemas
                        getInputsSchemas(SelfCls, { data: nodeData, state: nodeState }),
                ],
                [
                    "outputs",
                    variableSchemas ?? // unique schema for variables
                        (isSpecialNode ? SelfCls.buildOutputsSchemas(nodeData) : null) ??
                        (isEntryGate ? exitGate.inputs : null) ?? // we use the exit input schemas
                        getOutputsSchemas(SelfCls, { data: nodeData, state: nodeState }),
                ],
            ] as const,
            ([category, schemas]) => {
                const entries = R.pipe(
                    schemas,
                    R.map((schema) => {
                        try {
                            const entry = instantiateEntry(parent, this, category, schema, nodeData, open);

                            return entry ? ([entry.key, entry] as const) : undefined;
                        } catch (error: any) {
                            MODULE.error("an error occurred while instantiating a node entry", error);
                        }
                    }),
                    R.filter(R.isTruthy),
                );

                return new Collection(entries);
            },
        );

        this.#in = ins.at(0)?.[1] || null;
        this.#outs = new Collection(outs);
        this.#inputs = inputs;
        this.#outputs = outputs;

        if (open) {
            Object.defineProperties(this, {
                data: {
                    value: nodeData,
                },
                entries: {
                    value: {
                        in: this.#in,
                        outs: this.#outs,
                        inputs: inputs as Collection<string, OpenNodeEntry>,
                        outputs: outputs as Collection<string, OpenNodeEntry>,
                    } satisfies NodeEntries,
                },
                exitGate: {
                    value: exitGate?.node,
                },
                parent: {
                    value: parent,
                },
                states: {
                    value: nodeStates,
                },
                tags: {
                    value: SelfCls.tags,
                },
            });
        }

        if (parent.application.isFreeApplication) {
            const _execute = this._execute.bind(this);

            this._execute = async (...args: any[]): Promise<boolean> => {
                const result = await _execute(...args);

                if (!this.#nextCalled) {
                    await this.#resolve();
                }

                return result;
            };
        }
    }

    /**
     * @abstract
     * Must be an unique key among your registered module's nodes (including builtins)
     *
     * Localization path:
     * `<module-id>.<application-id>.node.<category>.<type>.title`
     */
    static get type(): string {
        throw MODULE.Error("'type' accessor not implemented.");
    }

    /**
     * Used to sort nodes in the triggers menu
     *
     * Localization path:
     * `<module-id>.<application-id>.category.<category>.title`
     */
    static get category(): string {
        return this.isEvent ? "event" : "node";
    }

    /**
     * A node can have multiple layout states. Must at least contain 2 states if used.
     * The first entry is the default state.
     *
     * Localization path:
     * `<module-id>.<application-id>.node.<category>.<type>.states.<state>`
     */
    static get states(): string[] | null {
        return null;
    }

    /**
     * Tags used to filter in the triggers menu.
     * Nodes are already displayed by `category` so this is only for extra filtering.
     *
     * Localization path:
     * `<module-id>.<application-id>.tag.<tag>.title`
     */
    static get tags(): string[] | null {
        return null;
    }

    /**
     * Aliases used in conjunction to the node's name in the search field.
     *
     * Localization path:
     * `<module-id>.<application-id>.node.<category>.<type>.alias.<alias>.title`
     * `<module-id>.<application-id>.alias.<alias>.title`
     */
    static get aliases(): string[] | null {
        return null;
    }

    /**
     * Define this as a trigger event node.
     *
     * Some functionalities will be excluded/overriden if `true`.
     */
    static get isEvent(): boolean {
        return false;
    }

    /**
     * Some nodes may want to only have value inputs.
     * This can only be used in conjunction with entries with a field.
     */
    static get inputsHaveConnector(): boolean {
        return true;
    }

    /**
     * Some nodes may want to only have connection inputs.
     *
     * This won't prevent the initialization of {@link NodeEntry.FieldClass}
     * and {@link NodeEntry#field} as well as {@link NodeField#field} will remain accessible.
     */
    static get inputsHaveField(): boolean {
        return true;
    }

    /**
     * Does this node have an `in` bridge entry.
     *
     * Localization path:
     * `<module-id>.<application-id>.node.<category>.<type>.in`
     */
    static get hasIn(): boolean {
        return true;
    }

    /**
     * List of `out` bridge entries.
     *
     * Localization path:
     * `<module-id>.<application-id>.node.<category>.<type>.outs.<key>`
     */
    static get defineOuts(): BridgeSchemaInput[] | null {
        return [{ key: "out" }];
    }

    /**
     * Define the inputs for this node if any. Inputs can make use of {@link NodeField.defineSchema}.
     *
     * Localization path:
     * `<module-id>.<application-id>.node.<category>.<type>.inputs.<key>`
     * `<module-id>.<application-id>.node.<category>.<type>.group.<group>`
     */
    static get defineInputs(): InputEntrySchemaSource[] | null {
        return null;
    }

    /**
     * Define the outputs for this node if any.
     *
     * Localization path:
     * `<module-id>.<application-id>.node.<category>.<type>.outputs.<key>`
     */
    static get defineOutputs(): OutputEntrySchemaSource[] | null {
        return null;
    }

    /**
     * Define the custom outs schemas if any.
     *
     * Localization path:
     * `<module-id>.<application-id>.node.<category>.<type>.custom.outs.<slug>.label`
     * `<module-id>.<application-id>.node.<category>.<type>.custom.outs.<slug>.placeholder`
     * `<module-id>.<application-id>.node.<category>.<type>.custom.outs.<slug>.input.label`
     * `<module-id>.<application-id>.node.<category>.<type>.custom.outs.<slug>.input.placeholder`
     */
    static get defineCustomOuts(): CustomOutSchema[] | null {
        return null;
    }

    /** Define the custom inputs schemas if any. */
    static get defineCustomInputs(): CustomInputSchema[] | null {
        return null;
    }

    /** Define the custom outputs schemas if any. */
    static get defineCustomOutputs(): CustomOutputSchema[] | null {
        return null;
    }

    /** The background color for the header. Is only used if the node has a 'title'. */
    get headerColor(): ColorSource | null {
        return this.isEvent ? "#C40000" : "#0c0c0c";
    }

    /**
     * The header icon. Is only used if the node has a 'title'.
     *
     * Return a string if an image.
     */
    get icon(): string | IconObject | null {
        return null;
    }

    /** Used to display a special icon. */
    get canBreak(): boolean {
        return false;
    }

    /** Used to display a special icon. */
    get canDelay(): boolean {
        return false;
    }

    /** Used to display a special icon. */
    get canStop(): boolean {
        return false;
    }

    /** Used to display a special icon. */
    get isEmit(): boolean {
        return false;
    }

    /** Used to display a special icon. */
    get isLoop(): boolean {
        return false;
    }

    /**
     * Icons added to the node to indicate some special features the node contains at first glance.
     * They will be added next to the already existing ones (e.g. `custom`)
     *
     * Localization path:
     * `<module-id>.<application-id>.node.<category>.<type>.specials.<name>`
     */
    get specialIcons(): { icon: IconObject; name?: string }[] | null {
        return null;
    }

    /**
     * The appearing subtitle on the node. Is only used if the node has a 'title'.
     *
     * Localization path:
     * `<module-id>.<application-id>.node.<category>.<type>.subtitle`
     */
    get subtitle(): string | null {
        return this.localize("subtitle") ?? this.rootLocalize("category", this.category, "title") ?? null;
    }

    /**
     * The appearing title on the node.
     *
     * Localization path:
     * `<module-id>.<application-id>.node.<category>.<type>.title`
     */
    get title(): string | null {
        return this.localize("title") ?? null;
    }

    /**
     * Tooltip to display when the node's header is hovered over.
     *
     * Localization path:
     * `<module-id>.<application-id>.node.<category>.<type>.tooltip`
     */
    generateTooltip(): string {
        return this.localize("tooltip") ?? "";
    }

    /**
     * @abstract
     * A node with `in` or `outs` is considered an `executable` node.
     *
     * This method is called by a previous node that has `outs`.
     *
     * @param args are passed by the hook calling the event (and optionally from the previous node if needed)
     *
     * @see {@link TriggerNode#executeNext}
     * @see {@link TriggerNode#getInputValue}
     * @see {@link TriggerNode#setOutputValue}
     *
     * IMPORTANT: any try/catch encapsulating a {@link TriggerNode#executeNext} must make sure to not intercept
     * the `GateEntryReturn` error.
     *
     * @example
     * _execute() {
     *   try {
     *     // something
     *     return this.executeNext("out");
     *   } catch (error) {
     *     if (error.name === "GateEntryReturn") {
     *       throw error;
     *     }
     *     // handle your own errors
     *   }
     * }
     *
     */
    _execute(...args: any[]): Promise<boolean> {
        throw MODULE.Error("'_execute' method not implemented.");
    }

    /**
     * @abstract
     * A node without 'in' nor 'outs' is considered a `query` node.
     *
     * @param key is the key of the output entry that was requested by the other node.
     *
     * @returns the computed value of the output type requested by the other node.
     * If the returned value isn't compatible with the connection type, the default value is returned instead.
     */
    _query(key: string): Promise<any> {
        throw MODULE.Error("'_query' method not implemented.");
    }

    /**
     * *************************************************************
     * Stuff that is not meant to be overridden, don't be an idiot!
     * *************************************************************
     */

    /**
     * @private
     *
     * The key of the parent application.
     */
    get applicationKey(): ApplicationKey {
        return this.#parent.applicationKey;
    }

    /**
     * @private
     *
     * @see {@link TriggerNode.category}
     */
    get category(): string {
        return (this.constructor as typeof TriggerNode).category;
    }

    /**
     * @private
     *
     * the id of the node
     */
    get id(): string {
        return this.#data.id;
    }

    /**
     * @private
     *
     * if the node is invalid
     */
    get invalid(): boolean {
        return this.#data.invalid;
    }

    /**
     * @private
     *
     * @see {@link TriggerNode.isEvent}
     */
    get isEvent(): boolean {
        return (this.constructor as typeof TriggerNode).isEvent;
    }

    /**
     * @private
     *
     * Is this node considered executable
     */
    get isExecutable(): boolean {
        return !!this.#in || this.#outs.size > 0;
    }

    /**
     * @private
     *
     * The internal path for the node.
     */
    get nodePath(): TriggerNodePath {
        return `${this.#parent.path}:${this.id}`;
    }

    /**
     * @private
     *
     * Scene context getter and setter.
     */
    get sceneContext(): Scene | undefined {
        return (this.#sceneId && game.scenes.get(this.#sceneId)) || this.#parent.sceneContext;
    }
    set sceneContext(sceneOrToken: Maybe<Scene | TokenDocumentPF2e>) {
        const scene = sceneOrToken instanceof TokenDocument ? sceneOrToken.parent : sceneOrToken;

        if (scene) {
            this.#sceneId = scene.id;
            this.#parent.sceneContext = scene;
        }
    }

    /**
     * @private
     *
     * @see {@link TriggerNode.type}
     */
    get type(): string {
        return (this.constructor as typeof TriggerNode).type;
    }

    /**
     * @private
     *
     * The current state of the node.
     */
    get state(): TState | null {
        return this.#state;
    }

    /**
     * @private
     *
     * The name for the parent trigger.
     */
    get triggerName(): string {
        return this.#parent.name || this.#parent.id;
    }

    /**
     * @private
     *
     * The internal path for the parent trigger.
     */
    get triggerPath(): TriggerPath {
        return this.#parent.path;
    }

    /**
     * @private
     *
     * User context getter and setter.
     */
    get userContext(): User {
        return (this.#userId && game.users.get(this.#userId)) || this.#parent.userContext;
    }
    set userContext(user: User) {
        this.#userId = user.id;
        this.#parent.userContext = user;
    }

    /**
     * @private
     *
     * Convert a value back from its websocket version.
     */
    convertFromEmitable(type: string, value: unknown, withType?: boolean): Promise<any | undefined> {
        return this.#parent.application.convertFromEmitable(type, value, withType);
    }

    /**
     * @private
     *
     * Convert a data object back from its websocket version.
     *
     * @see {@link TriggerNode#convertFromEmitable}
     * @see {@link TriggerNode#convertValueFromEmitable}
     * @see {@link TriggerNode#convertValuesFromEmitable}
     */
    convertObjectFromEmitable<T extends string>(
        obj: Record<T, unknown>,
        conversionTypes: PartialRecord<T, string>,
        userValueEntries: Partial<T>[],
        withType?: boolean,
    ): Promise<Record<T, any>> {
        return this.#parent.application.convertObjectFromEmitable(obj, conversionTypes, userValueEntries, withType);
    }

    /**
     * @private
     *
     * Convert a data object composed of raw data and/or user values into one that is sent via websocket.
     *
     * @see {@link TriggerNode#convertToEmitable}
     * @see {@link TriggerNode#convertValueToEmitable}
     * @see {@link TriggerNode#convertValuesToEmitable}
     */
    convertObjectToEmitable<T extends string>(
        obj: Record<T, unknown>,
        conversionTypes: PartialRecord<T, string>,
        userValueEntries: Partial<T>[],
        parseUserValues?: boolean,
    ): Record<T, any> {
        return this.#parent.application.convertObjectToEmitable(
            obj,
            conversionTypes,
            userValueEntries,
            parseUserValues,
        );
    }

    /**
     * @private
     *
     * Convert a value into one that is sent via websocket.
     */
    convertToEmitable(type: string, value: any): UserValue | undefined {
        return this.#parent.application.convertToEmitable(type, value) as UserValue | undefined;
    }

    /**
     * @private
     *
     * @see {@link TriggerNode#convertFromEmitable}
     */
    convertValueFromEmitable(entry: UserValue, withType?: boolean): Promise<any> | undefined {
        return this.#parent.application.convertValueFromEmitable(entry, withType);
    }

    /**
     * @private
     *
     * @see {@link TriggerNode#convertValueFromEmitable}
     */
    convertValuesFomEmitable(values: (UserValue | undefined)[], withType?: boolean): Promise<(any | undefined)[]> {
        return this.#parent.application.convertValuesFomEmitable(values, withType);
    }

    /**
     * @private
     *
     * @see {@link TriggerNode#convertValueToEmitable}
     */
    convertValuesToEmitable(values: UserValue[], parse?: boolean): (UserValue | undefined)[] {
        return this.#parent.application.convertValuesToEmitable(values, parse);
    }

    /**
     * @private
     *
     * Convert a user value into one that is sent via websocket.
     *
     * @see {@link TriggerNode#convertToEmitable}
     * @see {@link TriggerNode#parseUserValue}
     */
    convertValueToEmitable(value: UserValue, parse?: boolean): UserValue | undefined {
        return this.#parent.application.convertValueToEmitable(value, parse) as UserValue | undefined;
    }

    /**
     * @private
     *
     * Calls the next `executable` node in the chain.
     *
     * @param out key of the selected `out` bridge
     *
     * @example
     * return this.executeNext("out")
     *
     * @example
     * return this.executeNext("true")
     *
     * @see {@link TriggerNode#_execute}
     */
    async executeNext(out: TOuts, ...args: any[]): Promise<boolean> {
        if (!this.isExecutable) return true;

        if (this.#parent.application.isFreeApplication) {
            this.#nextCalled = true;
            await this.#resolve();
        }

        try {
            const connection = this.#outs.get(out)?.connection;
            if (!connection) return true;

            const node = this.#parent.getNodeFromEntryId(connection);
            if (!node) return true;

            // we set the trigger context to the node's whenever it is executed
            this.#parent.userContext = node.userContext;
            return node._execute(...args);
        } catch (error: any) {
            MODULE.error(`an error occurred while executing the node: ${this.nodePath}`, error);
            return true;
        }
    }

    /**
     * @private
     *
     * custom data accessible accross the entire trigger
     */
    getContext<T>(key: string): T | undefined {
        return this.#parent.getContext(key);
    }

    /**
     * @private
     *
     * Returns a list of custom inputs data.
     */
    getCustomInputs<T extends any = any>(slug: TCustomInputs): Promise<{ label: string; value: T; type: string }[]> {
        const results = this.#inputs
            .filter((input) => input.slug === slug)
            .map(async ({ key, label, type }): Promise<{ label: string; value: any; type: string }> => {
                return {
                    label: label ?? "",
                    value: await this.getInputValue(key),
                    type,
                };
            });

        return Promise.all(results);
    }

    /**
     * @private
     *
     * Returns a list of custom inputs values
     */
    getCustomInputsValues(slug: TCustomInputs): Promise<any[]> {
        const results = this.#inputs
            .filter((input) => input.slug === slug)
            .map(async ({ key }) => this.getInputValue(key));

        return Promise.all(results);
    }

    /**
     * @private
     *
     * Returns the key of a custom out entry based on its input value.
     */
    getCustomOutKey(slug: string, input: string | number): string | undefined {
        return this.#outs.find((out) => out.slug === slug && out.input === input)?.key;
    }

    /**
     * @private
     *
     * Returns a list of custom outputs data (not their value).
     */
    getCustomOutputs(slug: TCustomOutputs): TriggerNodeCustomOutput[] {
        return this.#outputs
            .filter((output) => output.slug === slug)
            .map(({ input, key, type }): TriggerNodeCustomOutput => {
                return { input, key, type };
            });
    }

    /**
     * @private
     *
     * Retrieve the computed value from one of this node's inputs.
     *
     * @param input key of the `input` from which you want to retrieve the value.
     *
     * If no connection exist with the input or the returned value is incompatible with its type,
     * then the default value is returned instead.
     *
     * @example
     * const number = await this.getInputValue("number");
     *
     * @see {@link TriggerNode#_execute}
     */
    async getInputValue<K extends keyof TInputs>(key: K): Promise<TInputs[K]>;
    async getInputValue(key: string) {
        const input = this.#inputs.get(key as string);
        if (!input) return;

        const returnValue = (rawValue: any): any => {
            if (input.isArray) {
                return R.pipe(
                    R.isArray(rawValue) ? rawValue : [rawValue],
                    R.filter(input.isValidType.bind(input)),
                    R.map(input.processValue.bind(input)),
                );
            } else {
                const value = R.isArray(rawValue) ? rawValue[0] : rawValue;
                return input.isValidType(value) ? input.processValue(value) : input.default;
            }
        };

        if (input.connection) {
            const [nodeId, _, otherKey] = splitEntryId(input.connection);
            const otherNode = this.#parent.getNode(nodeId);

            if (!otherNode) {
                return input.default;
            }

            const value = await otherNode.getOutputValue(otherKey, input);
            return returnValue(value);
        } else {
            return returnValue(input.value);
        }
    }

    /**
     * @private
     *
     * Retrieve the local value of this node's input.
     */
    getLocalValue<K extends keyof TInputs>(key: K): TInputs[K];
    getLocalValue(key: string) {
        const input = this.#inputs.get(key);
        if (!input) return;

        const value = input?.value;
        return R.isNonNullish(value) && input.isValidType(value) ? input.processValue(value) : input.default;
    }

    /**
     * @private
     *
     * Query the value of a connected output
     */
    async getOutputValue(key: string, input: NodeEntry): Promise<any> {
        const output = this.#outputs.get(key);
        if (!output) return;

        const value = await (this.isExecutable ? this.#outputValues[key] : this._query(key));

        if (output.type === input.type) {
            return value;
        }

        const convertor = this.#parent.application.getConvertor(output.type, input.type);
        if (!convertor) return;

        const userContext = this.userContext;
        const convertToInput = (value: any) => convertor.convertToInput(value, userContext);

        return R.isArray(value)
            ? await Promise.all(value.filter((x) => output.isValidType(x)).map(convertToInput))
            : output.isValidType(value)
              ? await convertToInput(value)
              : undefined;
    }

    /**
     * @private
     *
     * If the 'target' entry doesn't have a declare 'token', then the function
     * will try to retrieve the first active token on the scene (with options)
     *
     * @param {TargetDocuments} target
     * @param {object} [options]
     * @param {boolean} [options.linked]
     * @param {Scene | null} [options.scene]
     */
    getTargetToken<T extends TokenDocument>(
        target: Maybe<TargetDocuments>,
        options?: FirstActiveTokenOptions,
    ): T | undefined {
        return getTargetToken(target, options) as T | undefined;
    }

    /**
     * @private
     *
     * @see {@link TriggerNode#getTargetToken}
     */
    getTargetsTokens(targets: TargetDocuments[], uuid: true, options?: FirstActiveTokenOptions): TokenDocumentUUID[];
    getTargetsTokens<T extends TokenDocument>(
        targets: TargetDocuments[],
        uuid?: boolean,
        options?: FirstActiveTokenOptions,
    ): T[] {
        return getTargetsTokens(targets, uuid, options) as unknown as T[];
    }

    /**
     * @private
     *
     * Localization helper with pre-defined path and optional (last argument) data object for `game.i18n.format`
     *
     * It points directly to the path:
     * `<module-id>.<application-id>.node.<category>.<type>.<...path>`
     *
     * @returns undefined if no key exist at that path
     */
    localize(...args: LocalizeArgs): string | undefined {
        const SelfCls = this.constructor as typeof TriggerNode;
        return this.rootLocalize("node", SelfCls.category, SelfCls.type, ...args);
    }

    /**
     * @private
     *
     * This is used to validate values provided by users at runtime.
     */
    parseUserValue(userValue: unknown): UserValue | undefined {
        return this.#parent.application.parseUserValue(userValue);
    }

    /**
     * @private
     *
     * @see {@link TriggerNode#parseUserValue}
     *
     * Parse & filter an array of user values.
     */
    parseUserValues(userValues: unknown): (UserValue | undefined)[] {
        return this.#parent.application.parseUserValues(userValues);
    }

    /**
     * @private
     *
     * @see {@link TriggerNode#localize}
     *
     * It points directly to the path:
     * `<module-id>.<application-id>.<...path>`
     *
     * @returns undefined if no key exist at that path
     */
    rootLocalize(...args: LocalizeArgs): string | undefined {
        return this.#parent.application.localize(...args);
    }

    /**
     * @private
     *
     * custom data accessible accross the entire trigger
     */
    setContext<T>(key: string, value: T): T {
        return this.#parent.setContext(key, value);
    }

    /**
     * @private
     *
     * Set values for this node's custom outputs.
     *
     * @param slug of the custom outputs
     * @param values array where each entry represents one of the custom entries (same index order as seen in the node).
     *
     * @see {@link TriggerNode.defineCustomOutputs}
     */
    setCustomOutputValues(slug: TCustomOutputs, values: any[]): void {
        const outputs = this.#outputs.filter((output) => output.slug === slug);

        for (let i = 0; i < outputs.length; i++) {
            const output = outputs[i];
            this.#castAndSetOutputValue(output, values[i]);
        }
    }

    /**
     * @private
     *
     * Set the value for one of this node's outputs.
     *
     * @param output key of the `output` to set
     *
     * @see {@link TriggerNode.defineOutputs}
     */
    setOutputValue<K extends keyof TOutputs>(key: K, value: TOutputs[K]): void {
        const output = this.#outputs.get(key as string);
        if (output) {
            this.#castAndSetOutputValue(output, value);
        }
    }

    #castAndSetOutputValue(output: NodeEntry, value: any) {
        if (output.isArray) {
            this.#outputValues[output.key] = R.pipe(
                R.isArray(value) ? value : [value],
                R.map(output.castValue.bind(output)),
            );
        } else {
            value = R.isArray(value) ? value[0] : value;
            this.#outputValues[output.key] = output.castValue(value);
        }
    }

    async #resolve() {
        const trigger = this.#parent as OpenTrigger;

        const inputs: ResolvedNodeEntry[] = await Promise.all(
            this.#inputs.map(async ({ key, slug, type }): Promise<ResolvedNodeEntry> => {
                return {
                    key: slug ?? key,
                    type,
                    value: await this.getInputValue(key),
                };
            }),
        );

        const outputs = await Promise.all(
            this.#outputs.map(async ({ key, slug, type }): Promise<ResolvedNodeEntry> => {
                return {
                    key: slug ?? key,
                    type,
                    value: await this.#outputValues[key],
                };
            }),
        );

        trigger.addResolvedNode({ inputs, outputs, type: this.type } satisfies ResolvedTriggerNode);
    }
}

type TriggerNodePath = `${TriggerPath}:${string}`;

type TriggerNodeCustomOutput = {
    input: string | number | undefined;
    key: string;
    type: string;
};

type NodeEntries = {
    in: NodeBridge | null;
    inputs: Collection<string, OpenNodeEntry>;
    outputs: Collection<string, OpenNodeEntry>;
    outs: Collection<string, NodeBridge>;
};

export { TriggerNode };
export type { TriggerNodeCustomOutput, TriggerNodePath };
