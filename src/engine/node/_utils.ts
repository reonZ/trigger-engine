import {
    BaseCustomData,
    BaseCustomEntryData,
    BaseCustomEntrySchema,
    BaseEntrySchemaInput,
    BridgeSchemaInput,
    BridgeSchemaOutput,
    CustomInputSchema,
    InputEntrySchema,
    NodeData,
    OutputEntrySchema,
    TriggerNode,
    zBaseEntrySchema,
    zCustomInputSchema,
    zCustomOutputSchema,
    zCustomOutSchema,
    zNodeBridgeSchema,
    zNodeInputSchema,
    zNodeOutputSchema,
} from "engine";
import { R, z } from "foundry-helpers";

const _cached = {
    inputs: new Map<`${string}:${string}`, InputEntrySchema[]>(),
    outputs: new Map<`${string}:${string}`, OutputEntrySchema[]>(),
    outs: new Map<`${string}:${string}`, BridgeSchemaOutput[]>(),
};

type CachedType = keyof typeof _cached;
type CachedValue<T extends CachedType> = (typeof _cached)[T] extends Map<`${string}:${string}`, infer v> ? v : never;

function parseSchemasByState<T extends keyof typeof _cached>(
    type: T,
    NodeCls: typeof TriggerNode,
    schemas: (BaseEntrySchemaInput | BridgeSchemaInput)[],
    parser: z.ZodObject,
    options: SchemasFilterOptions = {},
): CachedValue<T> {
    const key = `${NodeCls.type}:${options.state ?? ""}` as const;
    const exist = _cached[type].get(key) as CachedValue<T> | undefined;
    if (exist) return exist;

    const filtered = filterSchemasByState(schemas, options);
    const parsed = parseSchemas(filtered, parser);

    _cached[type].set(key, parsed);
    return parsed;
}

function filterSchemasByState<T extends { state?: string | string[] }>(
    schemas: T[],
    { state }: { state?: string | null } = {},
): T[] {
    return state
        ? schemas.filter((schema) => {
              const schemaStates = R.isString(schema.state) ? [schema.state] : schema.state;
              return !schemaStates?.length || R.isIncludedIn(state, schemaStates);
          })
        : schemas;
}

function parseSchemas(schemas: (BaseEntrySchemaInput | BridgeSchemaInput)[], parser: z.ZodObject) {
    return R.pipe(
        schemas,
        R.map((schema) => parser.safeParse(schema)?.data),
        R.filter(R.isTruthy),
    ) as any;
}

function filterByCustomSchemas<
    TParser extends z.ZodObject<{ slug: z.ZodString }>,
    TEntry extends BaseCustomData,
    TReturnSchema extends BaseEntrySchemaInput | BridgeSchemaInput,
    TSchema extends z.output<TParser> = z.output<TParser>,
>(
    rawSchemas: z.input<TParser>[] | null,
    schemaParser: TParser,
    customEntries: Record<string, TEntry> | undefined = {},
    callback: (schema: TSchema, entry: TEntry) => TReturnSchema,
): TReturnSchema[] {
    const entries = R.values(customEntries);

    if (!entries.length) {
        return [];
    }

    const customSchemas = R.pipe(
        rawSchemas ?? [],
        R.map((schema): TSchema | undefined => {
            const data = schemaParser.safeParse(schema)?.data as TSchema | undefined;
            return data ? { ...data, field: (schema as CustomInputSchema).field } : undefined;
        }),
        R.filter(R.isTruthy),
        R.indexBy((entry) => entry.slug),
    ) as Record<string, TSchema>;

    return R.pipe(
        entries,
        R.map((entry) => {
            const schema = customSchemas[entry.slug];
            return schema && callback(schema, entry);
        }),
        R.filter(R.isTruthy),
    );
}

function getOutsSchemas(NodeCls: typeof TriggerNode, options?: SchemasFilterOptions): BridgeSchemaOutput[] {
    const parser = zNodeBridgeSchema;
    const schemas = NodeCls.isEvent ? [{ key: "out" }] : (NodeCls.defineOuts ?? []);
    const parsed = parseSchemasByState("outs", NodeCls, schemas, parser, options);
    if (!options?.data) return parsed;

    const filtered = filterByCustomSchemas(
        NodeCls.defineCustomOuts,
        zCustomOutSchema,
        options.data.custom.outs,
        (_, entry): Omit<BridgeSchemaOutput, "tooltip"> => {
            return {
                input: entry.input,
                key: entry.id,
                label: entry.label,
                slug: entry.slug,
                spacing: 0,
            };
        },
    );

    return [...parsed, ...parseSchemas(filtered, parser)];
}

function getEntrySchemas(
    type: "inputs" | "outputs",
    NodeCls: typeof TriggerNode,
    schemas: BaseEntrySchemaInput[] | null,
    parser: z.ZodObject,
    options: SchemasFilterOptions = {},
    custom: {
        entries: Record<string, BaseCustomEntryData> | undefined;
        rawSchemas: BaseCustomEntrySchema[] | null;
        schemaParser: typeof zBaseEntrySchema;
    },
) {
    const parsed = parseSchemasByState(type, NodeCls, schemas ?? [], parser, options);
    if (!options?.data) return parsed;

    const filtered = filterByCustomSchemas(custom.rawSchemas, custom.schemaParser, custom.entries, (schema, entry) => {
        return {
            field: (schema as CustomInputSchema).field,
            group: schema.group,
            input: entry.input,
            isArray: entry.isArray,
            key: entry.id,
            label: entry.label,
            slug: entry.slug,
            tooltip: schema.tooltip,
            type: entry.type,
        };
    });

    return [...parsed, ...parseSchemas(filtered, parser)];
}

function getInputsSchemas(NodeCls: typeof TriggerNode, options?: SchemasFilterOptions): InputEntrySchema[] {
    return getEntrySchemas("inputs", NodeCls, NodeCls.defineInputs, zNodeInputSchema, options, {
        entries: options?.data?.custom.inputs,
        rawSchemas: NodeCls.defineCustomInputs,
        schemaParser: zCustomInputSchema,
    });
}

function getOutputsSchemas(NodeCls: typeof TriggerNode, options?: SchemasFilterOptions): OutputEntrySchema[] {
    return getEntrySchemas("outputs", NodeCls, NodeCls.defineOutputs, zNodeOutputSchema, options, {
        entries: options?.data?.custom.outputs,
        rawSchemas: NodeCls.defineCustomOutputs,
        schemaParser: zCustomOutputSchema,
    });
}

function getNodeStates(NodeCls: typeof TriggerNode): string[] | null {
    if (!R.isArray(NodeCls.states)) return null;

    const rawStates = NodeCls.states.filter((state) => R.isString(state));
    return rawStates.length >= 2 ? rawStates : null;
}

type SchemasFilterOptions = {
    state?: string | null;
    data?: NodeData;
};

export { getInputsSchemas, getNodeStates, getOutputsSchemas, getOutsSchemas };
