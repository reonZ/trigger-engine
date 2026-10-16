import { BuiltinsInputEntry } from "engine";
import { isCurrentCombatant } from "foundry-helpers";
import { BaseConditionNode } from ".";

class IsCombatantConditionNode extends BaseConditionNode<{ target?: BaseTargetDocuments }> {
    static get type(): "is-combatant" {
        return "is-combatant";
    }

    static get tags(): string[] {
        return ["combat", "combatant"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [{ key: "target", type: "target" }];
    }

    async _execute(): Promise<boolean> {
        const target = await this.getInputValue("target");
        const isCombatant = !!target?.actor && isCurrentCombatant(target.actor);

        return this.executeIf(isCombatant);
    }
}

export { IsCombatantConditionNode };
