import { TokenDocumentPF2e } from "foundry-helpers";
import { BaseSingleHook } from ".";

abstract class BaseTokenHook extends BaseSingleHook<TokenEventOptions> {
    _onEvent(token: TokenDocumentPF2e, _context: object, userId: string): void {
        const actor = token.actor;
        const user = game.users.get(userId);
        if (!user) return;

        if (this.isValidActor(actor)) {
            this.executeEvent(this.events[0], { target: { actor, token }, user });
        }
    }
}

type TokenEventOptions = {
    target: TargetDocuments;
    user: User;
};

export { BaseTokenHook };
export type { TokenEventOptions };
