import { BaseSingleHook } from ".";

abstract class BaseCombatantHook extends BaseSingleHook<BaseTargetDocuments> {
    _onEvent(combatant: Combatant): void {
        const actor = combatant.actor;

        if (this.isValidActor(actor)) {
            this.executeEvent(this.events[0], { actor, token: combatant.token });
        }
    }
}

export { BaseCombatantHook };
