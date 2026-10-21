import { NodeOnCreateData, SPECIAL_CATEGORY, TriggerNode } from "engine";
import { R, waitDialog } from "foundry-helpers";

abstract class BaseSpecialNode<
    TOuts extends string | never = string,
    TInputs extends Record<string, any> | never = Record<string, any>,
    TOutputs extends Record<string, any> | never = Record<string, any>,
    TCustomInputs extends string | never = string,
    TCustomOutputs extends string | never = string,
    TState extends string | never = string,
> extends TriggerNode<TOuts, TInputs, TOutputs, TCustomInputs, TCustomOutputs, TState> {
    static get category(): string {
        return SPECIAL_CATEGORY;
    }

    static simpleTypeDialog({ availableTypes }: NodeOnCreateData) {
        return waitDialog<{ type: string }>({
            content: "edit-entry",
            data: { types: R.sortBy(availableTypes, R.prop("label")) },
            i18n: R.join(["builtins.node", this.category, this.type, "dialog"], "."),
        });
    }

    get headerColor(): ColorSource {
        return "#b07528";
    }
}

export { BaseSpecialNode };
