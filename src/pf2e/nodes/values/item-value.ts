import { IconObject } from "_zod";
import { BaseValueNode, BuiltinsOutputEntry } from "engine";
import { getDocumentFromUUID, ItemPF2e } from "foundry-helpers";
import { PF2eInputEntry } from "pf2e";
import {
    DoubleUuidInputs,
    doubleUuidSchemas,
    getDoubleUuidValue,
    getIconFromDoubleUuid,
    getLocalItemFromSourceUuid,
} from "..";

class ItemValueNode extends BaseValueNode<ItemPF2e | undefined, DoubleUuidInputs> {
    static get type(): "item-value" {
        return "item-value";
    }

    static get tags(): string[] {
        return ["item"];
    }

    static get defineInputs(): PF2eInputEntry[] {
        return doubleUuidSchemas();
    }

    static get defineOutputs(): [BuiltinsOutputEntry] {
        return [{ key: "item", type: "item" }];
    }

    get title(): Maybe<string> {
        return getLocalItemFromSourceUuid.call(this)?.name ?? super.title;
    }

    get icon(): IconObject | string | null {
        return getIconFromDoubleUuid.call(this, null);
    }

    async _getValue(): Promise<ItemPF2e | undefined> {
        const uuid = await getDoubleUuidValue.call(this);
        const item = await getDocumentFromUUID("Item", uuid);
        return item ?? undefined;
    }
}

export { ItemValueNode };
