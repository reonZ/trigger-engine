import { IconObject } from "_zod";
import { BuiltinsInputEntry } from "engine";
import { BaseActionNode } from ".";
import { R } from "foundry-helpers";

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
        await Promise.all(
            R.map(await this.getInputValue("item"), (item) => item?.actor && !item.pack && item.delete()),
        );
        return this.executeNext("out");
    }
}

export { DeleteItemActionNode };
