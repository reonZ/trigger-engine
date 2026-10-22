import { IconObject } from "_zod";
import { BaseActionNode, BuiltinsInputEntry } from "engine";
import { pan, R, socketEmit } from "foundry-helpers";

class PanSceneActionNode extends BaseActionNode<"out", Inputs> {
    static get type(): "pan-scene" {
        return "pan-scene";
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            { key: "position", type: "point" },
            { key: "ping", type: "boolean" },
            { key: "user", type: "user", isArray: true },
            { key: "all", type: "boolean" },
        ];
    }

    get icon(): IconObject {
        return { unicode: "\uf065" };
    }

    async _execute(): Promise<boolean> {
        const self = game.user;
        const all = await this.getInputValue("all");
        const ping = await this.getInputValue("ping");
        const position = await this.getInputValue("position");
        const selectedUsers = all ? game.users.contents : await this.getInputValue("user");
        const [[hasSelf], otherUsers] = R.partition(
            selectedUsers.length ? selectedUsers : [self],
            (user) => user === self,
        );

        if (hasSelf) {
            pan(position, { ping });
        }

        if (otherUsers.length) {
            socketEmit({
                _type: "pan-scene",
                _ids: otherUsers.map((user) => user.id),
                position,
                user: this.userContext.id,
                ping,
            } satisfies PanSocketArgs);
        }

        return this.executeNext("out");
    }
}

type Inputs = {
    all: boolean;
    ping: boolean;
    position: Point;
    user: User[];
};

type PanSocketArgs = {
    _type: "pan-scene";
    _ids: string[];
    user: string;
    ping?: boolean;
    position: Point;
};

export { PanSceneActionNode };
export type { PanSocketArgs };
