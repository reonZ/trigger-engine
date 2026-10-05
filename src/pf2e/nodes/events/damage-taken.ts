import { IconObject } from "_zod";
import { BaseEventNode } from "engine";
import { R } from "foundry-helpers";
import { CreateMessageHook, DamageTakenOptions, DamageTakenType, PF2eInputEntry, PF2eOutputEntry } from "pf2e";

class DamageTakenEvent extends BaseEventNode<Inputs, Outputs, never, "select" | "everything"> {
    static get type(): "damage-taken-event" {
        return "damage-taken-event";
    }

    static get tags(): string[] {
        return ["chat", "damage"];
    }

    static get states(): string[] {
        return ["select", "everything"];
    }

    static get aliases(): string[] {
        return this.states.slice(1);
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [
            {
                key: "requires",
                type: "boolean",
                field: {
                    default: true,
                },
            },
            {
                key: "for",
                type: "text",
                field: {
                    type: "select",
                    default: "damage",
                    options: CreateMessageHook.damageTakenTypes,
                },
                state: "select",
            },
        ];
    }

    static get defineOutputs(): PF2eOutputEntry[] {
        return [
            { key: "origin", type: "target" },
            { key: "target", type: "target" },
            { key: "item", type: "item" },
            { key: "options", type: "text", isArray: true },
            {
                key: "types",
                type: "text",
                state: "everything",
                isArray: true,
                tooltip: CreateMessageHook.damageTakenTypes.join(", "),
            },
        ];
    }

    get title(): string {
        return this.localize(this.state === "everything" ? "alias.everything.title" : "title") as string;
    }

    get icon(): IconObject {
        return { unicode: "\ue4dc", fontWeight: "900" };
    }

    async _execute({ item, options, origin, target, types, user }: DamageTakenOptions): Promise<boolean> {
        const requires = await this.getInputValue("requires");
        if (requires && !origin) return true;

        if (this.state === "everything") {
            this.setOutputValue("types", types);
        } else {
            const when = await this.getInputValue("for");
            if (!R.isIncludedIn(when, types)) return true;
        }

        this.userContext = user;

        this.setOutputValue("item", item);
        this.setOutputValue("options", options);
        this.setOutputValue("origin", origin);
        this.setOutputValue("target", target);

        return this.executeNext("out");
    }
}

type Inputs = {
    for: DamageTakenType;
    requires: boolean;
};

type Outputs = DamageTakenOptions;

export { DamageTakenEvent };
