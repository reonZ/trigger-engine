import { BuiltinsInputEntry, BuiltinsOutputEntry } from "engine";
import { AwaitDialogActionNode, QueryUserArgs, QueryUserInputs } from ".";
import { getInputValue, localize, R } from "foundry-helpers";

class AwaitInputActionNode extends AwaitDialogActionNode<
    AwaitInputQueryArgs,
    string | number,
    "out",
    Inputs,
    Outputs,
    never,
    never,
    "text" | "number"
> {
    static get type(): "await-input" {
        return "await-input";
    }

    static get states(): string[] {
        return ["text", "number"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        const localizeTooltip = localize.path("builtins.shared.strings.localize.tooltip");

        return [
            ...super.defineInputs,
            { key: "label", type: "text", tooltip: localizeTooltip },
            { key: "placeholder", type: "text", state: "text", tooltip: localizeTooltip },
            { key: "default", type: "number", state: "number" },
        ];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [
            { key: "text", type: "text", state: "text" },
            { key: "number", type: "number", state: "number" },
        ];
    }

    static async createDialog(options: InputDialogQueryOptions): Promise<string | false | null> {
        const input =
            "default" in options
                ? foundry.applications.fields.createNumberInput({
                      name: "value",
                      step: "any",
                      value: options.default,
                  })
                : foundry.applications.fields.createTextInput({
                      localize: false,
                      name: "value",
                      placeholder: options.placeholder ? game.i18n.localize(options.placeholder) : undefined,
                  });

        const content = foundry.applications.fields.createFormGroup({
            input,
            label: options.label
                ? game.i18n.localize(options.label)
                : localize("builtins.node.action", this.type, "label"),
        });

        return this.awaitQueryDialog({
            ...options,
            buttons: [
                {
                    action: "yes",
                    icon: "fa-solid fa-check",
                    label: "COMMON.Confirm",
                    default: false,
                    callback: (_event, _btn, dialog) => {
                        const input = dialog.element.querySelector("input");
                        return input ? getInputValue(input) : null;
                    },
                },
                {
                    action: "no",
                    icon: "fa-solid fa-xmark",
                    label: "COMMON.Cancel",
                    default: true,
                    callback: () => false,
                },
            ],
            content: content.outerHTML,
        });
    }

    get canStop(): boolean {
        return true;
    }

    async _execute(): Promise<boolean> {
        return this.state === "number" ? this.#executeNumber() : this.#executeText();
    }

    async #executeNumber(): Promise<boolean> {
        const result = await this.queryUser({
            default: await this.getInputValue("default"),
            label: await this.getInputValue("label"),
        });

        if (!R.isNumber(result)) {
            return true;
        }

        this.setOutputValue("number", result);
        return this.executeNext("out");
    }

    async #executeText(): Promise<boolean> {
        const result = await this.queryUser({
            label: await this.getInputValue("label"),
            placeholder: await this.getInputValue("placeholder"),
        });

        if (!R.isString(result)) {
            return true;
        }

        this.setOutputValue("text", result);
        return this.executeNext("out");
    }
}

type Inputs = QueryUserInputs & NumberQueryArgs & TextQueryArgs;

type Outputs = {
    text: string;
    number: number;
};

type NumberQueryArgs = {
    default: number;
    label: string;
};

type TextQueryArgs = {
    label: string;
    placeholder: string;
};

type AwaitInputQueryArgs = NumberQueryArgs | TextQueryArgs;

type InputDialogQueryOptions = Prettify<QueryUserArgs<"await-input"> & AwaitInputQueryArgs>;

export { AwaitInputActionNode };
export type { AwaitInputQueryArgs, InputDialogQueryOptions };
