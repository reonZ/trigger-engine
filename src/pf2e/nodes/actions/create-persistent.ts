import { IconObject } from "_zod";
import { BaseActionNode } from "engine";
import { DamageType, recordToSelectOptions } from "foundry-helpers";
import { createTargetsEmbeddedItem, getItemTargets, PF2eInputEntry } from "pf2e";

class CreatePersistentActionNode extends BaseActionNode<"out", Inputs> {
    static get type(): "create-persistent" {
        return "create-persistent";
    }

    static get tags(): string[] {
        return ["condition", "effect", "item", "damage"];
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [
            { key: "target", type: "target", isArray: true },
            {
                key: "die",
                type: "text",
                field: { default: "1d6" },
            },
            {
                key: "type",
                type: "text",
                field: {
                    type: "select",
                    options: recordToSelectOptions(CONFIG.PF2E.damageTypes),
                },
            },
            {
                key: "dc",
                type: "number",
                field: {
                    default: 15,
                    min: 0,
                },
            },
        ];
    }

    get icon(): IconObject {
        return { unicode: "\uf780" };
    }

    async _execute(): Promise<boolean> {
        const targets = await getItemTargets.call(this, "condition");

        if (!targets.length) {
            return this.executeNext("out");
        }

        const dc = await this.getInputValue("dc");
        const die = await this.getInputValue("die");
        const type = await this.getInputValue("type");
        const source = createPersistentDamageSource(die, type, dc);

        await createTargetsEmbeddedItem(targets, source);

        return this.executeNext("out");
    }
}

function createPersistentDamageSource(formula: string, damageType: DamageType, dc = 15) {
    const baseConditionSource = game.pf2e.ConditionManager.getCondition("persistent-damage").toObject();
    return foundry.utils.mergeObject(baseConditionSource, {
        system: { persistent: { formula, damageType, dc } },
    });
}

type Inputs = {
    dc: number;
    die: string;
    target: TargetDocuments[];
    type: DamageType;
};

export { CreatePersistentActionNode };
