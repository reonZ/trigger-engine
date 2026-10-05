import { ItemPF2e } from "foundry-helpers";
import { BaseSingleHook } from ".";

abstract class BaseItemHook extends BaseSingleHook<ItemEventOptions> {
    _onEvent(item: ItemPF2e, ...args: [...any, context: object, userId: string]): void {
        const userId = args.at(-1);
        const user = game.users.get(userId);
        if (!user) return;

        const actor = item.actor;

        if (!item.pack && this.isValidActor(actor)) {
            this.executeEvent(this.events[0], { args: args.slice(0, -2), item, parent: { actor }, user });
        }
    }
}

type ItemEventOptions = {
    args: any[];
    item: ItemPF2e;
    parent: TargetDocuments;
    user: User;
};

export { BaseItemHook };
export type { ItemEventOptions };
