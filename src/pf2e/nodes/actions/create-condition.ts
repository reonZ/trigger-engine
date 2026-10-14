import { IconObject } from "_zod";
import { BaseActionNode } from "engine";
import { createCustomCondition } from "foundry-helpers";
import { PF2eInputEntry } from "pf2e";
import {
    ConditionsInputs,
    DurationState,
    EffectInputs,
    conditionsSchemas,
    createTargetsEmbeddedItem,
    durationStates,
    effectSchemas,
    getEffectData,
    getItemTargets,
} from ".";

class CreateConditionActionNode extends BaseActionNode<"out", Inputs, never, never, never, DurationState> {
    static get type(): "create-condition" {
        return "create-condition";
    }

    static get tags(): string[] {
        return ["condition", "duration", "effect", "item"];
    }

    static get states(): string[] {
        return [...durationStates];
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [...conditionsSchemas(true), ...effectSchemas("effect")];
    }

    get icon(): IconObject {
        return { unicode: "\ue54d", fontWeight: "900" };
    }

    async _execute(): Promise<boolean> {
        const targets = await getItemTargets.call(this, "condition");

        if (!targets.length) {
            return this.executeNext("out");
        }

        const value = Math.max(await this.getInputValue("value"), 0);

        if (!value) {
            return this.executeNext("out");
        }

        const slug = await this.getInputValue("condition");
        const effect = await getEffectData.call(this);
        const source = createCustomCondition({ ...effect, counter: value, slug });

        if (source) {
            await createTargetsEmbeddedItem(targets, source);
        }

        return this.executeNext("out");
    }
}

type Inputs = EffectInputs & ConditionsInputs<TargetDocuments[]>;

export { CreateConditionActionNode };
