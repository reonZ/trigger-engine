import { IconObject } from "_zod";
import { BaseEventNode, BuiltinsOutputEntry } from "engine";
import { R } from "foundry-helpers";

class TestEvent extends BaseEventNode<never, { targets: BaseTargetDocuments[] }> {
    static get functionPath(): string {
        return "game.triggerEngine.test";
    }

    static get type(): "test-event" {
        return "test-event";
    }

    static get tags(): string[] {
        return ["debug"];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [{ key: "targets", type: "target", isArray: true }];
    }

    get icon(): IconObject {
        return { unicode: "\ue4f3" };
    }

    get subtitle(): string {
        return `${TestEvent.functionPath}()`;
    }

    _execute(): Promise<boolean> {
        const targets = R.pipe(
            canvas.tokens.controlled,
            R.map((token): BaseTargetDocuments | null => {
                const actor = token.actor;
                return actor ? { actor, token: token.document } : null;
            }),
            R.filter(R.isTruthy),
        );

        this.setOutputValue("targets", targets);

        return this.executeNext("out");
    }
}

export { TestEvent };
