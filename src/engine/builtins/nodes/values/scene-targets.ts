import { BuiltinsInputEntry, BuiltinsOutputEntry } from "engine";
import { BaseValueNode } from ".";
import { MODULE } from "foundry-helpers";

const DEFAULT_CALLBACK = `/**
 * @param {{actor: Actor; token: TokenDocument}} target
 * @returns {boolean}
 *
 * @example
 * return target.actor.type === "npc";
 */
return true;`;

class SceneTargetsValueNode extends BaseValueNode<BaseTargetDocuments[], Inputs> {
    static get type(): "scene-targets" {
        return "scene-targets";
    }

    static get tags(): string[] {
        return ["token"];
    }

    static get defineInputs(): [BuiltinsInputEntry] {
        return [
            {
                key: "callback",
                type: "text",
                field: {
                    type: "javascript",
                    default: DEFAULT_CALLBACK,
                },
            },
        ];
    }

    static get defineOutputs(): [BuiltinsOutputEntry] {
        return [{ key: "targets", type: "target", isArray: true }];
    }

    async _getValue(): Promise<BaseTargetDocuments[]> {
        const code = (await this.getInputValue("callback")) || "return true;";
        const scene = this.sceneContext ?? game.scenes.active;
        const targets = scene?.tokens.map((token): BaseTargetDocuments | undefined => {
            const actor = token.actor;
            return actor ? { actor, token } : undefined;
        });

        try {
            const Fn = function () {}.constructor as SyncFunction;
            const callback = new Fn("target", code);

            return targets?.filter((target): target is BaseTargetDocuments => !!target && callback(target)) ?? [];
        } catch (error: any) {
            MODULE.error(
                `an error occured in the node "${this.type}" (${this.id}) of the trigger "${this.triggerPath}"`,
                error,
            );

            return [];
        }
    }
}

type SyncFunction = {
    new (...args: any[]): (target: BaseTargetDocuments) => boolean;
};

type Inputs = {
    callback: string;
};

export { SceneTargetsValueNode };
