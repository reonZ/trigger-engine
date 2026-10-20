import { IconObject } from "_zod";
import {
    BuiltinsCustomEntry,
    NodeOnCreateCustoms,
    NodeOnCreateData,
    PERSISTENT_COLLECTION_TYPE,
    SPECIAL_CATEGORY,
    TriggerNode,
} from "engine";
import { R, waitDialog } from "foundry-helpers";

class PersistentCollection extends TriggerNode<"out"> {
    #collection: unknown[] = [];

    static get category(): string {
        return SPECIAL_CATEGORY;
    }

    static get type(): string {
        return PERSISTENT_COLLECTION_TYPE;
    }

    static get defineCustomInputs(): BuiltinsCustomEntry[] {
        return [{ slug: "entry", hidden: true }];
    }

    static get defineCustomOutputs(): BuiltinsCustomEntry[] {
        return [{ slug: "collection", array: true, hidden: true }];
    }

    get headerColor(): ColorSource {
        return "#b07528";
    }

    get icon(): IconObject {
        return { unicode: "\ue197" };
    }

    static async _onCreate({ availableTypes }: NodeOnCreateData): Promise<NodeOnCreateCustoms | false> {
        const result = await waitDialog<{ type: string }>({
            content: "edit-entry",
            data: { types: R.sortBy(availableTypes, R.prop("label")) },
            i18n: R.join(["builtins.node", this.category, this.type, "dialog"], "."),
        });

        if (!result || !result.type) {
            return false;
        }

        return {
            inputs: {
                entry: {
                    type: result.type,
                },
            },
            outputs: {
                collection: {
                    isArray: true,
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

export { PersistentCollection };
