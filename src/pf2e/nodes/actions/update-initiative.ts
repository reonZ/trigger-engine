import { IconObject } from "_zod";
import { BaseActionNode } from "engine";
import {
    CombatantPF2e,
    EncounterPF2e,
    hasRolledInitiative,
    R,
    RolledCombatant,
    saveNewInitiativeOrder,
    setInitiativeFromDrop,
} from "foundry-helpers";
import { PF2eInputEntry, PF2eOutputEntry } from "pf2e";

class UpdateInitiativeActionNode extends BaseActionNode<
    "out",
    Inputs,
    Outputs,
    never,
    never,
    "value" | "before" | "after"
> {
    static get type(): "update-initiative" {
        return "update-initiative";
    }

    static get tags(): string[] {
        return ["combat", "combatant"];
    }

    static get states(): string[] {
        return ["value", "before", "after"];
    }

    static get aliases(): string[] {
        return this.states.slice(1);
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [
            { key: "target", type: "target" },
            {
                key: "value",
                type: "number",
                state: "value",
                field: { step: 1 },
            },
            { key: "other", type: "target", state: ["after", "before"] },
        ];
    }

    static get defineOutputs(): PF2eOutputEntry[] {
        return [{ key: "value", type: "number" }];
    }

    get title(): Maybe<string> {
        return this.localize(this.state === "value" ? "title" : `alias.${this.state}.title`);
    }

    get icon(): IconObject {
        return { unicode: "\uf017" };
    }

    async _execute(): Promise<boolean> {
        const target = await this.getInputValue("target");
        const combatant = target?.actor.combatant;

        if (!combatant) {
            return this.executeNext("out");
        }

        if (R.isIncludedIn(this.state, ["after", "before"])) {
            await this.#updatePosition(combatant);
        } else {
            const value = await this.getInputValue("value");
            await combatant.update({ initiative: value });
        }

        this.setOutputValue("value", combatant.initiative ?? undefined);

        return this.executeNext("out");
    }

    async #updatePosition(target: CombatantPF2e<EncounterPF2e>) {
        const combat = target.combat;
        const other = (await this.getInputValue("other"))?.actor.combatant;
        if (!other || target === other) return;

        const combatants = combat.turns.slice();

        if (!hasRolledInitiative(target)) {
            const last = combatants.findLast((combatant) => hasRolledInitiative(combatant));
            target.initiative = (last?.initiative ?? 1) - 1;
        }

        const currentIndex = combatants.findIndex((combatant) => combatant === target);

        combatants.splice(currentIndex, 1);

        const otherIndex = combatants.findIndex((combatant) => combatant === other);
        const targetIndex = Math.max(this.state === "before" ? otherIndex : otherIndex + 1, 0);
        if (currentIndex === targetIndex) return;

        combatants.splice(targetIndex, 0, target);

        const newOrder = combatants.filter((combatant): combatant is RolledCombatant<EncounterPF2e> => {
            return hasRolledInitiative(combatant);
        });

        setInitiativeFromDrop(combat, newOrder, target as RolledCombatant<EncounterPF2e>);
        return saveNewInitiativeOrder(combat, newOrder);
    }
}

type Inputs = {
    target?: TargetDocuments;
    value: number;
    other?: TargetDocuments;
};

type Outputs = {
    value: number | undefined;
};

export { UpdateInitiativeActionNode };
