import { IconObject } from "_zod";
import { BaseActionNode, CustomInputSchema } from "engine";
import { ActorPF2e, getDocumentFromUUID, getItemSource, ItemPF2e, ItemType, localize } from "foundry-helpers";
import { PF2eInputEntry } from "pf2e";
import {
    choiceSetCustomInput,
    createTargetsEmbeddedItem,
    DoubleUuidInputs,
    doubleUuidSchemas,
    getDoubleUuidValue,
    getIconFromDoubleUuid,
    getLocalItemFromSourceUuid,
    selectChoiceSets,
} from "..";

class CreateItemActionNode extends BaseActionNode<"out", CreateItemInputs, never, "choices"> {
    static modes = ["flag", "rollOption"] as const;

    static get type(): "create-item" {
        return "create-item";
    }

    static get tags(): string[] {
        return ["item"];
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [
            { key: "target", type: "target", isArray: true },
            ...doubleUuidSchemas(),
            { key: "duplicate", type: "boolean", field: { default: true } },
            {
                key: "level",
                type: "number",
                tooltip: localize.path("builtins.shared.numbers.override.tooltip"),
                field: {
                    min: 0,
                    step: 1,
                },
            },
        ];
    }

    static get defineCustomInputs(): CustomInputSchema[] {
        return [choiceSetCustomInput()];
    }

    get title(): string | null {
        return getLocalItemFromSourceUuid.call(this)?.name ?? super.title;
    }

    get subtitle(): string | null {
        return getLocalItemFromSourceUuid.call(this) ? super.title : super.subtitle;
    }

    get icon(): IconObject | string | null {
        return getIconFromDoubleUuid.call(this, { unicode: "\uf466" });
    }

    async _execute(): Promise<boolean> {
        const uuid = await getDoubleUuidValue.call(this);
        const item = await getDocumentFromUUID("Item", uuid);

        if (!item) {
            return this.executeNext("out");
        }

        const targets = await this.#getTargets(item, uuid);

        if (!targets.length) {
            return this.executeNext("out");
        }

        const source = getItemSource(item);

        // we override the level if possible
        if (source.system.level) {
            const level = await this.getInputValue("level");

            if (level > 0) {
                source.system.level.value = level;
            }
        }

        // we set the choicesets selections for the item
        await selectChoiceSets.call(this, source);

        await createTargetsEmbeddedItem(targets, source);

        return this.executeNext("out");
    }

    async #getTargets(item: ItemPF2e, uuid: string) {
        const targets = await this.getInputValue("target");
        const duplicates = await this.getInputValue("duplicate");
        const maxTakable = !duplicates ? 1 : item.isOfType("feat") ? item.maxTakable : Infinity;

        if (maxTakable === Infinity) {
            return targets;
        }

        return targets.filter(({ actor }) => {
            const exist: ItemPF2e<ActorPF2e>[] = [];
            const items = actor.itemTypes[item.type as ItemType];

            for (const found of items) {
                if (found.sourceId !== uuid) continue;
                exist.push(found);
            }

            return exist.length < maxTakable;
        });
    }
}

type CreateItemInputs = DoubleUuidInputs & {
    duplicate: boolean;
    level: number;
    target: TargetDocuments[];
};

export { CreateItemActionNode };
export type { CreateItemInputs };
