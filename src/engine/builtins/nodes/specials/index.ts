import { R } from "foundry-helpers";
import { PersistentCollectionSpecialNode, SelectIndexSpecialNode } from ".";

export * from "./base";
export * from "./collection";
export * from "./select-index";

export const SPECIAL_NODES = R.indexBy(
    [PersistentCollectionSpecialNode, SelectIndexSpecialNode],
    (Special) => Special.type,
);
