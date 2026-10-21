import { TriggerNode } from "engine";
import { R } from "foundry-helpers";

async function parseJSONCustomInputValues<K extends string, T extends TriggerNode<any, any, any, K>>(
    this: T,
    customKey: K,
) {
    return R.map(await this.getCustomInputsValues(customKey), (raw) => {
        try {
            return JSON.parse(raw);
        } catch {}
    });
}

export { parseJSONCustomInputValues };
