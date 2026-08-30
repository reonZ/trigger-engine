import { IconObject } from "_zod";
import { BaseEventNode } from "engine";
import { CheckType, localize, R, recordToSelectOptions } from "foundry-helpers";
import { CheckRollOptions, PF2eInputEntry, PF2eOutputEntry } from "pf2e";

const SPECIFIC_CHECKS = {
    check: "PF2E.Check.Label",
    "counteract-check": "PF2E.Item.Spell.Counteract.Label",
    "flat-check": "PF2E.FlatCheck",
    initiative: "PF2E.InitiativeLabel",
    "perception-check": "PF2E.PerceptionLabel",
    "saving-throw": "PF2E.SavingThrow",
    "skill-check": undefined,
} as Record<CheckType, string | undefined>;

class CheckRollEvent extends BaseEventNode<Inputs, Outputs, never, "all" | "check"> {
    static #aliases?: string[];
    static #specificOptions?: { value: string; label?: string }[];
    static #titles?: Record<CheckType, string>;

    static get type(): "check-roll-event" {
        return "check-roll-event";
    }

    static get tags(): string[] {
        return ["chat", "check"];
    }

    static get states(): string[] {
        return ["all", "check"];
    }

    static get titles() {
        return (this.#titles ??= R.mapValues(SPECIFIC_CHECKS, (key, when) => {
            const type = key
                ? game.i18n.localize(key)
                : localize("pf2e-trigger.node", this.category, this.type, "inputs.for.options", when);
            return localize("pf2e-trigger.node", this.category, this.type, "titles.specific", { type });
        }));
    }

    static get aliases(): string[] {
        return (this.#aliases ??= R.values(R.omit(this.titles, ["check"])));
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [
            {
                key: "for",
                type: "text",
                state: "check",
                field: {
                    type: "select",
                    options: (this.#specificOptions ??= recordToSelectOptions(SPECIFIC_CHECKS)),
                },
            },
        ];
    }

    static get defineOutputs(): PF2eOutputEntry[] {
        return [
            { key: "roller", type: "target" },
            { key: "outcome", type: "outcome" },
            { key: "origin", type: "target" },
            { key: "target", type: "target" },
            { key: "dc", type: "number" },
            { key: "item", type: "item" },
            { key: "reroll", type: "boolean" },
            { key: "options", type: "text", isArray: true },
            { key: "type", type: "text", state: "all" },
        ];
    }

    get title(): string | null {
        if (this.state === "all") {
            return super.title;
        }

        const when = this.getLocalValue("for");
        return CheckRollEvent.titles[when];
    }

    get icon(): IconObject {
        return { unicode: "\uf6cf", fontWeight: "900" };
    }

    async _execute({
        dc,
        isReroll,
        item,
        options,
        origin,
        outcome,
        roller,
        target,
        type,
    }: CheckRollOptions): Promise<boolean> {
        if (this.state === "check") {
            const when = await this.getInputValue("for");
            if (when !== type) return true;
        } else {
            this.setOutputValue("type", type);
        }

        this.setOutputValue("dc", dc);
        this.setOutputValue("item", item);
        this.setOutputValue("options", options);
        this.setOutputValue("origin", origin);
        this.setOutputValue("outcome", outcome);
        this.setOutputValue("reroll", isReroll);
        this.setOutputValue("roller", roller);
        this.setOutputValue("target", target);

        return this.executeNext("out");
    }
}

type Inputs = {
    for: keyof typeof SPECIFIC_CHECKS;
};

type Outputs = Omit<CheckRollOptions, "isReroll"> & {
    reroll: boolean;
};

export { CheckRollEvent };
