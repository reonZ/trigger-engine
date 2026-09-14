import { IconObject } from "_zod";
import { BaseActionNode, CustomInputSchema } from "engine";
import { getDocumentFromUUID, getItemSource, ItemPF2e, localize, R } from "foundry-helpers";
import { getDoubleUuidValue, PF2eInputEntry } from "pf2e";
import {
    choiceSetCustomInput,
    CreateItemActionNode,
    CreateItemInputs,
    createTargetsEmbeddedItem,
    selectChoiceSets,
} from ".";

class CreateEffectSourceActionNode extends BaseActionNode<"out", Inputs, never, "choices"> {
    static get type(): "create-effect-source" {
        return "create-effect-source";
    }

    static get tags(): string[] {
        return ["effect", "item"];
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [
            ...CreateItemActionNode.defineInputs.filter((x) => x.key !== "duplicate"),
            {
                key: "counter",
                type: "number",
                tooltip: localize.path("builtins.shared.numbers.override.tooltip"),
            },
            { key: "origin", type: "target", group: "origin" },
            { key: "item", type: "item", group: "origin" },
            { key: "options", type: "text", group: "origin", isArray: true },
        ];
    }

    static get defineCustomInputs(): CustomInputSchema[] {
        return [choiceSetCustomInput()];
    }

    get icon(): IconObject {
        return { unicode: "\uf890" };
    }

    async _execute(): Promise<boolean> {
        const targets = await this.getInputValue("target");

        if (!targets.length) {
            return this.executeNext("out");
        }

        const uuid = await getDoubleUuidValue.call(this);
        const item = await getDocumentFromUUID("Item", uuid);

        if (!item?.isOfType("effect")) {
            return this.executeNext("out");
        }

        const source = getItemSource(item);
        const level = await this.getInputValue("level");
        const origin = await this.getInputValue("origin");

        // we override the level if needed
        if (level > 0) {
            source.system.level.value = level;
        }

        // we override the counter if possible
        if (R.isNumber(source.system.badge?.value)) {
            const counter = await this.getInputValue("counter");

            if (counter > 0) {
                source.system.badge.value = counter;
            }
        }

        // we set the origin if needed
        if (origin) {
            const { actor, token } = origin;

            source.system.context = {
                origin: {
                    actor: actor?.uuid,
                    item: (await this.getInputValue("item"))?.uuid ?? null,
                    rollOptions: await this.getInputValue("options"),
                    spellcasting: null,
                    token: token?.uuid ?? actor.token?.uuid ?? null,
                },
                roll: null,
                target: null,
            };
        }

        // we set the choicesets selections for the item
        await selectChoiceSets.call(this, source);

        await createTargetsEmbeddedItem(targets, source);

        return this.executeNext("out");
    }
}

type Inputs = Omit<CreateItemInputs, "duplicate"> & {
    counter: number;
    item?: ItemPF2e;
    options: string[];
    origin?: TargetDocuments;
};

export { CreateEffectSourceActionNode };
