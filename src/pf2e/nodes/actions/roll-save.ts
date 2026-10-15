import { IconObject } from "_zod";
import { BaseActionNode } from "engine";
import { ActorPF2e, ItemPF2e, R, StatisticRollParameters, ZeroToThree } from "foundry-helpers";
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
import { PF2eInputEntry, PF2eOutputEntry } from "pf2e";

class RollSaveActionNode extends BaseActionNode<"out", Inputs, Outputs, never, never, DifficultyClassState> {
    static get type(): "roll-save" {
        return "roll-save";
    }

    static get tags(): string[] {
        return ["chat", "save"];
    }

    static get states(): string[] {
        return [...dcStates];
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [
            { key: "origin", type: "target" },
            { key: "target", type: "target" },
            { key: "item", type: "item" },
            { key: "private", type: "boolean" },
            ...dcSchemas(),
            ...rollDataSchemas(),
        ];
    }

    static get defineOutputs(): PF2eOutputEntry[] {
        return [{ key: "outcome", type: "outcome" }];
    }

    get icon(): IconObject {
        return { unicode: "\uf6cf", fontWeight: "900" };
    }

    get canBreak(): boolean {
        return true;
    }

    async _execute(): Promise<boolean> {
        const target = await this.getInputValue("target");

        if (!target) {
            return true;
        }

        const item = await this.getInputValue("item");
        const origin = (await this.getInputValue("origin"))?.actor;
        const dcData = await getDcData.call(this, target.actor, origin, item);

        if (!dcData?.statistic) {
            return true;
        }

        const isPrivate = await this.getInputValue("private");
        const rollData = await getRollData.call(this, dcData);
        const rollArgs: StatisticRollParameters = {
            dc: dcData.dc,
            origin: origin,
            extraRollNotes: rollData.extraRollNotes,
            extraRollOptions: rollData.extraRollOptions,
            item: item as ItemPF2e<ActorPF2e>,
            messageMode: isPrivate ? "blind" : "public",
            skipDialog: true,
        };

        const rolled = await dcData.statistic.roll(rollArgs);

        if (R.isNumber(rolled?.degreeOfSuccess)) {
            this.setOutputValue("outcome", rolled.degreeOfSuccess);
            return this.executeNext("out");
        }

        return true;
    }
}

type Inputs = RollDataInputs &
    DifficultyClassInputs & {
        item?: ItemPF2e;
        origin?: TargetDocuments;
        private: boolean;
        target?: TargetDocuments;
    };

type Outputs = {
    outcome: Maybe<ZeroToThree>;
};

export { RollSaveActionNode };
