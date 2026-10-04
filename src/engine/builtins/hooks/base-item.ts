import { ItemPF2e } from "foundry-helpers";
import { BaseSingleHook } from ".";

abstract class BaseItemHook extends BaseSingleHook<ItemEventOptions> {
    _onEvent(item: ItemPF2e, _context: object, userId: string): void {
        const actor = item.actor;
        const user = game.users.get(userId);
        if (!user) return;

        if (!item.pack && this.isValidActor(actor)) {
            this.executeEvent(this.events[0], { item, parent: { actor }, user });
        }
    }
}

type ItemEventOptions = {
    item: ItemPF2e;
    parent: TargetDocuments;
    user: User;
};

export { BaseItemHook };
export type { ItemEventOptions };
