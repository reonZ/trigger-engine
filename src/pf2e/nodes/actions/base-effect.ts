import { BaseActionNode } from "engine";
import {
    ActorItemInstances,
    findItemWithSlug,
    findItemWithSourceId,
    ItemPF2e,
    ItemType,
    localize,
} from "foundry-helpers";
import {
    DoubleUuidInputs,
    doubleUuidSchemas,
    getDoubleUuidValue,
    getLocalItemFromSourceUuid,
    PF2eInputEntry,
} from "pf2e";

abstract class BaseEffectActionNode<
    TEffectType extends ItemType = ItemType,
    TOutputs extends Record<string, any> | never = Record<string, any>,
> extends BaseActionNode<"out", Inputs, TOutputs, never, never, "item" | "uuid" | "slug"> {
    static get tags(): string[] {
        return ["effect", "item"];
    }

    static get states(): string[] {
        return ["item", "uuid", "slug"];
    }

    static get aliases(): string[] {
        return ["decrease", "increase"];
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [
            { key: "target", type: "target", state: "uuid" },
            {
                key: "targetSlug",
                type: "target",
                state: "slug",
                label: localize("builtins.entry.target.title"),
            },
            { key: "slug", type: "text", state: "slug", label: localize("pf2e-trigger.shared.item.slug.title") },
            ...doubleUuidSchemas("uuid"),
            { key: "effect", type: "item", state: "item" },
            { key: "by", type: "number" },
        ];
    }

    get effectTypes(): TEffectType[] {
        return ["effect"] as TEffectType[];
    }

    get dynamicTitle(): string | null {
        const value = this.getLocalValue("by");
        return this.localize(
            value > 0 ? "alias.increase.title" : value < 0 ? "alias.decrease.title" : "title",
        ) as string;
    }

    get title(): string | null {
        return getLocalItemFromSourceUuid.call(this)?.name ?? this.dynamicTitle;
    }

    get subtitle(): string | null {
        return getLocalItemFromSourceUuid.call(this) ? this.dynamicTitle : super.subtitle;
    }

    async getEffect(): Promise<ActorItemInstances<TEffectType> | null> {
        const returnEffect = (effect: ItemPF2e | null): ActorItemInstances<TEffectType> | null => {
            return effect?.actor && !effect.pack ? (effect as ActorItemInstances<TEffectType>) : null;
        };

        if (this.state === "item") {
            const item = await this.getInputValue("effect");
            return item?.isOfType(...this.effectTypes) ? returnEffect(item) : null;
        }

        const itemPromise = this.state === "slug" ? this.#getItemBySlug() : this.#getItemByUuid();
        return returnEffect(await itemPromise);
    }

    async #getItemBySlug(): Promise<ActorItemInstances<TEffectType> | null> {
        const actor = (await this.getInputValue("targetSlug"))?.actor;
        if (!actor) return null;

        const slug = await this.getInputValue("slug");
        return findItemWithSlug(actor, slug, this.effectTypes);
    }

    async #getItemByUuid(): Promise<ActorItemInstances<TEffectType> | null> {
        const actor = (await this.getInputValue("target"))?.actor;
        if (!actor) return null;

        const uuid = await getDoubleUuidValue.call(this);
        return findItemWithSourceId(actor, uuid, this.effectTypes);
    }
}

type Inputs = DoubleUuidInputs & {
    by: number;
    effect?: ItemPF2e;
    slug: string;
    target?: TargetDocuments;
    targetSlug?: TargetDocuments;
};

export { BaseEffectActionNode };
