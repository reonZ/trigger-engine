import { R } from "foundry-helpers";
import { PersistentCollection } from ".";

export * from "./collection";

export const SPECIAL_NODES = R.indexBy([PersistentCollection], (Special) => Special.type);
