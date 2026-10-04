import { BaseEventNode, BuiltinsInputEntry, BuiltinsOutputEntry, ItemEventOptions } from "engine";
import { localize, R, splitListString } from "foundry-helpers";

abstract class BaseItemEvent extends BaseEventNode<Inputs, Outputs> {
    static get tags(): string[] {
        return ["item"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            {
                key: "type",
                type: "text",
                label: localize.path("builtins.shared.item-event.type.label"),
                tooltip: localize.path("builtins.shared.item-event.type.tooltip"),
            },
        ];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [
            { key: "item", type: "item" },
            { key: "parent", type: "target" },
        ];
    }

    async _execute({ item, parent, user }: ItemEventOptions): Promise<boolean> {
        const type = await this.getInputValue("type");
        const types = splitListString(type);
        if (types.length && !R.isIncludedIn(item.type, types)) return false;

        this.userContext = user;
        this.setOutputValue("item", item);
        this.setOutputValue("parent", parent);

        return this.executeNext("out");
    }
}

type Inputs = {
    type: string;
};

type Outputs = ItemEventOptions;

export { BaseItemEvent };
