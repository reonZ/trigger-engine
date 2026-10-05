import { BuiltinsCustomEntry, CONSOLE_LOG } from "engine";
import { MODULE } from "foundry-helpers";
import { BaseActionNode } from ".";
import { IconObject } from "_zod";

class ConsoleLogActionNode extends BaseActionNode<"out", never, never, "input"> {
    static get type(): typeof CONSOLE_LOG {
        return CONSOLE_LOG;
    }

    static get tags(): string[] {
        return ["debug"];
    }

    static get aliases(): string[] {
        return ["debug"];
    }

    static get defineCustomInputs(): BuiltinsCustomEntry[] {
        return [{ slug: "input", array: true }];
    }

    get icon(): IconObject {
        return { unicode: "\uf120" };
    }

    async _execute(): Promise<boolean> {
        const values = await this.getCustomInputs("input");

        MODULE.group(this.nodePath);
        MODULE.log(`sceneContext`, this.sceneContext);
        MODULE.log(`userContext`, this.userContext);
        for (const { label, value } of values) {
            MODULE.log(`${label}:`, value);
        }
        MODULE.groupEnd();

        return this.executeNext("out");
    }
}

export { ConsoleLogActionNode };
