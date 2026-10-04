import { IconObject } from "_zod";
import { BaseEventNode, START_EVENT_TYPE } from "engine";

class _StartEventNode extends BaseEventNode {
    static get type(): string {
        return START_EVENT_TYPE;
    }

    get icon(): IconObject {
        return {
            unicode: "\uf11e",
            fontWeight: "900",
        };
    }

    _execute(): Promise<boolean> {
        return this.executeNext("out");
    }
}

export { _StartEventNode };
