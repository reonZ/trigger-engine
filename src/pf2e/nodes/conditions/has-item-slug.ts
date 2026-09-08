import { ActorPF2e, ItemPF2e, findItemWithSlug, localize } from "foundry-helpers";
import { PF2eInputEntry } from "pf2e";
import { BaseHasItemConditionNode } from "..";

class HasItemSlugConditionNode extends BaseHasItemConditionNode<Inputs> {
    static get type(): "has-item-slug" {
        return "has-item-slug";
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [
            ...BaseHasItemConditionNode.defineInputs,
            { key: "slug", type: "text", label: localize("pf2e-trigger.shared.item.slug.title") },
        ];
    }

    async getItem<T extends ActorPF2e>(actor: T): Promise<ItemPF2e<T> | null> {
        const slug = await this.getInputValue("slug");
        return findItemWithSlug(actor, slug);
    }
}

type Inputs = {
    slug: string;
    target?: TargetDocuments;
};

export { HasItemSlugConditionNode };
