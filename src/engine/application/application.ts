import {
    _StartEventNode,
    BuiltInApplication,
    createCollection,
    createConvertorKey,
    EntryConvertor,
    getBuiltins,
    getTriggerPathData,
    instantiateHook,
    NodeEntry,
    OpenTrigger,
    RESERVED_NODE_CATEGORIES,
    RESERVED_NODE_TYPE,
    Trigger,
    TriggerApplicationCollection,
    TriggerApplicationCollections,
    TriggerData,
    TriggerDataInput,
    TriggerDataOutput,
    TriggerGateEntry,
    TriggerGateExit,
    TriggerGateReturn,
    TriggerHookWrapper,
    TriggerNode,
    TriggerPath,
    TriggerVariableGetter,
} from "engine";
import {
    arraysEqual,
    ImageFilePath,
    includesAny,
    localize,
    LocalizeArgs,
    LocalizeData,
    MODULE,
    purgeObject,
    R,
} from "foundry-helpers";
import { ExecuteEventQueryOptions, ExecuteTriggerQueryOptions } from "queries";
import { BlueprintApplication } from "triggers-menu";
import { SPECIAL_NODES } from "engine/builtins/nodes/specials";
import utils = foundry.utils;

const APPLICATION_MODES = ["setting", "free"] as const;

class TriggerApplication {
    static #instances: Collection<ApplicationKey, TriggerApplication> = new Collection();
    static #moduleTriggersPrepared = false;

    #applicationId: string;
    #applicationKey: ApplicationKey;
    #background: TriggerApplicationBackground;
    #convertors: Collection<string, EntryConvertor>;
    #customSettings?: ApplicationCustomSetting;
    #entries: Collection<string, typeof NodeEntry>;
    #events: Collection<string, typeof TriggerNode>;
    #hasAnyEntry: boolean;
    #hooks: { hook: TriggerHookWrapper; enabled: boolean }[];
    #mode: TriggerApplicationMode;
    #modulefiles: string[] = [];
    #moduleId: string;
    #moduleSources: TriggerDataInput[] = [];
    #nodes: Collection<string, typeof TriggerNode>;
    #settingsBlueprintApplication!: typeof BlueprintApplication;
    #triggerEvents: Record<string, { eventId: string; data: TriggerData }[]> = {};
    #triggers: Record<string, TriggerData> = {};

    constructor(moduleId: string, applicationId: string, options: TriggerApplicationOptions = {}) {
        this.#background = options.background ?? {
            alpha: 0.04,
            heightRatio: 0.25,
            src: MODULE.imagePath("trigger-engine", "webp"),
        };

        this.#mode = R.isIncludedIn(options.mode, APPLICATION_MODES) ? options.mode : "setting";
        this.#moduleId = moduleId;
        this.#applicationId = applicationId;
        this.#applicationKey = `${moduleId}:${applicationId}`;

        if (R.isArray(options.nodes)) {
            options.nodes = options.nodes.filter((node) => {
                return (
                    !R.isIncludedIn(node.category, RESERVED_NODE_CATEGORIES) &&
                    !R.isIncludedIn(node.type, RESERVED_NODE_TYPE)
                );
            });
        }

        // used to create a convertor on the fly for the `any` entry
        this.#hasAnyEntry =
            options.builtins === true ||
            options.builtins?.convertors === true ||
            !!options.builtins?.convertors?.some((key) => key.startsWith("any-") || key.endsWith("-any"));

        this.#convertors = createCollection(options, "convertors");
        this.#entries = createCollection(options, "entries");
        this.#nodes = createCollection(options, "nodes");

        // hooks
        this.#hooks = R.pipe(
            [
                ...(options.hooks ?? []), //
                ...getBuiltins(options, "hooks").map(([_type, hook]) => hook),
            ],
            R.map((HookCls) => {
                try {
                    const hook = instantiateHook(this, HookCls);
                    return { enabled: false, hook };
                } catch (error: any) {}
            }),
            R.filter(R.isTruthy),
        );

        // add mandatory stuff
        const MandatoryNodes = [
            TriggerGateEntry,
            TriggerGateExit,
            TriggerGateReturn,
            TriggerVariableGetter,
            ...R.values(SPECIAL_NODES),
        ];
        for (const Mandatory of MandatoryNodes) {
            this.#nodes.set(Mandatory.type, Mandatory as typeof TriggerNode);
        }

        // events
        this.#events = new Collection(
            R.map(
                this.#nodes.filter((node) => node.isEvent),
                (node) => [node.type, node] as const,
            ),
        );

        // if no event in the application, we add a default one
        if (!this.#events.size) {
            this.#events.set(_StartEventNode.type, _StartEventNode as typeof TriggerNode);
            this.#nodes.set(_StartEventNode.type, _StartEventNode as typeof TriggerNode);
        }

        // setup settings
        if (this.isSettingApplication) {
            const self = this;

            class SettingBlueprintApplication extends BlueprintApplication {
                get application(): TriggerApplication {
                    return self;
                }

                getTriggersSetting(): TriggersSetting {
                    return self.getTriggersSetting()!;
                }
            }

            this.#settingsBlueprintApplication = SettingBlueprintApplication;

            // the app use custom settings logic
            if (optionsHaveCustomSettings(options)) {
                this.#customSettings = options.setting;

                if (options.setting.menu) {
                    this.#setupSettingsMenu(R.isPlainObject(options.setting.menu) ? options.setting.menu : {});
                }
            } else {
                this.#setupSettings(options.setting as ApplicationMenuOptions);
            }
        }
    }

    static get instances(): Collection<string, TriggerApplication> {
        return this.#instances;
    }

    static getApplicationKey(moduleId: string, applicationId: string): ApplicationKey | undefined {
        if (
            !R.isString(moduleId) || //
            !R.isString(applicationId) ||
            !game.modules.get(moduleId)?.active
        )
            return;

        return `${moduleId}:${applicationId}`;
    }

    static register(
        moduleId: string,
        applicationId: string,
        options?: TriggerApplicationOptions,
    ): RegisteredApplication | undefined {
        const applicationKey = this.getApplicationKey(moduleId, applicationId);
        if (!applicationKey || this.instances.has(applicationKey)) return;

        const app = new TriggerApplication(moduleId, applicationId, options);
        this.instances.set(applicationKey, app);

        return {
            prepareTriggers: () => {
                app.prepare();
            },
        };
    }

    static registerGeneric() {
        if (this.instances.size > 1) return;
        if (this.instances.size === 1 && !this.getApplication("trigger-animations", "anim-trigger")) return;

        this.register(MODULE.id, `__${game.system.id}__`, {
            builtins: true,
            setting: {
                label: MODULE.path("__generic__.label"),
                hint: MODULE.path("__generic__.hint"),
                name: game.system.title,
            },
        });
    }

    static registerNodes(moduleId: string, applicationId: string, nodes: (typeof TriggerNode)[]) {
        const applicationKey = this.getApplicationKey(moduleId, applicationId);
        const app = applicationKey ? this.#instances.get(applicationKey) : undefined;
        if (!app) return;

        for (const node of nodes) {
            // we don't want third party to override existing nodes
            if (app.nodes.has(node.type)) continue;

            app.nodes.set(node.type, node);

            if (node.isEvent) {
                app.events.set(node.type, node);
            }
        }
    }

    static getApplication(moduleId: string, applicationId: string): TriggerApplication | undefined {
        const applicationKey = this.getApplicationKey(moduleId, applicationId);
        return applicationKey ? this.instances.get(applicationKey) : undefined;
    }

    static registerTriggers(moduleId: string, applicationId: string, triggersOrFilePath: string | TriggerDataInput[]) {
        const application = this.getApplication(moduleId, applicationId);
        if (!application) return;

        if (R.isString(triggersOrFilePath)) {
            application.addFile(triggersOrFilePath);
        } else if (R.isArray(triggersOrFilePath)) {
            application.addSources(triggersOrFilePath);
        }
    }

    static async openBlueprintMenu(moduleId: string, applicationId: string, source?: TriggerDataInput, ...args: any[]) {
        if (!this.#moduleTriggersPrepared) {
            localize.warning("application.await-modules");
            return;
        }

        const app = this.getApplication(moduleId, applicationId);
        return app?.openMenu(source, ...args);
    }

    static async prepareModulesTriggers(): Promise<void> {
        await Promise.all(this.instances.map((application) => application.prepareModuleTriggers()));
        TriggerApplication.#moduleTriggersPrepared = true;
    }

    static prepareApplications(): Promise<void[]> {
        return Promise.all(this.instances.map((application) => application.prepare()));
    }

    static async executeEvent(
        userId: string,
        applicationKey: ApplicationKey,
        event: string,
        args: Record<string, any> = {},
    ) {
        const [moduleId, applicationId] = R.split(applicationKey, ":");
        const application = this.getApplication(moduleId, applicationId);
        if (!application) return;

        return application?._executeEvent(userId, event, args);
    }

    static async executeTriggerEvent(
        userId: string,
        triggerPath: TriggerPath,
        event: string,
        args: Record<string, any> = {},
    ) {
        const { applicationId, moduleId, triggerId } = getTriggerPathData(triggerPath);
        const application = this.getApplication(moduleId, applicationId);
        if (!application) return;

        return application?._executeTriggerEvent(userId, triggerId, event, args);
    }

    get mode(): TriggerApplicationMode {
        return this.#mode;
    }

    get isSettingApplication(): boolean {
        return this.mode === "setting";
    }

    get isFreeApplication(): boolean {
        return this.mode === "free";
    }

    get applicationId(): string {
        return this.#applicationId;
    }

    get applicationKey(): ApplicationKey {
        return this.#applicationKey;
    }

    get moduleId(): string {
        return this.#moduleId;
    }

    get background(): TriggerApplicationBackground {
        return this.#background;
    }

    get customSettingsSetter(): ApplicationCustomSetting["set"] | undefined {
        return this.#customSettings?.set;
    }

    get settingMenuKey(): string {
        return `${this.applicationId}-menu`;
    }

    get settingKey(): `${string}-triggers` {
        return `${this.applicationId}-triggers`;
    }

    get localizePath(): string {
        return `${this.moduleId}.${this.applicationId}`;
    }

    get entries(): Collection<string, typeof NodeEntry> {
        return this.#entries;
    }

    get availableEntryTypes(): string[] {
        return this.entries.map((entry) => entry.type);
    }

    get nodes(): Collection<string, typeof TriggerNode> {
        return this.#nodes;
    }

    get events(): Collection<string, typeof TriggerNode> {
        return this.#events;
    }

    get hasMultipleEvents(): boolean {
        return this.events.size > 1;
    }

    get moduleSources(): TriggerDataInput[] {
        return this.#moduleSources;
    }

    async prepareModuleTriggers() {
        for (const path of this.#modulefiles) {
            try {
                const response = await fetch(path);
                const json = await response.json();
                const sources = R.isArray(json) ? (json as TriggerDataInput[]) : [];

                this.addSources(sources);
            } catch (error: any) {
                MODULE.error(`An error occured while retrieving the triggers file: ${path}`, error);
            }
        }
    }

    async prepare() {
        const startTime = performance.now();

        const settings = this.getTriggersSetting();
        if (!settings) return;

        const previousTriggers = this.#triggers;

        this.#triggers = {};
        this.#triggerEvents = {};

        // we add or update triggers if needed
        const updatedTriggers: string[] = [];

        const allSources = [
            ["module", this.moduleSources],
            ["world", settings.sources],
        ] as const;

        for (const [type, sources] of allSources) {
            for (const source of sources) {
                if (!filterSource(source)) continue;

                const exist = previousTriggers[source.id] as TriggerData | undefined;
                delete previousTriggers[source.id]; // the remaining IDs are of triggers that no longer exist

                if (
                    (type === "module" && !R.isIncludedIn(source.id, settings.enabled)) ||
                    (type === "world" && R.isIncludedIn(source.id, settings.disabled))
                )
                    continue; // not an enabled trigger so we skip

                if (exist && !diffTriggers(exist, source)) {
                    this.#triggers[source.id] = exist;
                    continue; // no update needed if no difference
                }

                updatedTriggers.push(source.id); // trigger has changed

                try {
                    const trigger = this.createTrigger(source);
                    if (trigger && !trigger.invalid) {
                        this.#triggers[source.id] = trigger.data;
                    }
                } catch (error) {}
            }
        }

        // we process
        const triggers = R.pipe(R.values(this.#triggers), R.sortBy([R.prop("priority"), "desc"]));

        const events: string[] = [];
        const otherNodes: string[] = [];

        for (const trigger of triggers) {
            for (const node of trigger.nodes) {
                if (this.events.has(node.type)) {
                    this.#triggerEvents[node.type] ??= [];
                    this.#triggerEvents[node.type].push({
                        data: trigger,
                        eventId: node.id,
                    });
                    events.push(node.type);
                } else {
                    otherNodes.push(node.type);
                }
            }
        }

        const preparedSources = triggers.map((trigger) => trigger.toObject());

        MODULE.group(this.applicationKey);
        MODULE.debug("PREPARE HOOKS:");
        for (const hookData of this.#hooks) {
            const hook = hookData.hook;
            const wantedEvents = hook.events;
            const wantedOtherNodes = hook.otherNodes;
            const hookName = hook.name;

            // previously enabled hooks are disabled
            if (hookData.enabled) {
                hook._disable();
                hookData.enabled = false;
            }

            const canEnable = !hook.gmOnly || game.user.isGM;

            if (canEnable && R.isArray(wantedEvents) && includesAny(events, wantedEvents)) {
                MODULE.debug("[ENABLED]  ", hookName);
                hook._enable(preparedSources);
                hookData.enabled = true;
            } else if (canEnable && R.isArray(wantedOtherNodes) && includesAny(otherNodes, wantedOtherNodes)) {
                MODULE.debug("[LISTENING]", hookName);
                hook._listen(preparedSources);
                hookData.enabled = true;
            } else {
                MODULE.debug("[DISABLED] ", hookName);
            }
        }
        MODULE.debug("TRIGGERS:", triggers);
        MODULE.debug("APPLICATION:", this);

        if (this.#customSettings?.afterPrepared) {
            await this.#customSettings.afterPrepared(preparedSources);
        }

        const endTime = performance.now();
        MODULE.debug("PERFORMANCE (ms):", endTime - startTime);

        MODULE.groupEnd();

        // we refresh the app on this client if it is opened
        const blueprint = this.getMenuApplication()?.blueprint;
        if (blueprint) {
            blueprint.resetTriggers(foundry.utils.deepClone(settings), R.keys(previousTriggers), updatedTriggers);
            blueprint.draw({ forceComputeConnections: true, renderApplication: true });
        }
    }

    addFile(path: string) {
        this.#modulefiles.push(path);
    }

    addSources(sources: TriggerDataInput[]) {
        this.#moduleSources.push(...sources);
    }

    parseUserValue(userValue: unknown): UserValue | undefined {
        if (!isUserValue(userValue)) return;

        const entry = this.entries.get(userValue.type);
        if (!entry) return;

        const parseValue = (value: any) => {
            const casted = entry.castValue(value);
            return entry.isValidType(casted) ? foundry.utils.deepClone(value) : undefined;
        };

        const value = R.isArray(userValue.value)
            ? R.map(userValue.value, parseValue)
            : (parseValue(userValue.value) ?? entry.default);

        return { type: userValue.type, value };
    }

    parseUserValues(userValues: unknown): (UserValue | undefined)[] {
        return R.isArray(userValues) ? userValues.map((value) => this.parseUserValue(value)) : [];
    }

    convertToEmitable(type: string, value: any): JSONValue | undefined {
        const entry = this.entries.get(type);
        if (!entry) return;

        const convert = (value: unknown) => (entry.isValidType(value) ? entry.toJSON(value) : undefined);
        return R.isArray(value) ? value.map((x) => convert(x)) : convert(value);
    }

    convertValueToEmitable(entry: unknown, parse?: boolean): UserValue | undefined {
        if (!isUserValue(entry)) return;

        const parsed = parse ? this.parseUserValue(entry) : entry;
        const converted = parsed && this.convertToEmitable(parsed.type, parsed.value);
        return converted ? { type: parsed.type, value: converted } : undefined;
    }

    convertValuesToEmitable(values: unknown[] | ReadonlyArray<unknown>, parse?: boolean): (UserValue | undefined)[] {
        return values.map((entry) => this.convertValueToEmitable(entry, parse));
    }

    convertObjectToEmitable<T extends string>(
        obj: Record<T, unknown>,
        conversionTypes: PartialRecord<T, string>,
        userValueEntries: Partial<T>[],
        parseUserValues?: boolean,
    ): Record<T, unknown> {
        const returnedObj = {} as Record<T, unknown>;

        for (const [key, entry] of R.entries(obj)) {
            const type = conversionTypes[key];

            if (type) {
                returnedObj[key] = this.convertToEmitable(type, entry);
            } else if (userValueEntries.includes(key)) {
                returnedObj[key] = R.isArray(entry)
                    ? this.convertValuesToEmitable(entry, parseUserValues)
                    : this.convertValueToEmitable(entry, parseUserValues);
            } else {
                returnedObj[key] = entry;
            }
        }

        return returnedObj;
    }

    async convertFromEmitable(type: string, value: unknown, withType?: boolean): Promise<any> {
        if (!value) return;

        const entry = this.entries.get(type);
        if (!entry) return;

        const convertedValue = R.isArray(value)
            ? await Promise.all(value.map((x) => entry.fromJSON(x as JSONValue)))
            : await entry.fromJSON(value);

        return withType ? { type, value: convertedValue } : convertedValue;
    }

    convertValueFromEmitable(entry: unknown, withType?: boolean): Promise<any> | undefined {
        return isUserValue(entry) ? this.convertFromEmitable(entry.type, entry.value, withType) : undefined;
    }

    async convertValuesFomEmitable(
        values: unknown[] | ReadonlyArray<unknown>,
        withType?: boolean,
    ): Promise<(UserValue | undefined)[]> {
        return Promise.all(values.map((value) => this.convertValueFromEmitable(value, withType)));
    }

    async convertObjectFromEmitable<T extends string>(
        obj: Record<T, unknown>,
        conversionTypes: PartialRecord<T, string>,
        userValueEntries: Partial<T>[],
        withType?: boolean,
    ): Promise<Record<T, unknown>> {
        const returnedObj = {} as Record<T, unknown>;

        for (const [key, entry] of R.entries(obj)) {
            const type = conversionTypes[key];

            if (type) {
                returnedObj[key] = await this.convertFromEmitable(type, entry, withType);
            } else if (userValueEntries.includes(key)) {
                returnedObj[key] = R.isArray(entry)
                    ? await this.convertValuesFomEmitable(entry, withType)
                    : await this.convertValueFromEmitable(entry, withType);
            } else {
                returnedObj[key] = entry;
            }
        }

        return returnedObj;
    }

    async executeEvent(eventName: string, args: Record<string, any>) {
        return await this._executeEvent(game.userId, eventName, args);
    }

    async executeTriggerEvent(triggerId: string, eventName: string, args: Record<string, any>) {
        return await this._executeTriggerEvent(game.userId, triggerId, eventName, args);
    }

    async executeEventAsGM(eventName: string, args: Record<string, any> = {}) {
        const queryArgs: ExecuteEventQueryOptions = {
            _type: "execute-event",
            applicationKey: this.applicationKey,
            args,
            eventName,
            userId: game.userId,
        };

        return await game.users.activeGM?.query(MODULE.path("user-query"), queryArgs);
    }

    async executeTriggerEventAsGM(
        triggerId: string,
        eventName: string,
        args: Record<string, any> = {},
    ): Promise<unknown> {
        const queryArgs: ExecuteTriggerQueryOptions = {
            _type: "execute-trigger",
            args,
            eventName,
            triggerPath: `${this.applicationKey}:${triggerId}`,
            userId: game.userId,
        };

        return game.users.activeGM?.query(MODULE.path("user-query"), queryArgs);
    }

    localize(...args: LocalizeArgs): string | undefined {
        const data = R.isObjectType(args.at(-1)) ? (args.pop() as LocalizeData) : undefined;

        for (const applicationPath of [this.localizePath, BuiltInApplication.localizePath]) {
            const path = R.join([applicationPath, ...(args as string[])], ".");
            if (!game.i18n.has(path, true)) continue;
            return R.isObjectType(data) ? game.i18n.format(path, data) : game.i18n.localize(path);
        }
    }

    getMenuApplication(): Maybe<BlueprintApplication> {
        const menuId = BlueprintApplication.APPLICATION_ID;
        return foundry.applications.instances.get(menuId) as Maybe<BlueprintApplication>;
    }

    async openMenu(source?: TriggerDataInput, ...args: any[]) {
        if (this instanceof BuiltInApplication) return null;

        const exist = this.getMenuApplication();

        if (exist?.application === this && (!source || this.isSettingApplication)) {
            return exist.expandWindow();
        } else {
            await exist?.close();
        }

        if (this.isFreeApplication) {
            return this.#openFreeApplication(source, ...args);
        } else {
            return this.#openSettingApplication();
        }
    }

    createTrigger(source: TriggerDataInput, open: { locked?: boolean }): OpenTrigger | null;
    createTrigger(source: TriggerDataInput, open?: { locked?: boolean }): Trigger | null;
    createTrigger(source: TriggerDataInput, open?: { locked?: boolean }): OpenTrigger | Trigger | null {
        try {
            const data = new TriggerData(source);
            return open ? new OpenTrigger(this, data, open.locked) : new Trigger(this, data);
        } catch (error: any) {
            MODULE.error(`an error concurred while trying to create a Trigger.`, error);
            return null;
        }
    }

    getConvertor(output: string, input: string): EntryConvertor | undefined {
        // we generate an `any` convertor on the fly
        if (this.#hasAnyEntry && (output === "any" || input === "any")) {
            return {
                output,
                input,
                convertToInput: (value: any) => {
                    return value;
                },
            };
        }

        const key = createConvertorKey(output, input);
        return this.#convertors.get(key);
    }

    getTriggersSetting(): TriggersSetting | undefined {
        if (!this.isSettingApplication) return;

        const customSettingsGetter = this.#customSettings?.get;
        const setting = customSettingsGetter
            ? customSettingsGetter()
            : (game.settings.get(this.moduleId, this.settingKey) as Partial<TriggersSetting>);

        return {
            disabled: setting.disabled?.slice() ?? [],
            enabled: setting.enabled?.slice() ?? [],
            folders: utils.deepClone(setting.folders) ?? {},
            sources: utils.deepClone(setting?.sources ?? []),
        };
    }

    async _executeEvent(userId: string, event: string, args: Record<string, any>) {
        const triggers = this.#triggerEvents[event];
        if (!triggers?.length) return;

        for (const { data, eventId } of triggers) {
            await this.#execute(userId, data, eventId, args);
        }
    }

    async _executeTriggerEvent(userId: string, triggerId: string, event: string, args: Record<string, any>) {
        const trigger = this.#triggerEvents[event]?.find(({ data }) => data.id === triggerId);
        if (!trigger) return;

        const { data, eventId } = trigger;
        await this.#execute(userId, data, eventId, args);
    }

    async #openSettingApplication(): Promise<BlueprintApplication> {
        return new this.#settingsBlueprintApplication().render(true);
    }

    #openFreeApplication(source?: TriggerDataInput, ...args: any[]): Promise<OpenTrigger> {
        const self = this;
        const test = this.createTrigger(R.isPlainObject(source) ? source : {}, {});
        const triggerSource: TriggerDataOutput =
            test && !test.invalid ? test.toObject() : new TriggerData({}).toObject();

        return new Promise((resolve: FreeApplicationResolve) => {
            class FreeBlueprintApplication extends BlueprintApplication {
                get application(): TriggerApplication {
                    return self;
                }

                async resolve() {
                    const resolved = await this.blueprint.trigger?.resolve(...args);
                    resolve(resolved);
                }

                getTriggersSetting(): TriggersSetting {
                    return {
                        disabled: [],
                        enabled: [],
                        folders: {},
                        sources: [triggerSource],
                    };
                }
            }

            new FreeBlueprintApplication().render(true);
        });
    }

    async #execute(userId: string, data: TriggerData, eventId: string, args: Record<string, any>) {
        try {
            const trigger = new Trigger(this, data, userId);
            const node = trigger.getNode(eventId);
            if (!node) return;

            MODULE.debug("Execute Trigger", trigger);

            // we clone the args to avoid miss-handling downstream
            const clonedArgs = foundry.utils.deepClone(args);
            await node._execute(clonedArgs);
        } catch (error: any) {
            const id = `${this.applicationKey}:${data.id}:${eventId}`;
            MODULE.error(`an error occurred while executing the event: ${id}`, error);
        }
    }

    #setupSettings(options: ApplicationMenuOptions = {}) {
        const settingKey = this.settingKey;

        game.settings.register(this.moduleId, settingKey, {
            type: Object,
            default: {},
            scope: "world",
            config: false,
            name: settingKey,
            onChange: () => {
                this.prepare();
            },
        });

        this.#setupSettingsMenu({ ...options, restricted: true });
    }

    #setupSettingsMenu({
        hint,
        icon,
        label,
        name,
        restricted = true,
    }: ApplicationMenuOptions & { restricted?: boolean }) {
        const moduleId = this.moduleId;
        const applicationId = this.applicationId;

        const settingPath = (...path: string[]): string => {
            return `${moduleId}.${applicationId}.setting.${path.join(".")}`;
        };

        game.settings.registerMenu(moduleId, this.settingMenuKey, {
            name: name ?? settingPath("name"),
            label: label ?? settingPath("label"),
            hint: hint ?? settingPath("hint"),
            icon: icon ?? "fas fa-cogs",
            restricted,
            type: this.#settingsBlueprintApplication,
        });
    }
}

function objectDifferentFrom(obj: object, against: object): boolean {
    const diff = foundry.utils.diffObject(obj, against, { bidirectional: true });
    return !foundry.utils.isEmpty(diff);
}

function diffTriggers(data: TriggerData, source: TriggerDataInput): boolean {
    for (const [property, previousData] of R.entries(data.toObject())) {
        const previousValue = purgeObject(previousData);

        if (property === "tags") {
            const newValue = source.tags ?? [];
            if (!arraysEqual(previousValue, newValue)) return true;
        } else if (property === "nodes") {
            const newValue = source.nodes ?? [];
            if (objectDifferentFrom(newValue, previousValue)) return true;
        } else if (property === "variables") {
            const newValue = source.variables ?? {};
            if (objectDifferentFrom(newValue, previousValue)) return true;
        } else {
            const rawNewValue = source[property];
            const newValue = R.isString(previousValue)
                ? (rawNewValue ?? "")
                : R.isNumber(previousValue)
                  ? (rawNewValue ?? 0)
                  : (rawNewValue ?? {});

            if (previousValue !== newValue) return true;
        }
    }

    return false;
}

function filterSource(source: unknown): source is WithRequired<TriggerDataInput, "id"> {
    return R.isObjectType(source) && "id" in source;
}

function optionsHaveCustomSettings(
    options: TriggerApplicationOptions,
): options is Omit<TriggerApplicationOptions, "setting"> & { setting: ApplicationCustomSetting } {
    return (
        R.isPlainObject(options.setting) &&
        R.isFunction((options.setting as ApplicationCustomSetting).get) &&
        R.isFunction((options.setting as ApplicationCustomSetting).set)
    );
}

function isUserValue(entry: unknown): entry is UserValue {
    return R.isPlainObject(entry) && R.isString(entry.type);
}

type FreeApplicationResolve = (value: any) => void;

type ApplicationParentType = "setting" | "document";

type TriggerApplicationOptions = TriggerApplicationCollections & {
    background?: TriggerApplicationBackground;
    builtins?: BuiltInOptions | true;
    mode?: TriggerApplicationMode;
    setting?: ApplicationSettingOptions;
};

type TriggerApplicationBackground = {
    alpha?: number;
    /** Scales the provided image to occupy a percentage of the blueprint's height. */
    heightRatio?: number;
    src: ImageFilePath;
};

type BuiltInOptions = {
    [k in TriggerApplicationCollection]?: true | (typeof BuiltInApplication)[k][number][0][];
};

type ApplicationSettingOptions = ApplicationMenuOptions | ApplicationCustomSetting;

type ApplicationCustomSetting = {
    afterPrepared?: (data: TriggerDataInput[]) => Promise<void>;
    menu?: boolean | (ApplicationMenuOptions & { restricted?: boolean });
    get: () => Partial<TriggersSetting>;
    set: (data: TriggersSetting, prepareTriggers: () => void) => Promise<void>;
};

type RegisteredApplication = {
    prepareTriggers: () => void;
};

type ApplicationMenuOptions = {
    hint?: string;
    icon?: string;
    label?: string;
    name?: string;
};

type TriggersSetting = {
    disabled: string[];
    enabled: string[];
    folders: Record<string, string>;
    sources: TriggerDataInput[];
};

type TriggerApplicationMode = (typeof APPLICATION_MODES)[number] | "builtin";

type ApplicationKey = `${string}:${string}`;

type UserValue = {
    type: string;
    value: any;
};

export { TriggerApplication };
export type { ApplicationKey, ApplicationParentType, TriggerApplicationOptions, TriggersSetting, UserValue };
