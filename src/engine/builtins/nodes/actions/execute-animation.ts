import { BuiltinsCustomEntry, BuiltinsInputEntry, UserValue } from "engine";
import { BaseActionNode } from ".";
import { IconObject } from "_zod";
import { R, UserPF2e } from "foundry-helpers";

class ExecuteAnimationActionNode extends BaseActionNode<"out", Inputs, never, "input"> {
    static get type(): "execute-animation" {
        return "execute-animation";
    }

    static get tags(): string[] {
        return ["animation"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            { key: "name", type: "text" },
            { key: "actor", type: "target" },
            { key: "sources", type: "target", isArray: true },
            { key: "targets", type: "target", isArray: true },
            { key: "item", type: "item" },
            { key: "options", type: "text", isArray: true },
            { key: "await", type: "boolean" },
            { key: "user", type: "user" },
        ];
    }

    static override get defineCustomInputs(): BuiltinsCustomEntry[] {
        return [{ group: "custom", slug: "input", array: true }];
    }

    get headerColor(): ColorSource {
        return "#009690";
    }

    get icon(): IconObject {
        return { unicode: "\uf03d" };
    }

    get module(): Maybe<string> {
        return this.localize("module");
    }

    async _execute(): Promise<boolean> {
        if (!R.isFunction(triggerAnimations?.api?.runFromTrigger)) {
            return this.executeNext("out");
        }

        const animationCall = triggerAnimations.api.runFromTrigger({
            actor: await this.getInputValue("actor"),
            item: await this.getInputValue("item"),
            name: await this.getInputValue("name"),
            options: await this.getInputValue("options"),
            sources: await this.getInputValue("sources"),
            targets: await this.getInputValue("targets"),
            user: (await this.getInputValue("user")) ?? this.userContext,
            userInputs: await this.getCustomInputs("input"),
        });

        if (await this.getInputValue("await")) {
            await animationCall;
        }

        return this.executeNext("out");
    }
}

type Inputs = {
    actor?: TargetDocuments;
    await: boolean;
    item?: Item;
    name: string;
    options: string[];
    sources: TargetDocuments[];
    targets: TargetDocuments[];
    user?: UserPF2e;
};

declare global {
    namespace triggerAnimations {
        interface API {
            runFromTrigger(data: StartNodeOptions): Promise<void>;
        }

        const api: API;

        type StartNodeOptions = {
            actor: TargetDocuments | undefined;
            item: Item | undefined;
            name: string;
            options: string[];
            sources: TargetDocuments[];
            targets: TargetDocuments[];
            user: User;
            userInputs: UserValue[];
        };
    }
}

export { ExecuteAnimationActionNode };
