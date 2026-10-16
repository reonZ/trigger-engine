import {
    BaseExtractorNode,
    BridgeSchemaInput,
    BuiltinsCustomEntry,
    BuiltinsInputEntry,
    BuiltinsOutputEntry,
    loopAfterSchemas,
} from "engine";
import { MODULE } from "foundry-helpers";

const DEFAULT_CALLBACK = `/**
 * @param {{actor: Actor; token: TokenDocument}} target
 * @param {unknown[]} inputs
 * @returns {boolean}
 *
 * @example
 * const level = inputs[0];
 * return target.actor.level >= level;
 */
return true;`;

class FilterTargetsExtractorNode extends BaseExtractorNode<Inputs, Outputs, "input", never, States, "out" | "after"> {
    static get type(): "filter-targets" {
        return "filter-targets";
    }

    static get states(): string[] {
        return ["filter", "find", "loop"];
    }

    static get aliases(): string[] {
        return this.states.slice(1);
    }

    static get defineOuts(): BridgeSchemaInput[] {
        return loopAfterSchemas("loop");
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            { key: "targets", type: "target", isArray: true },
            {
                key: "callback",
                type: "text",
                field: {
                    type: "javascript",
                    default: DEFAULT_CALLBACK,
                },
            },
        ];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [
            { key: "targets", type: "target", state: "filter", isArray: true },
            { key: "target", type: "target", state: "find" },
            { key: "current", type: "target", state: "loop" },
        ];
    }

    static get defineCustomInputs(): BuiltinsCustomEntry[] {
        return [{ slug: "input", array: true }];
    }

    get isLoop(): boolean {
        return this.state === "loop";
    }

    get title(): Maybe<string> {
        return this.localize(this.state === "filter" ? "title" : `alias.${this.state}.title`);
    }

    async _execute(): Promise<boolean> {
        const code = (await this.getInputValue("callback")) || "return true;";
        const targets = await this.getInputValue("targets");
        const inputs = await this.getCustomInputsValues("input");

        try {
            const Fn = function () {}.constructor as SyncFunction;
            const callback = new Fn("target", "inputs", code);

            if (this.state === "loop") {
                for (const current of targets) {
                    const validTarget = callback(current, inputs);
                    if (!validTarget) continue;

                    this.setOutputValue("current", current);

                    const keepExecuting = await this.executeNext("out");
                    if (!keepExecuting) break;
                }

                return this.executeNext("after");
            } else if (this.state === "filter") {
                const newTargets = targets.filter((target) => callback(target, inputs));
                this.setOutputValue("targets", newTargets);
            } else {
                const target = targets.find((target) => callback(target, inputs));
                this.setOutputValue("target", target);
            }
        } catch (error: any) {
            if (error.name === "GateEntryReturn") {
                throw error;
            }

            MODULE.error(
                `an error occured in the node "${this.type}" (${this.id}) of the trigger "${this.triggerPath}"`,
                error,
            );
        }

        return this.executeNext("out");
    }
}

type SyncFunction = {
    new (...args: any[]): (target: BaseTargetDocuments, inputs: unknown[]) => boolean;
};

type States = "filter" | "find" | "loop";

type Inputs = {
    targets: BaseTargetDocuments[];
    callback: string;
};

type Outputs = {
    current?: BaseTargetDocuments;
    target?: BaseTargetDocuments;
    targets: BaseTargetDocuments[];
};

export { FilterTargetsExtractorNode };
