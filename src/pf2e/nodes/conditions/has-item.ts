import { IconObject } from "_zod";
import { ActorPF2e, ItemPF2e, findItemWithSourceId } from "foundry-helpers";
import { PF2eInputEntry } from "pf2e";
import {
    BaseHasItemConditionNode,
    DoubleUuidInputs,
    doubleUuidSchemas,
    getDoubleUuidValue,
    getIconFromDoubleUuid,
    getLocalItemFromSourceUuid,
} from "..";

class HasItemConditionNode extends BaseHasItemConditionNode<Inputs> {
    static get type(): "has-item" {
        return "has-item";
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [...BaseHasItemConditionNode.defineInputs, ...doubleUuidSchemas()];
    }

    get title(): Maybe<string> {
        return getLocalItemFromSourceUuid.call(this)?.name ?? super.title;
    }

    get subtitle(): Maybe<string> {
        return getLocalItemFromSourceUuid.call(this) ? super.title : super.subtitle;
    }

    get icon(): IconObject | string | null {
        return getIconFromDoubleUuid.call(this, super.icon);
    }

    async getItem<T extends ActorPF2e>(actor: T): Promise<ItemPF2e<T> | null> {
        const uuid = await getDoubleUuidValue.call(this);
        return findItemWithSourceId(actor, uuid);
    }
}

type Inputs = DoubleUuidInputs & {
    target?: TargetDocuments;
};

export { HasItemConditionNode };
