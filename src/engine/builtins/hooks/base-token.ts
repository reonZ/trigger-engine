import { BaseSingleHook } from ".";

abstract class BaseTokenHook extends BaseSingleHook<TokenEventOptions> {
    _onEvent(token: TokenDocument, ...args: [...any, string | User]): void {
        const last = args.at(-1);
        const user = last instanceof User ? last : game.users.get(last);
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
