import { BaseEventNode, BuiltinsOutputEntry } from "engine";

abstract class BaseCombatantEvent extends BaseEventNode<never, { combatant: BaseTargetDocuments }> {
    static get tags(): string[] {
        return ["combat", "combatant"];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [{ key: "combatant", type: "target" }];
    }

    async _execute(target: BaseTargetDocuments): Promise<boolean> {
        this.sceneContext = target.token;
        this.setOutputValue("combatant", target);
        return this.executeNext("out");
    }
}

export { BaseCombatantEvent };
