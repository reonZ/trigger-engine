import {
    CreateCombatantEvent,
    CreateItemEvent,
    CreateTokenEvent,
    DeleteCombatantEvent,
    DeleteItemEvent,
    DeleteTokenEvent,
    ExecuteEvent,
    HookCalledEvent,
    MoveTokenEvent,
    RegionEvent,
    TestEvent,
    UpdateItemEvent,
} from ".";

export * from "./base";
export * from "./base-combatant";
export * from "./base-item";
export * from "./base-token";
export * from "./create-combatant";
export * from "./create-item";
export * from "./create-token";
export * from "./delete-combatant";
export * from "./delete-item";
export * from "./delete-token";
export * from "./execute-event";
export * from "./hook-called";
export * from "./move-token";
export * from "./region-event";
export * from "./start-event";
export * from "./test-event";
export * from "./update-item";

export default [
    CreateCombatantEvent,
    CreateItemEvent,
    CreateTokenEvent,
    DeleteCombatantEvent,
    DeleteItemEvent,
    DeleteTokenEvent,
    ExecuteEvent,
    HookCalledEvent,
    MoveTokenEvent,
    RegionEvent,
    TestEvent,
    UpdateItemEvent,
] as const;
