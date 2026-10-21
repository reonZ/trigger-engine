import {
    BuiltInApplication,
    NodeEntry,
    NodeField,
    TriggerApplication,
    TriggerEngineRegionBehaviorType,
    TriggerHook,
    TriggerNode,
} from "engine";
import { MODULE, R, registerSetting, SYSTEM } from "foundry-helpers";
import { PF2eTriggerEngineRegionBehaviorType, registerPF2eApplication } from "pf2e";
import { onUserQuery } from "queries";
import { id } from "../module.json";

MODULE.register(id);

Hooks.once("init", () => {
    registerSetting("stretched", {
        type: Boolean,
        default: false,
        scope: "user",
        config: false,
        onChange: (value: boolean) => {
            const app = foundry.applications.instances.get("trigger-engine-blueprint");
            app?.element.classList.toggle("stretched", value);
        },
    });

    CONFIG.queries[MODULE.path("user-query")] = onUserQuery;

    // we register the pf2e-trigger application
    if (SYSTEM.isPathfinder) {
        registerPF2eApplication();
    }

    const builtIns = R.pipe(
        ["convertors", "entries", "hooks", "nodes"] as const,
        R.map((property) => [property, R.map(BuiltInApplication[property], ([key]) => key)] as const),
        R.fromEntries(),
    );

    // we allow third party to register their own application
    Hooks.callAll("triggerEngine.registerApplication", TriggerApplication.register.bind(TriggerApplication), builtIns);

    // if there is no application in this world (excluding trigger-animations), then let's create a generic one for the system
    TriggerApplication.registerGeneric();

    // we allow third party to register extra nodes for an application
    Hooks.callAll("triggerEngine.registerNodes", TriggerApplication.registerNodes.bind(TriggerApplication));

    // we allow third party to register triggers for an existing application
    Hooks.callAll("triggerEngine.registerTriggers", TriggerApplication.registerTriggers.bind(TriggerApplication));

    if (game.system.id !== "swade") {
        const regionPath = MODULE.path("builtins.region");
        // we have a different region behavior for pf2e system
        CONFIG.RegionBehavior.dataModels[regionPath] = SYSTEM.isPathfinder
            ? PF2eTriggerEngineRegionBehaviorType
            : TriggerEngineRegionBehaviorType;
        CONFIG.RegionBehavior.typeIcons[regionPath] = "fa-solid fa-land-mine-on";
    }
});

Hooks.once("ready", async () => {
    // we prepare the module triggers
    await TriggerApplication.prepareModulesTriggers();
    // we prepare all the applications once foundry is ready
    await TriggerApplication.prepareApplications();

    // we alert third party that everything is ready now
    Hooks.callAll("triggerEngine.ready");
});

MODULE.apiExpose("openBlueprintMenu", TriggerApplication.openBlueprintMenu.bind(TriggerApplication));

globalThis.triggerEngine = {
    NodeEntry,
    NodeField,
    TriggerHook,
    TriggerNode,
};
