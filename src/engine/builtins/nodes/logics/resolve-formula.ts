import { BaseLogicNode, BuiltinsCustomEntry, BuiltinsInputEntry, BuiltinsOutputEntry } from "engine";
import { localize, R } from "foundry-helpers";

class ResolveFormulaLogicNode extends BaseLogicNode<"out", Inputs, Outputs, CustomInputs, never, States> {
    static get type(): "resolve-formula" {
        return "resolve-formula";
    }

    static get tags(): string[] {
        return ["number"];
    }

    static get states(): string[] {
        return ["value", "formula"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            {
                key: "formula",
                type: "text",
                tooltip: localize.path("builtins.shared.variables.tooltip"),
            },
        ];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [
            { key: "formula", type: "text", state: "formula" },
            { key: "value", type: "number", state: "value" },
        ];
    }

    static get defineCustomInputs(): BuiltinsCustomEntry[] {
        return R.map(
            [
                ["variable", "number"],
                ["actor", "target"],
                ["item", "item"],
            ] as const,
            ([slug, type]) => {
                return {
                    slug,
                    array: false,
                    types: [type],
                    input: {
                        replaceLabel: true,
                        validation: "^[a-z]+$",
                    },
                };
            },
        );
    }

    async _execute(): Promise<boolean> {
        let formula = await this.getInputValue("formula");

        if (!formula) {
            return this.executeNext("out");
        }

        const variables = await this.getCustomInputs("variable");

        for (const { label, value } of variables) {
            const regex = new RegExp(`@${label}`, "gm");
            formula = formula.replace(regex, value);
        }

        const actorsAndItems = [
            ...(await this.getCustomInputs<BaseTargetDocuments | undefined>("actor")),
            ...(await this.getCustomInputs<Item | undefined>("item")),
        ];

        for (const { label, value } of actorsAndItems) {
            if (!value) continue;

            const regex = new RegExp(`@${label}(?:\\.\\w+)*`, "gm");
            const match = formula.match(regex)?.[0];
            if (!match) continue;

            const document = value instanceof Item ? value : value.actor;
            const path = match.slice(label.length + 2);
            const parsedValue = foundry.utils.getProperty(document, path);
            const finalizedValue = R.isNumber(parsedValue) ? parsedValue : 0;

            formula = formula.replace(match, String(finalizedValue));
        }

        if (this.state === "formula") {
            this.setOutputValue("formula", formula);
        } else {
            const roll = new Roll(formula);
            const total = (await roll.evaluate()).total;
            this.setOutputValue("value", total);
        }

        return this.executeNext("out");
    }
}

type Inputs = {
    formula: string;
};

type Outputs = {
    formula: string;
    value: number;
};

type CustomInputs = "variable" | "actor" | "item";

type States = "formula" | "value";

export { ResolveFormulaLogicNode };
