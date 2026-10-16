import { BuiltinsInputEntry } from "engine";
import { BaseActionNode } from ".";
import { IconObject } from "_zod";

class UpdateItemActionNode extends BaseActionNode<"out", Inputs, never, never, never, "regular" | "array"> {
    static get type(): "update-item" {
        return "update-item";
    }

    static get tags(): string[] {
        return ["item"];
    }

    static get states(): string[] | null {
        return ["regular", "array"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            { key: "item", type: "item" },
            { key: "path", type: "text" },
            { key: "value", type: "any", state: "regular" },
            { key: "values", type: "any", isArray: true, state: "array" },
        ];
    }

    get icon(): IconObject {
        return { unicode: "\uf044" };
    }

    get specialIcons(): { icon: IconObject; name?: string }[] | null {
        return [{ icon: { unicode: "\uf071", fontWeight: "900" }, name: "warning" }];
    }

    async _execute(): Promise<boolean> {
        const item = await this.getInputValue("item");
        const path = await this.getInputValue("path");

        if (!item || item.pack || !path) {
            return this.executeNext("out");
        }

        const value = await this.getInputValue(this.state === "array" ? "values" : "value");
        const systemPath = path.startsWith("system.") ? path : `system.${path}`;

        if (/^system(.\w+)+$/.test(systemPath)) {
            await item.update({ [systemPath]: value });
        }

        return this.executeNext("out");
    }
}

type Inputs = {
    item?: Item;
    path: string;
    value: any;
    values: any[];
};

export { UpdateItemActionNode };
