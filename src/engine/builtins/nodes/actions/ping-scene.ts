import { IconObject } from "_zod";
import { BaseCanvasActionNode, BaseCanvasInputs, BaseCanvasSocketArgs, BuiltinsInputEntry } from "engine";
import { ping } from "foundry-helpers";

class PingSceneActionNode extends BaseCanvasActionNode<PingSocketArgs, Inputs> {
    static get type(): "ping-scene" {
        return "ping-scene";
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            ...super.defineInputs,
            {
                key: "instances",
                type: "number",
                field: {
                    default: 1,
                    min: 1,
                    max: 5,
                    step: 1,
                },
            },
            {
                key: "delay",
                type: "number",
                field: {
                    default: 1000,
                    min: 100,
                    max: 2000,
                    step: 50,
                },
            },
        ];
    }

    static onSocket(data: PingSocketArgs) {
        const user = game.users.get(data.user);
        ping(data.position, { ...data, local: true, user });
    }

    get icon(): IconObject {
        return { unicode: "\uf8dd" };
    }

    async _execute(): Promise<boolean> {
        const delay = await this.getInputValue("delay");
        const instances = await this.getInputValue("instances");
        const position = await this.getInputValue("position");
        const { hasSelf, otherUsers } = await this.getUsersData();

        if (hasSelf) {
            ping(position, { delay, instances, local: true });
        }

        this.emitSocket(otherUsers, position, { delay, instances });

        return this.executeNext("out");
    }
}

type Inputs = BaseCanvasInputs & {
    delay: number;
    instances: number;
};

type PingSocketArgs = BaseCanvasSocketArgs<"ping-scene"> & {
    delay: number;
    instances: number;
};

export { PingSceneActionNode };
export type { PingSocketArgs };
