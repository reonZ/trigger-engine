import { BaseBooleanLogicNode, BuiltinsInputEntry } from "engine";
import { localize } from "foundry-helpers";

const COMPARE_ENTRIES = ["eq", "gt", "gte", "lt", "lte", "diff"] as const;

class CompareNumbersLogicNode extends BaseBooleanLogicNode<Inputs> {
    static #compareOptions: { value: string; label: string }[];

    static get type(): "compare-numbers" {
        return "compare-numbers";
    }

    static get tags(): string[] {
        return ["number"];
    }

    static get compareOptions() {
        return (this.#compareOptions ??= COMPARE_ENTRIES.map((value) => {
            return {
                value,
                label: localize.path("builtins.node", this.category, this.type, "inputs.compare.options", value),
            };
        }));
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            { key: "a", type: "number" },
            {
                key: "compare",
                type: "text",
                tooltip: false,
                field: {
                    type: "select",
                    options: this.compareOptions,
                    connector: false,
                    width: 162,
                },
            },
            { key: "b", type: "number" },
        ];
    }

    static compareNumbers(entryA: number, entryB: number, compare: CompareEntry): boolean {
        switch (compare) {
            case "diff":
                return entryA !== entryB;
            case "eq":
                return entryA === entryB;
            case "gt":
                return entryA > entryB;
            case "gte":
                return entryA >= entryB;
            case "lt":
                return entryA < entryB;
            case "lte":
                return entryA <= entryB;
            default:
                return false;
        }
    }

    async _execute(): Promise<boolean> {
        const entryA = await this.getInputValue("a");
        const entryB = await this.getInputValue("b");
        const compare = await this.getInputValue("compare");
        const result = CompareNumbersLogicNode.compareNumbers(entryA, entryB, compare);

        return this.executeNextIf(result);
    }
}

type Inputs = {
    a: number;
    b: number;
    compare: CompareEntry;
};

type CompareEntry = (typeof COMPARE_ENTRIES)[number];

export { CompareNumbersLogicNode };
export type { CompareEntry };
