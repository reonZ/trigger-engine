import { BaseConditionNode } from "engine";
import { PF2eInputEntry, PF2eOutputEntry } from "pf2e";
import { ConditionsInputs, conditionsSchemas, getConditionsData } from "..";
import { R } from "foundry-helpers";

class HasConditionConditionNode extends BaseConditionNode<Inputs, { boolean: boolean; value: number }> {
    static get type(): "has-condition" {
        return "has-condition";
    }

    static get tags(): string[] {
        return ["item", "effect", "condition"];
    }

    static get defineInputs(): PF2eInputEntry[] {
        return conditionsSchemas();
    }

    static get defineOutputs(): PF2eOutputEntry[] {
        return [...BaseConditionNode.defineOutputs, { key: "value", type: "number", spacing: 1 }];
    }

    async _execute(): Promise<boolean> {
        const data = await getConditionsData.call(this);

        if (!data) {
            return this.execute("false");
        }

        const { actor, slug, value } = data;
        const conditions = actor.conditions.bySlug(slug);
        const existingValue = R.firstBy(conditions, [(condition) => condition.value ?? 1, "desc"])?.value ?? 1;
        const hasCondition = conditions.length > 0 && (value <= 1 || existingValue >= value);

        if (conditions.length) {
            this.setOutputValue("value", existingValue);
        }

        return this.executeIf(hasCondition);
    }
}

type Inputs = ConditionsInputs;

export { HasConditionConditionNode };
