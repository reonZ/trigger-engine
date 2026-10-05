import { TriggerHook } from "engine";
import { createToggleHook } from "foundry-helpers";
import { checkRollData } from ".";

class ToolbeltSaveHook extends TriggerHook {
    #hook = createToggleHook(["pf2e-toolbelt.rollSave", "pf2e-toolbelt.rerollSave"], this.#onToolbeltSave.bind(this));

    get events(): ["check-roll-event"] {
        return ["check-roll-event"];
    }

    get gmOnly(): boolean {
        return false;
    }

    _enable() {
        this.#hook.activate();
    }

    _disable() {
        this.#hook.disable();
    }

    async #onToolbeltSave({ data, message, rollMessage }: toolbelt.targetHelper.RollSaveHook) {
        const checkData = await checkRollData(game.user, rollMessage ?? message, !!data.rerolled);
        if (!checkData) return;

        if (game.user.isGM) {
            this.executeEvent("check-roll-event", checkData);
        } else {
            const converted = this.convertObjectToEmitable(checkData, {
                item: "item",
                origin: "target",
                roller: "target",
                target: "target",
                user: "user",
            });

            this.executeEventAsGM("check-roll-event", converted);
        }
    }
}

export { ToolbeltSaveHook };
