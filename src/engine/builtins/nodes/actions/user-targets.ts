import { IconObject } from "_zod";
import { BuiltinsInputEntry, BuiltinsOutputEntry } from "engine";
import { BaseActionNode } from ".";
import { R } from "foundry-helpers";

class UserTargetsActionNode extends BaseActionNode<"out", Inputs, Outputs, never, never, "all" | "only"> {
    static get type(): "user-targets" {
        return "user-targets";
    }

    static get tags(): string[] {
        return ["user", "token"];
    }

    static get states(): string[] {
        return ["all", "only"];
    }

    static get aliases(): string[] {
        return this.states.slice(1);
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [{ key: "user", type: "user" }];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [
            { key: "targets", type: "target", isArray: true, state: "all" },
            { key: "target", type: "target", state: "only" },
        ];
    }

    get title(): Maybe<string> {
        return this.localize(this.state === "only" ? "alias.only.title" : "title");
    }

    get icon(): IconObject {
        return { unicode: "\uf648" };
    }

    async _execute(): Promise<boolean> {
        const user = (await this.getInputValue("user")) ?? this.userContext;
        const userTargets = [...user.targets];

        if (this.state === "only") {
            const token = R.only(userTargets);
            const actor = token?.actor;

            if (actor) {
                this.setOutputValue("target", { actor, token: token.document });
            }
        } else {
            const targets = R.pipe(
                userTargets,
                R.map((token): BaseTargetDocuments | undefined => {
                    const actor = token.actor;
                    return actor ? { actor, token: token.document } : undefined;
                }),
                R.filter(R.isTruthy),
            );

            this.setOutputValue("targets", targets);
        }

        return this.executeNext("out");
    }
}

type Inputs = {
    user?: User;
};

type Outputs = {
    target: BaseTargetDocuments;
    targets: BaseTargetDocuments[];
};

export { UserTargetsActionNode };
