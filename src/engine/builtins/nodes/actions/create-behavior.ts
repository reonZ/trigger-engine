import { IconObject } from "_zod";
import { BaseActionNode, BuiltinsInputEntry } from "engine";
import { R, splitListString } from "foundry-helpers";

class CreateBehaviorActionNode<
    TState extends CreateBehaviorState | (string & {}) = CreateBehaviorState,
> extends BaseActionNode<"out", CreateBehaviorInputs, never, never, never, TState> {
    static get type(): "create-behavior" {
        return "create-behavior";
    }

    static get tags(): string[] {
        return ["region"];
    }

    static get states(): string[] {
        return ["source", "trigger"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            { key: "region", type: "region" },
            { key: "name", type: "text" },
            { key: "type", type: "text", state: "source" },
            {
                key: "source",
                type: "text",
                field: { type: "json" },
                state: "source",
            },
            {
                key: "events",
                type: "text",
                field: { default: "tokenEnter, tokenExit" },
                state: "trigger",
            },
            {
                key: "path",
                type: "text",
                state: "trigger",
            },
        ];
    }

    get icon(): IconObject {
        return { unicode: "\ue59d", fontWeight: "900" };
    }

    get subtitle(): Maybe<string> {
        return this.state === "source" ? super.subtitle : this.localize(`states.${this.state}`);
    }

    async _execute(): Promise<boolean> {
        const region = await this.getInputValue("region");
        const type = await this._getType();

        if (!region || !(type in CONFIG.RegionBehavior.dataModels)) {
            return this.executeNext("out");
        }

        const source: PreCreate<RegionBehavior["_source"]> = {
            name: (await this.getInputValue("name")) || RegionBehavior.defaultName({ type, parent: region }),
            system: await this._getSystemSource(),
            type,
        };

        if (testBehaviorSource(source)) {
            await region.createEmbeddedDocuments("RegionBehavior", [source]);
        }

        return this.executeNext("out");
    }

    async _getSystemSource(): Promise<PreCreate<RegionBehavior["_source"]>["system"]> {
        if (this.state === "source") {
            try {
                const sourceStr = await this.getInputValue("source");
                return JSON.parse(sourceStr);
            } catch {}
        } else if (this.state === "trigger") {
            const events = await this.getInputValue("events");

            return {
                events: splitListString(events),
                path: (await this.getInputValue("path")) || this.triggerPath,
            };
        }

        return {};
    }

    async _getType(): Promise<string> {
        switch (this.state) {
            case "source":
                return this.getInputValue("type");
            case "trigger":
                return "trigger-engine.builtins.region";
            default:
                return "";
        }
    }
}

function testBehaviorSource(source: any): boolean {
    try {
        const BehaviorCls = R.isString(source.type) ? CONFIG.RegionBehavior.dataModels[source.type] : null;
        if (!BehaviorCls) return false;

        const instance = new BehaviorCls(source);
        return !instance.invalid;
    } catch {
        return false;
    }
}

type CreateBehaviorInputs = Record<string, any> & {
    events: string;
    name: string;
    path: string;
    region?: RegionDocument;
    source: string;
    type: string;
};

type CreateBehaviorState = "source" | "trigger";

export { CreateBehaviorActionNode, testBehaviorSource };
export type { CreateBehaviorState };
