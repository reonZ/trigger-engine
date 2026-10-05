import { IconObject } from "_zod";
import { BaseItemEvent } from ".";
import { R } from "foundry-helpers";
import { BuiltinsOutputEntry, ItemEventOptions } from "engine";

class UpdateItemEvent extends BaseItemEvent<Outputs> {
    static get type(): "update-item-event" {
        return "update-item-event";
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [...BaseItemEvent.defineOutputs, { key: "paths", type: "text", isArray: true }];
    }

    get icon(): IconObject {
        return { unicode: "\uf0b1", fontWeight: "900" };
    }

    async _processExecute([changes]: [UpdateItemData]) {
        const data = R.omit(changes, ["_id", "_stats"]);
        const paths = R.keys(foundry.utils.flattenObject(data));

        this.setOutputValue("paths", paths);
    }
}

type UpdateItemData = {
    _id: string;
    _stats: { modifiedTime: number };
    [key: string]: any;
};

type Outputs = ItemEventOptions & {
    paths: string[];
};

export { UpdateItemEvent };
