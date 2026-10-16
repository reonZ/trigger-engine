import { BuiltinsOutputEntry } from "engine";
import { BaseValueNode } from ".";

class CurrentCombatantValueNode extends BaseValueNode<BaseTargetDocuments | undefined> {
    static get type(): "current-combatant" {
        return "current-combatant";
    }

    static get tags(): string[] {
        return ["combat", "combatant"];
    }

    static get defineOutputs(): [BuiltinsOutputEntry] {
        return [{ key: "combatant", type: "target" }];
    }

    async _getValue(): Promise<BaseTargetDocuments | undefined> {
        const { actor, token } = game.combat?.combatant ?? {};
        return actor ? { actor, token } : undefined;
    }
}

export { CurrentCombatantValueNode };
