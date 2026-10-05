import { BaseItemHook } from "engine";

class UpdateItemHook extends BaseItemHook {
    static get type(): "update-item" {
        return "update-item";
    }

    get events(): ["update-item-event"] {
        return ["update-item-event"];
    }

    get eventName(): string {
        return "updateItem";
    }
}

export { UpdateItemHook };
