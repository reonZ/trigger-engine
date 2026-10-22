import { IconObject } from "_zod";
import { BaseCanvasActionNode, BaseCanvasInputs, BaseCanvasSocketArgs, BuiltinsInputEntry } from "engine";
import { pan } from "foundry-helpers";

class PanSceneActionNode extends BaseCanvasActionNode<PanSocketArgs, Inputs> {
    static get type(): "pan-scene" {
        return "pan-scene";
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [...super.defineInputs, { key: "ping", type: "boolean" }];
    }

    static onSocket(data: PanSocketArgs) {
        const user = game.users.get(data.user);
        pan(data.position, { ...data, user });
    }

    get icon(): IconObject {
        return { unicode: "\uf065" };
    }

    async _execute(): Promise<boolean> {
        const ping = await this.getInputValue("ping");
        const position = await this.getInputValue("position");
        const { hasSelf, otherUsers } = await this.getUsersData();

        if (hasSelf) {
            pan(position, { ping });
        }

        this.emitSocket(otherUsers, position, { ping });

        return this.executeNext("out");
    }
}

type Inputs = BaseCanvasInputs & {
    ping: boolean;
};

type PanSocketArgs = BaseCanvasSocketArgs<"pan-scene"> & {
    ping?: boolean;
};

export { PanSceneActionNode };
export type { PanSocketArgs };
