import { IconObject } from "_zod";
import { TriggerNode } from "engine";
import { CompendiumIndexData, localize, R, SYSTEM } from "foundry-helpers";
import { PF2eInputEntry } from "pf2e";

function doubleUuidSchemas(state?: string): PF2eInputEntry[] {
    return R.map(["pf2e", "sf2e"] as const, (id): PF2eInputEntry => {
        return { key: id, type: "text", state, label: localize.path("pf2e-trigger.shared.uuid", id, "title") };
    });
}

function getDoubleUuidValue(this: TriggerNode<any, DoubleUuidInputs>): Promise<string> {
    return this.getInputValue(SYSTEM.id);
}

function getLocalItemFromSourceUuid(this: TriggerNode<any, DoubleUuidInputs>): CompendiumIndexData | undefined | null {
    const uuid = this.getLocalValue(SYSTEM.id);
    if (!uuid) return;

    const item = fromUuidSync<CompendiumIndexData>(uuid, { strict: false });
    if (!item) return null;

    return item instanceof Item || foundry.utils.parseUuid(item.uuid)?.type === "Item" ? item : null;
}

function getIconFromDoubleUuid(
    this: TriggerNode<any, DoubleUuidInputs>,
    fallback: Maybe<string | IconObject>,
): Maybe<string | IconObject> {
    const item = getLocalItemFromSourceUuid.call(this);
    return item === null ? { unicode: "\uf127" } : (item?.img ?? fallback);
}

type DoubleUuidInputs = {
    pf2e: string;
    sf2e: string;
};

export { getIconFromDoubleUuid, getLocalItemFromSourceUuid, getDoubleUuidValue, doubleUuidSchemas };
export type { DoubleUuidInputs };
