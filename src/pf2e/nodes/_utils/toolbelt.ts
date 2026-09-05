import { localize } from "foundry-helpers";
import { PF2eInputEntry, PF2eOutputEntry } from "pf2e";

function toolbeltTargetsEntry(): PF2eOutputEntry | PF2eInputEntry {
    return {
        key: "targets",
        type: "target",
        isArray: true,
        label: localize("pf2e-trigger.shared.toolbelt.targets.title"),
        tooltip: localize("pf2e-trigger.shared.toolbelt.targets.tooltip"),
    };
}

export { toolbeltTargetsEntry };
