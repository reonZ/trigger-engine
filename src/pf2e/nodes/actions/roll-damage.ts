import { IconObject } from "_zod";
import { BaseActionNode } from "engine";
import { ItemPF2e, RollDamageOptions, ScenePF2e, rollDamageFromFormula } from "foundry-helpers";
import {
    DifficultyClassInputs,
    DifficultyClassState,
    RollDataInputs,
    dcSchemas,
    dcStates,
    getDcData,
    getRollData,
    rollDataSchemas,
} from ".";
import { PF2eInputEntry, toolbeltTargetsEntry } from "pf2e";

class RollDamageActionNode extends BaseActionNode<"out", Inputs, never, never, never, DifficultyClassState> {
    static get type(): "roll-damage" {
        return "roll-damage";
    }

    static get tags(): string[] {
        return ["chat", "damage"];
    }

    static get states(): string[] {
        return ["none", ...dcStates];
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [
            { key: "formula", type: "text" },
            { key: "origin", type: "target" },
            toolbeltTargetsEntry(),
            { key: "item", type: "item" },
            ...rollDataSchemas(),
            ...dcSchemas(),
            { key: "private", type: "boolean" },
        ];
    }

    get icon(): IconObject {
        return { unicode: "\uf71c" };
    }

    async _execute(): Promise<boolean> {
        const formula = await this.getInputValue("formula");

        if (!formula) {
            return this.executeNext("out");
        }

        const item = await this.getInputValue("item");
        const targets = await this.getInputValue("targets");
        const origin = await this.getInputValue("origin");
        const dcData = await getDcData.call(this, undefined, origin?.actor, item);
        const rollData = await getRollData.call(this, dcData);

        const damageOptions: WithRequired<RollDamageOptions, "toolbelt"> = {
            extraRollOptions: rollData.extraRollOptions,
            item,
            notes: rollData.extraRollNotes,
            origin,
            skipDialog: true,
            target: targets[0],
            toolbelt: {
                item: item?.uuid,
                targets: this.getTargetsTokens(targets, true, { scene: this.sceneContext as ScenePF2e }),
            },
        };

        if (dcData?.dc) {
            foundry.utils.mergeObject(damageOptions.toolbelt, {
                options: dcData.extraOptions,
                private: await this.getInputValue("private"),
                saveVariants: {
                    null: {
                        basic: !!dcData.isBasic,
                        dc: dcData.dc.value,
                        statistic: dcData.save,
                    },
                },
                traits: dcData.extraTraits,
            } satisfies toolbelt.targetHelper.MessageFlag);
        }

        await rollDamageFromFormula(formula, damageOptions);

        return this.executeNext("out");
    }
}

type Inputs = RollDataInputs &
    DifficultyClassInputs & {
        formula: string;
        item?: ItemPF2e;
        origin?: TargetDocuments;
        private: boolean;
        targets: TargetDocuments[];
    };

export { RollDamageActionNode };
