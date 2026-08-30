import { TriggerHook } from "engine";
import { ChatMessagePF2e, ChatMessageSourcePF2e, createToggleHook, isSpellMessage, SYSTEM } from "foundry-helpers";
import { onSpellCastMessage, SpellCastOptions } from ".";

class UpdateMessageHook extends TriggerHook<SpellCastOptions> {
    #hook = createToggleHook("updateChatMessage", this.#onUpdateMessage.bind(this));

    get events(): ["spell-cast-event"] {
        return ["spell-cast-event"];
    }

    _enable() {
        this.#hook.activate();
    }

    _disable() {
        this.#hook.disable();
    }

    async #onUpdateMessage(message: ChatMessagePF2e, changes: DeepPartial<ChatMessageSourcePF2e>) {
        if (isSpellMessage(message)) {
            return changes.flags?.[SYSTEM.id]?.origin?.variant && onSpellCastMessage.call(this, message);
        }
    }
}

export { UpdateMessageHook };
export type {};
