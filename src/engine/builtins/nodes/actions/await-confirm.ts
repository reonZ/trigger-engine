import {
    BridgeSchemaInput,
    BuiltinsInputEntry,
    DescriptionInputsData,
    descriptionSchemas,
    DescriptionState,
    descriptionStates,
    getDescriptionData,
    localizeKeyOrDescription,
} from "engine";
import { QueryUserArgs } from "queries";
import { AwaitDialogActionNode, QueryUserInputs } from ".";

class AwaitConfirmActionNode extends AwaitDialogActionNode<
    DescriptionInputsData,
    boolean,
    "true" | "false",
    Inputs,
    never,
    never,
    never,
    DescriptionState
> {
    static get type(): "await-confirm" {
        return "await-confirm";
    }

    static get states(): string[] {
        return descriptionStates;
    }

    static get defineOuts(): BridgeSchemaInput[] {
        return [{ key: "true" }, { key: "false" }];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [...super.defineInputs, ...descriptionSchemas()];
    }

    static async createDialog(options: ConfirmDialogQueryOptions): Promise<boolean | null> {
        return this.awaitQueryDialog({
            ...options,
            buttons: [
                {
                    action: "yes",
                    icon: "fa-solid fa-check",
                    label: "COMMON.Yes",
                    default: false,
                    callback: () => true,
                },
                {
                    action: "no",
                    icon: "fa-solid fa-xmark",
                    label: "COMMON.No",
                    default: true,
                    callback: () => false,
                },
            ],
            content: await localizeKeyOrDescription(options),
        });
    }

    async _execute(): Promise<boolean> {
        const { content, key, plain } = await getDescriptionData.call(this);

        if (!content && !key && !plain) {
            return this.executeNext("false");
        }

        const result = await this.queryUser({ content, key, plain });
        return this.executeNext(result ? "true" : "false");
    }
}

type Inputs = QueryUserInputs & DescriptionInputsData;

type ConfirmDialogQueryOptions = QueryUserArgs<"await-confirm"> & DescriptionInputsData;

export { AwaitConfirmActionNode };
export type { ConfirmDialogQueryOptions };
