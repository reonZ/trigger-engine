import { NodeEntry } from "engine";
import { R } from "foundry-helpers";

class UserEntry extends NodeEntry<User | undefined> {
    static get type(): "user" {
        return "user";
    }

    static get default(): undefined {
        return undefined;
    }

    static get color(): ColorSource {
        return 0x1682c9;
    }

    static isValidType(value: unknown): value is User {
        return value instanceof User;
    }

    static toJSON(value: User): string {
        return value.id;
    }

    static async fromJSON(value: unknown): Promise<User | undefined> {
        return R.isString(value) ? game.users.get(value) : undefined;
    }
}

export { UserEntry };
