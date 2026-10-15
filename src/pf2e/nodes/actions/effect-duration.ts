import { IconObject } from "_zod";
import { BaseEffectActionNode, getIconFromDoubleUuid, PF2eOutputEntry } from "pf2e";

class EffectDurationActionNode extends BaseEffectActionNode<{ delete: boolean }> {
    static get type(): "effect-duration" {
        return "effect-duration";
    }

    static get defineOutputs(): PF2eOutputEntry[] {
        return [{ key: "delete", type: "boolean" }];
    }

    get icon(): Maybe<string | IconObject> {
        return getIconFromDoubleUuid.call(this, { unicode: "\ue29e" });
    }

    async _execute(): Promise<boolean> {
        const item = await this.getEffect();
        const value = await this.getInputValue("by");

        if (!value || !item || item.system.duration.expiry == null) {
            return this.executeNext("out");
        }

        const remaining = item.system.duration.value + value;

        if (remaining <= 0) {
            await item.delete();
            this.setOutputValue("delete", true);
        } else {
            await item.update({ "system.duration.value": remaining });
        }

        return this.executeNext("out");
    }
}

export { EffectDurationActionNode };
