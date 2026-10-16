import { NodeEntry } from "engine";
import { ItemUUID, R } from "foundry-helpers";

class ItemEntry extends NodeEntry<Item | undefined> {
    static get type(): "item" {
        return "item";
    }

    static get default(): undefined {
        return undefined;
    }

    static get color(): ColorSource {
        return 0x696fe0;
    }

    static isValidType(value: unknown): value is Item {
        return value instanceof Item;
    }

    static toJSON(value: Item): ItemUUID {
        return value.uuid;
    }

    static async fromJSON(value: unknown): Promise<Item | undefined> {
        const item = R.isString(value) ? await fromUuid<Item>(value) : undefined;
        return this.isValidType(item) ? item : undefined;
    }
}

export { ItemEntry };
