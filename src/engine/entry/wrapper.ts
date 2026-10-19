import { zForceSafeParse } from "_zod";
import {
    BaseEntrySchemaOutput,
    NodeData,
    NodeEntry,
    NodeField,
    OpenTrigger,
    OpenTriggerNode,
    Trigger,
    TriggerNode,
} from "engine";
import { R, z } from "foundry-helpers";
import { EntryCategory } from "triggers-menu";

const _cachedFields = new Map<string, z.ZodType>();

function getFieldSchema(EntryCls: typeof NodeEntry): z.ZodType {
    const exist = _cachedFields.get(EntryCls.type);
    if (exist) return exist;

    const jsonSchema = EntryCls.FieldClass?.defineSchema;
    let fieldSchema = z.fromJSONSchema({ type: "object", properties: jsonSchema }) as z.ZodObject;

    const looseNumbers = R.pipe(
        jsonSchema ?? {},
        R.entries(),
        R.filter(([_key, value]) => value.type === "number" && value.const === null),
        R.map(([key]) => key),
    );

    if (looseNumbers.length) {
        const zLooseNumber = z.union([z.number(), z.literal(-Infinity), z.literal(Infinity)]);
        fieldSchema = fieldSchema.extend(R.fromKeys(looseNumbers, () => zLooseNumber));
    }

    _cachedFields.set(EntryCls.type, fieldSchema);
    return fieldSchema;
}

function instantiateEntry(
    trigger: OpenTrigger,
    parent: OpenTriggerNode,
    category: EntryCategory,
    entrySchema: BaseEntrySchemaOutput,
    nodeData: NodeData,
    open: true,
): OpenNodeEntry | undefined;
function instantiateEntry(
    trigger: Trigger,
    parent: TriggerNode,
    category: EntryCategory,
    entrySchema: BaseEntrySchemaOutput,
    nodeData: NodeData,
    open: boolean,
): NodeEntry | undefined;
function instantiateEntry(
    trigger: Trigger,
    parent: TriggerNode,
    category: EntryCategory,
    entrySchema: BaseEntrySchemaOutput,
    nodeData: NodeData,
): NodeEntry | OpenNodeEntry | undefined {
    let EntryCls = trigger.application.entries.get(entrySchema.type) as typeof NodeEntry;
    if (!EntryCls) return;

    let entryField: Record<string, any> = {};

    if (category === "inputs" && !entrySchema.isArray) {
        try {
            const FieldCls = EntryCls.FieldClass;

            if (FieldCls && !(FieldCls.prototype instanceof NodeField)) {
                throw new Error("invalid 'FieldCls' type.");
            }

            if (parent.isEvent && !FieldCls) {
                throw new Error("event nodes can only have inputs with a field.");
            }

            const jsonSchema = EntryCls.FieldClass?.defineSchema;
            if (jsonSchema) {
                const fieldSchema = getFieldSchema(EntryCls);
                const data = "field" in entrySchema && R.isPlainObject(entrySchema.field) ? entrySchema.field : {};

                entryField = zForceSafeParse(fieldSchema, data) as any;
            }
        } catch (error) {}
    }

    return new EntryCls(parent, category, nodeData, entrySchema, entryField);
}

interface OpenNodeEntry extends NodeEntry {}

export { instantiateEntry };
export type { OpenNodeEntry };
