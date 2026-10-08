import * as TriggerEngine from "./engine/index";
import {
    BuiltInApplication,
    TriggerApplicationCollection,
    NodeEntry as _NodeEntry,
    NodeField as _NodeField,
    TriggerHook as _TriggerHook,
    TriggerNode as _TriggerNode,
} from "./engine/index";

declare module "@7h3laughingman/foundry-types/client/game.mjs" {
    export default interface Game<TActor, TActors, TChatMessage, TCombat, TItem, TMacro, TScene, TUser> {
        triggerEngine?: {
            api: {
                openBlueprintMenu: typeof TriggerEngine.TriggerApplication.openBlueprintMenu;
            };
        };
    }
}

declare module "@7h3laughingman/pf2e-types" {
    interface GamePF2e {
        triggerEngine?: {
            api: {
                openBlueprintMenu: typeof TriggerEngine.TriggerApplication.openBlueprintMenu;
            };
        };
    }
}

declare global {
    namespace triggerEngine {
        const NodeEntry: typeof _NodeEntry;
        const NodeField: typeof _NodeField;
        const TriggerHook: typeof _TriggerHook;
        const TriggerNode: typeof _TriggerNode;
    }

    namespace Hooks {
        interface HookConfig {
            "triggerEngine.registerApplication": [
                register: typeof TriggerEngine.TriggerApplication.register,
                builtInKeys: BuiltInKeys,
            ];
            "triggerEngine.registerNodes": [registerNodes: typeof TriggerEngine.TriggerApplication.registerNodes];
            "triggerEngine.registerTriggers": [
                registerTriggers: typeof TriggerEngine.TriggerApplication.registerTriggers,
            ];
        }
    }
}

type BuiltInKeys = { [k in TriggerApplicationCollection]: (typeof BuiltInApplication)[k][number][0][] };

export type { TriggerEngine };
