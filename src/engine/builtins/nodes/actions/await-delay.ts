import { IconObject } from "_zod";
import { BridgeSchemaInput, BuiltinsInputEntry, BuiltinsOutputEntry } from "engine";
import { waitTimeout } from "foundry-helpers";
import { BaseActionNode } from ".";
import { loopAfterSchemas } from "..";

class AwaitDelayActionNode extends BaseActionNode<"out" | "after", Inputs, Outputs, never, never, "delay" | "repeat"> {
    static get type(): "await-delay" {
        return "await-delay";
    }

    static get tags(): string[] {
        return ["time"];
    }

    static get states(): string[] {
        return ["delay", "repeat"];
    }

    static get aliases(): string[] {
        return this.states.slice(1);
    }

    static get defineOuts(): BridgeSchemaInput[] {
        return loopAfterSchemas("repeat");
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            {
                key: "delay",
                type: "number",
                field: {
                    default: 100,
                    min: 0,
                    step: 1,
                },
            },
            {
                key: "repeat",
                type: "number",
                state: "repeat",
                field: {
                    default: 2,
                    min: 1,
                    max: 10,
                    step: 1,
                },
            },
            { key: "start", type: "boolean", state: "repeat" },
        ];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [{ key: "index", type: "number", state: "repeat" }];
    }

    get title(): string {
        return this.localize(this.state === "repeat" ? "alias.repeat.title" : "title") as string;
    }

    get canDelay(): boolean {
        return true;
    }

    get isLoop(): boolean {
        return this.state === "repeat";
    }

    get icon(): IconObject {
        return { unicode: "\uf120" };
    }

    async _execute(): Promise<boolean> {
        const delay = await this.getInputValue("delay");
        const isRepeat = this.state === "repeat";
        const repeat = isRepeat ? await this.getInputValue("repeat") : 1;

        if (repeat === 1) {
            await waitTimeout(delay);
            await this.executeNext("out");
            return isRepeat ? this.executeNext("after") : true;
        }

        let index = Number(await this.getInputValue("start"));
        const limit = repeat + index;

        await new Promise((resolve) => {
            const interval = setInterval(async () => {
                this.setOutputValue("index", index++);

                const keepExecuting = await this.executeNext("out");

                if (!keepExecuting || index === limit) {
                    clearInterval(interval);
                    resolve(true);
                }
            }, delay);
        });

        return this.executeNext("after");
    }
}

type Inputs = {
    delay: number;
    repeat: number;
    start: boolean;
};

type Outputs = {
    index: number;
};

export { AwaitDelayActionNode };
