import { IconObject } from "_zod";
import { BaseActionNode } from "engine";
import { PF2eInputEntry } from "pf2e";

class UpdateResourceActionNode extends BaseActionNode<"out", Inputs> {
    static get type(): "update-resource" {
        return "update-resource";
    }

    static get tags(): string[] {
        return ["resource"];
    }

    static get aliases(): string[] {
        return ["decrease", "increase"];
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [
            { key: "target", type: "target" },
            { key: "slug", type: "text" },
            { key: "by", type: "number" },
        ];
    }

    get title(): Maybe<string> {
        const value = this.getLocalValue("by");
        return this.localize(value > 0 ? "alias.increase.title" : value < 0 ? "alias.decrease.title" : "title");
    }

    get icon(): IconObject {
        const value = this.getLocalValue("by");
        return { unicode: value > 0 ? "\uf240" : value < 0 ? "\ue0b1" : "\uf242" };
    }

    async _execute(): Promise<boolean> {
        const actor = (await this.getInputValue("target"))?.actor;
        const slug = await this.getInputValue("slug");
        const resource = actor?.getResource(slug);

        if (resource) {
            const value = await this.getInputValue("by");
            const newValue = Math.clamp(resource.value + value, 0, resource.max);

            if (newValue !== resource.value && actor?.isOfType("creature")) {
                await actor.updateResource(resource.slug, newValue);
            }
        }

        return this.executeNext("out");
    }
}

type Inputs = {
    by: number;
    target?: TargetDocuments;
    slug: string;
};

export { UpdateResourceActionNode };
