import { TriggerHook } from "engine";
import { createToggleHook } from "foundry-helpers";
import { checkRollData } from ".";

class ToolbeltSaveHook extends TriggerHook {
    #hook = createToggleHook(["pf2e-toolbelt.rollSave", "pf2e-toolbelt.rerollSave"], this.#onToolbeltSave.bind(this));

    get events(): ["check-roll-event"] {
        return ["check-roll-event"];
    }

    _enable() {
        this.#hook.activate();
    }

    _disable() {
        this.#hook.disable();
    }

    async #onToolbeltSave({ data, message, rollMessage, user }: toolbelt.targetHelper.RollSaveHook) {
        const checkData = await checkRollData(user, rollMessage ?? message, !!data.rerolled);
        if (checkData) {
            this.executeEvent("check-roll-event", checkData);
        }
    }
}

export { ToolbeltSaveHook };
