import { IconObject } from "_zod";
import { BuiltinsInputEntry } from "engine";
import { BaseActionNode } from ".";
import { ActorUUID, R } from "foundry-helpers";

class DeleteItemActionNode extends BaseActionNode<"out", { item: Item[] }> {
    static get type(): "delete-item" {
        return "delete-item";
    }

    static get tags(): string[] {
        return ["item"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [{ key: "item", type: "item", isArray: true }];
    }

    get icon(): IconObject {
        return { unicode: "\uf1f8" };
    }

    async _execute(): Promise<boolean> {
        const byActors = R.reduce(
            await this.getInputValue("item"),
            (acc, item) => {
                const actor = item.actor;
                if (!actor || item.pack) return acc;
                const entry = (acc[actor.uuid] ??= { actor, ids: [] });
                entry.ids.push(item.id);
                return acc;
            },
            {} as Record<ActorUUID, { actor: Actor; ids: string[] }>,
        );

        await Promise.all(R.values(byActors).map(({ actor, ids }) => actor.deleteEmbeddedDocuments("Item", ids)));

        return this.executeNext("out");
    }
}

export { DeleteItemActionNode };
