import { IconObject } from "_zod";
import { BuiltinsCustomEntry, NodeOnCreateCustoms, NodeOnCreateData, PERSISTENT_COLLECTION_TYPE } from "engine";
import { R } from "foundry-helpers";
import { BaseSpecialNode } from ".";

class PersistentCollectionSpecialNode extends BaseSpecialNode<"out", Inputs, Outputs> {
    #collection: unknown[] = [];

    static get type(): string {
        return PERSISTENT_COLLECTION_TYPE;
    }

    static get defineCustomInputs(): BuiltinsCustomEntry[] {
        return [{ slug: "entry", hidden: true }];
    }

    static get defineCustomOutputs(): BuiltinsCustomEntry[] {
        return [{ slug: "collection", array: true, hidden: true }];
    }

    get icon(): IconObject {
        return { unicode: "\ue197" };
    }

    static async _onCreate(data: NodeOnCreateData): Promise<NodeOnCreateCustoms | false> {
        const result = await this.simpleTypeDialog(data);
        if (!result || !result.type) return false;

        return {
            inputs: {
                entry: {
                    slug: "entry",
                    type: result.type,
                },
            },
            outputs: {
                collection: {
                    isArray: true,
                    slug: "collection",
                    type: result.type,
                },
            },
        };
    }

    async _execute(): Promise<boolean> {
        const entry = await this.getInputValue("entry");

        if (R.isNonNullish(entry)) {
            this.#collection.push(entry);
            this.setOutputValue("collection", this.#collection);
        }

        return this.executeNext("out");
    }
}

type Inputs = {
    entry: unknown;
};

type Outputs = {
    collection: unknown;
};

export { PersistentCollectionSpecialNode };
