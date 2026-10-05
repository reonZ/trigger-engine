import {
    CreateCombatantHook,
    CreateItemHook,
    CreateTokenHook,
    DeleteCombatantHook,
    DeleteItemHook,
    DeleteTokenHook,
    ExecuteHook,
    HookCalledHook,
    MoveTokenHook,
    RegionHook,
    TestHook,
    UpdateItemHook,
} from ".";

export * from "./base-single-hook";
export * from "./base-combatant";
export * from "./base-item";
export * from "./base-token";
export * from "./create-combatant";
export * from "./create-item";
export * from "./create-token";
export * from "./delete-combatant";
export * from "./delete-item";
export * from "./delete-token";
export * from "./execute-hook";
export * from "./hook-called";
export * from "./move-token";
export * from "./trigger-region";
export * from "./test-hook";
export * from "./update-item";

export default [
    CreateCombatantHook,
    CreateItemHook,
    CreateTokenHook,
    DeleteCombatantHook,
    DeleteItemHook,
    DeleteTokenHook,
    ExecuteHook,
    HookCalledHook,
    MoveTokenHook,
    RegionHook,
    TestHook,
    UpdateItemHook,
] as const;
