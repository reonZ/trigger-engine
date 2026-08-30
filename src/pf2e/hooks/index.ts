import { TriggerHook } from "engine";
import {
    AuraHook,
    CreateMessageHook,
    CreateRegionHook,
    PF2eTriggerEngineRegionBehaviorType,
    ToolbeltSaveHook,
    TurnEndHook,
    TurnStartHook,
    UpdateMessageHook,
} from ".";

export * from "./aura-hook";
export * from "./create-message";
export * from "./create-region";
export * from "./toolbelt-save";
export * from "./trigger-region";
export * from "./turn-end";
export * from "./turn-start";
export * from "./update-message";

export default [
    AuraHook,
    CreateMessageHook,
    CreateRegionHook,
    PF2eTriggerEngineRegionBehaviorType,
    ToolbeltSaveHook,
    TurnEndHook,
    TurnStartHook,
    UpdateMessageHook,
] as (typeof TriggerHook)[];
