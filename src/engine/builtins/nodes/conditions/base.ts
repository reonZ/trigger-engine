import { IconObject } from "_zod";
import { BridgeSchemaInput, BuiltinsOutputEntry, loopAfterSchema, TriggerNode } from "engine";

class BaseConditionNode<
    TInputs extends Record<string, any> = Record<string, any>,
    TOutputs extends { boolean: boolean } = { boolean: boolean },
    TCustomInputs extends string = string,
    TCustomOutputs extends string = string,
    TOuts extends "true" | "false" | "out" | (string & {}) = "true" | "false" | "out",
> extends TriggerNode<TOuts, TInputs, TOutputs, TCustomInputs, TCustomOutputs, "split" | "boolean"> {
    static get category(): string {
        return "condition";
    }

    static get states(): string[] | null {
        return ["split", "boolean"];
    }

    static get defineOuts(): BridgeSchemaInput[] {
        return [
            { key: "true", state: "split" },
            { key: "false", state: "split" },
            { key: "out", state: "boolean" },
        ];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [{ key: "boolean", type: "boolean", state: "boolean" }];
    }

    get headerColor(): ColorSource {
        return "#188600";
    }

    get icon(): Maybe<string | IconObject> {
        return { unicode: "\ue14f" };
    }

    async execute(out: "true" | "false", ...args: any[]): Promise<boolean> {
        if (this.state === "boolean") {
            this.setOutputValue("boolean", out === "true");
            return this.executeNext("out" as TOuts, ...args);
        } else {
            return this.executeNext(out as TOuts, ...args);
        }
    }

    async executeIf(condition?: boolean): Promise<boolean> {
        return this.execute(condition ? "true" : "false");
    }
}

class BaseConditionNodeWithAfter<
    TInputs extends Record<string, any> = Record<string, any>,
    TOutputs extends { boolean: boolean } = { boolean: boolean },
    TCustomInputs extends string = string,
    TCustomOutputs extends string = string,
> extends BaseConditionNode<TInputs, TOutputs, TCustomInputs, TCustomOutputs, "true" | "false" | "out" | "after"> {
    static get defineOuts(): BridgeSchemaInput[] {
        return [...super.defineOuts, loopAfterSchema()];
    }

    async excuteFalse(): Promise<boolean> {
        await this.execute("false");
        return this.executeNext("after");
    }
}

export { BaseConditionNode, BaseConditionNodeWithAfter };
