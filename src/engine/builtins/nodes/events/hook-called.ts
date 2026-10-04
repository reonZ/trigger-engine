import { BaseEventNode, BuiltinsCustomEntry, BuiltinsInputEntry } from "engine";
import { R } from "foundry-helpers";

class HookCalledEvent extends BaseEventNode<Inputs, never, "output"> {
    static get type(): "hook-called-event" {
        return "hook-called-event";
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            { key: "name", type: "text" },
            { key: "gm", type: "boolean" },
        ];
    }

    static get defineCustomOutputs(): BuiltinsCustomEntry[] {
        return [{ slug: "output", array: true }];
    }

    _execute(args: any[]): Promise<boolean> {
        const userId = args.at(-1);
        const user = R.isString(userId) ? game.users.get(userId) : null;

        if (user) {
            this.userContext = user;
        }

        this.setCustomOutputValues("output", args);
        return this.executeNext("out");
    }
}

type Inputs = {
    name: string;
};

export { HookCalledEvent };
