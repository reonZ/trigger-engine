import { BaseSingleHook } from ".";

abstract class BaseTokenHook extends BaseSingleHook<TokenEventOptions> {
    _onEvent(token: TokenDocument, _context: object, userId: string): void {
        const user = game.users.get(userId);
        if (!user) return;

        const actor = token.actor;

        if (this.isValidActor(actor)) {
            this.executeEvent(this.events[0], { target: { actor, token }, user });
        }
    }
}

type TokenEventOptions = {
    target: BaseTargetDocuments;
    user: User;
};

export { BaseTokenHook };
export type { TokenEventOptions };
