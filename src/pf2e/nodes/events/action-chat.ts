import { IconObject } from "_zod";
import { BaseEventNode } from "engine";
import { ActionChatOptions, PF2eInputEntry, PF2eOutputEntry, toolbeltTargetsEntry } from "pf2e";

class ActionChatEvent extends BaseEventNode<Inputs, Outputs> {
    static get type(): "action-chat-event" {
        return "action-chat-event";
    }

    static get tags(): string[] {
        return ["chat"];
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [{ key: "slug", type: "text" }];
    }

    static get defineOutputs(): PF2eOutputEntry[] {
        return [
            { key: "origin", type: "target" },
            { key: "item", type: "item" },
            { key: "options", type: "text", isArray: true },
            toolbeltTargetsEntry(),
        ];
    }

    get title(): string {
        const key = game.toolbelt?.getToolSetting("actionable", "actionable") ? "title" : "titles.regular";
        return this.localize(key) as string;
    }

    get icon(): IconObject {
        return { unicode: "\ue1e3", fontWeight: "900" };
    }

    async _execute({ item, options, origin, targets }: ActionChatOptions): Promise<boolean> {
        const slug = await this.getInputValue("slug");
        if (slug && item.slug !== slug) return true;

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

type Outputs = ActionChatOptions;

export { ActionChatEvent };
