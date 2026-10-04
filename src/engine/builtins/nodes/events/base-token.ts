import { BaseEventNode, BuiltinsOutputEntry, TokenEventOptions } from "engine";

abstract class BaseTokenEvent extends BaseEventNode<never, { target: TargetDocuments }> {
    static get tags(): string[] {
        return ["token"];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [{ key: "target", type: "target" }];
    }

    async _execute({ target, user }: TokenEventOptions): Promise<boolean> {
        this.sceneContext = target.token;
        this.userContext = user;
        this.setOutputValue("target", target);
        return this.executeNext("out");
    }
}

export { BaseTokenEvent };
