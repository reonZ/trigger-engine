import { IconObject } from "_zod";
import {
    BuiltinsCustomEntry,
    BuiltinsInputEntry,
    NodeOnCreateCustoms,
    NodeOnCreateData,
    SELECT_INDEX_TYPE,
} from "engine";
import { BaseSpecialNode } from ".";

class SelectIndexSpecialNode extends BaseSpecialNode<"out", Inputs, Outputs> {
    static get type(): string {
        return SELECT_INDEX_TYPE;
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            {
                key: "index",
                type: "number",
                field: { step: 1 },
            },
            { key: "first", type: "boolean" },
            { key: "last", type: "boolean" },
        ];
    }

    static get defineCustomInputs(): BuiltinsCustomEntry[] {
        return [{ slug: "list", array: true, hidden: true }];
    }

    static get defineCustomOutputs(): BuiltinsCustomEntry[] {
        return [{ slug: "entry", hidden: true }];
    }

    get icon(): IconObject {
        return { unicode: "\uf03a" };
    }

    static async _onCreate(data: NodeOnCreateData): Promise<NodeOnCreateCustoms | false> {
        const result = await this.simpleTypeDialog(data);
        if (!result || !result.type) return false;

        return {
            inputs: {
                list: {
                    isArray: true,
                    slug: "list",
                    type: result.type,
                },
            },
            outputs: {
                entry: {
                    slug: "entry",
                    type: result.type,
                },
            },
        };
    }

    async _execute(): Promise<boolean> {
        const list = await this.getInputValue("list");
        console.log(list);

        if (!list.length) {
            return this.executeNext("out");
        }

        const first = await this.getInputValue("first");
        const last = await this.getInputValue("last");
        const index = Math.clamp(
            await this.getInputValue("index"),
            first ? 0 : -Infinity,
            last ? list.length - 1 : Infinity,
        );

        this.setOutputValue("entry", list[index]);
        return this.executeNext("out");
    }
}

type Inputs = {
    first: boolean;
    index: number;
    last: boolean;
    list: unknown[];
};

type Outputs = {
    entry: unknown;
};

export { SelectIndexSpecialNode };
