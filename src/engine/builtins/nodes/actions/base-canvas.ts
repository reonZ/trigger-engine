import { BaseActionNode, BuiltinsInputEntry } from "engine";
import { R, socketEmit } from "foundry-helpers";

class BaseCanvasActionNode<
    TArgs extends BaseCanvasSocketArgs<string>,
    TInputs extends BaseCanvasInputs,
> extends BaseActionNode<"out", TInputs> {
    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            { key: "position", type: "point" },
            { key: "user", type: "user", isArray: true },
            { key: "all", type: "boolean" },
        ];
    }

    async getUsersData(): Promise<{ hasSelf: boolean; otherUsers: User[] }> {
        const self = game.user;
        const all = await this.getInputValue("all");
        const selectedUsers: User[] = all ? game.users.contents : await this.getInputValue("user");
        const [[hasSelf], otherUsers] = R.partition(
            selectedUsers.length ? selectedUsers : [this.userContext],
            (user) => user === self,
        );

        return { hasSelf: !!hasSelf, otherUsers };
    }

    emitSocket(otherUsers: User[], position: Point, args: Omit<TArgs, keyof BaseCanvasSocketArgs<string>>) {
        if (!otherUsers.length) return;

        socketEmit({
            ...args,
            _type: this.type,
            _ids: otherUsers.map((user) => user.id),
            position,
            user: this.userContext.id,
        } as TArgs satisfies BaseCanvasSocketArgs<string>);
    }
}

type BaseCanvasInputs = {
    all: boolean;
    position: Point;
    user: User[];
};

type BaseCanvasSocketArgs<T extends string> = {
    _type: T;
    _ids: string[];
    user: string;
    position: Point;
};

export { BaseCanvasActionNode };
export type { BaseCanvasInputs, BaseCanvasSocketArgs };
