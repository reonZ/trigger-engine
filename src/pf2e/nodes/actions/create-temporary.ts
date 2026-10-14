import { IconObject } from "_zod";
import { BaseActionNode } from "engine";
import { createCustomEffect } from "foundry-helpers";
import { getTriggerEffectData, PF2eInputEntry } from "pf2e";
import {
    DurationState,
    createTargetsEmbeddedItem,
    durationSchemas,
    durationStates,
    getDurationData,
    getItemTargets,
} from ".";

class CreateTemporaryActionNode extends BaseActionNode<"out", Inputs, never, never, never, DurationState> {
    static get type(): "create-temporary" {
        return "create-temporary";
    }

    static get tags(): string[] {
        return ["duration", "effect", "item"];
    }

    static get states(): string[] {
        return [...durationStates];
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [
            { key: "target", type: "target", isArray: true },
            { key: "identifier", type: "text" },
            ...durationSchemas(),
        ];
    }

    get icon(): IconObject {
        return { unicode: "\uf890" };
    }

    async _execute(): Promise<boolean> {
        const targets = await getItemTargets.call(this, "effect");

        if (!targets.length) {
            return this.executeNext("out");
        }

        const { identifier, slug } = await getTriggerEffectData.call(this);
        const duration = await getDurationData.call(this);

        const source = createCustomEffect({
            duration,
            img: "icons/svg/clockwork.svg",
            itemSlug: slug,
            name: identifier ? `${this.triggerName} (${identifier})` : this.triggerName,
            show: false,
            unidentified: true,
        });

        await createTargetsEmbeddedItem(targets, source);

        return this.executeNext("out");
    }
}

type Inputs = {
    identifier: string;
    target: TargetDocuments[];
};

export { CreateTemporaryActionNode };
