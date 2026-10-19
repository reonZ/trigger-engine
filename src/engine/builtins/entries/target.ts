import { NodeEntry } from "engine";
import { ActorUUID, R, TokenDocumentUUID, getTokenDocument, isValidTargetDocuments } from "foundry-helpers";

class TargetEntry extends NodeEntry<BaseTargetDocuments | undefined> {
    static get type(): "target" {
        return "target";
    }

    static get default(): undefined {
        return undefined;
    }

    static get color(): ColorSource {
        return 0xff3075;
    }

    static castValue(value: unknown): unknown {
        if (value instanceof Actor) {
            return {
                actor: value,
                token: value.token,
            };
        }

        const token = getTokenDocument(value);
        const actor = token?.actor;

        if (actor) {
            return { actor, token };
        }

        return value;
    }

    static isValidType(value: unknown): value is BaseTargetDocuments {
        return isValidTargetDocuments(value);
    }

    static toJSON(value: BaseTargetDocuments): { actor: ActorUUID; token?: TokenDocumentUUID } {
        return {
            actor: value.actor.uuid,
            token: value.token?.uuid,
        };
    }

    static async fromJSON(value: { actor: string; token?: string }): Promise<BaseTargetDocuments | undefined> {
        const actor = R.isObjectType(value) ? await fromUuid<Actor>(value.actor) : undefined;
        if (!(actor instanceof Actor)) return;

        const token = value.token && (await fromUuid<TokenDocument>(value.token));

        return {
            actor,
            token: token instanceof TokenDocument ? token : undefined,
        };
    }
}

export { TargetEntry };
