import { IconObject } from "_zod";
import { BaseEventNode } from "engine";
import { PF2eInputEntry, PF2eOutputEntry, SpellCastOptions, toolbeltTargetsEntry } from "pf2e";

class SpellCastEvent extends BaseEventNode<Inputs, Outputs> {
    static get type(): "spell-cast-event" {
        return "spell-cast-event";
    }

    static get tags(): string[] {
        return ["chat", "spell"];
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [{ key: "slug", type: "text" }];
    }

    static get defineOutputs(): PF2eOutputEntry[] {
        return [
            { key: "origin", type: "target" },
            { key: "item", type: "item" },
            { key: "rank", type: "number" },
            { key: "options", type: "text", isArray: true },
            toolbeltTargetsEntry(),
        ];
    }

    get icon(): IconObject {
        return { unicode: "\ue2ca", fontWeight: "900" };
    }

    async _execute({ castRank, item, options, origin, targets }: SpellCastOptions): Promise<boolean> {
        const slug = await this.getInputValue("slug");
        if (slug && item.slug !== slug) return true;

        this.setOutputValue("rank", castRank ?? item.rank);
        this.setOutputValue("item", item);
        this.setOutputValue("options", options);
        this.setOutputValue("origin", origin);
        this.setOutputValue("targets", targets);

        return this.executeNext("out");
    }
}

type Inputs = {
    slug: string;
};

type Outputs = Omit<SpellCastOptions, "castRank" | "variant"> & {
    rank: number;
};

export { SpellCastEvent };
