import { TriggerHook } from "engine";
import { createToggleHook, SYSTEM } from "foundry-helpers";
import { checkRollData, CheckRollOptions } from ".";

class ToolbeltSaveHook extends TriggerHook {
    #saveHook = createToggleHook("pf2e-toolbelt.rollSave", this.#onToolbeltSave.bind(this));
    #rerollHook = createToggleHook("pf2e-toolbelt.rerollSave", this.#onToolbeltReroll.bind(this));

    get events(): ["check-roll-event"] {
        return ["check-roll-event"];
    }

    get gmOnly(): boolean {
        return false;
    }

    _enable() {
        this.#saveHook.activate();
        this.#rerollHook.activate();
    }

    _disable() {
        this.#saveHook.disable();
        this.#rerollHook.disable();
    }

    async #onToolbeltReroll({ rollMessageData }: toolbelt.targetHelper.RerollSaveHook) {
        const fakeMessage = {
            ...rollMessageData,
            flags: {
                [SYSTEM.id]: {
                    context: rollMessageData.context,
                    origin: rollMessageData.origin,
                },
            },
        } as any;

        const checkData = await checkRollData(game.user, fakeMessage);
        this.#executeEvent(checkData);
    }

    async #onToolbeltSave({ rollMessage }: toolbelt.targetHelper.RollSaveHook) {
        const checkData = await checkRollData(game.user, rollMessage);
        this.#executeEvent(checkData);
    }

    #executeEvent(checkData: Maybe<CheckRollOptions>) {
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
