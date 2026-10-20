import { zDocument, zDocumentId } from "_zod";
import { zCustomInputData, zCustomOutData, zCustomOutputData, zEntryDataSchema } from "engine";
import { z, zPoint } from "foundry-helpers";

class NodeData extends zDocument<NodeDataSchema> {
    static get defineSchema() {
        return zNodeDataSchema;
    }
}

interface NodeData extends z.output<NodeDataSchema> {
    readonly _source: NodeDataInput;
}

const zNodeCustoms = z.object({
    title: z.string().optional(),
    inputs: z.record(z.string().trim().min(1), zCustomInputData).default(() => ({})),
    outputs: z.record(z.string().trim().min(1), zCustomOutputData).default(() => ({})),
    outs: z.record(z.string().trim().min(1), zCustomOutData).default(() => ({})),
});

const zNodeDataSchema = z.object({
    custom: zNodeCustoms.default(() => ({ outs: {}, inputs: {}, outputs: {} })),
    id: zDocumentId,
    inputs: zEntryDataSchema,
    outs: zEntryDataSchema,
    position: zPoint(),
    state: z.string().trim().optional(),
    type: z.string().trim().readonly(),
});

type NodeCustomsData = z.output<typeof zNodeCustoms>;

type NodeDataInput = z.input<NodeDataSchema>;
type NodeDataOutput = z.output<NodeDataSchema>;

type NodeDataSchema = typeof zNodeDataSchema;

type CreateNodeData = z.input<NodeDataSchema>;

export { NodeData, zNodeDataSchema };
export type { CreateNodeData, NodeCustomsData, NodeDataInput, NodeDataOutput, NodeDataSchema };
