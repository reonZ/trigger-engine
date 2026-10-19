import { BuiltinsInputEntry, BuiltinsOutputEntry } from "engine";
import { R } from "foundry-helpers";
import { QueryUserArgs } from "queries";
import { AwaitDialogActionNode, QueryUserInputs } from ".";

class AwaitSelectActionNode extends AwaitDialogActionNode<
    AwaitSelectQueryArgs,
    string,
    "out",
    Inputs,
    Outputs,
    never,
    never,
    "list" | "json"
> {
    static get type(): "await-select" {
        return "await-select";
    }

    static get states(): string[] {
        return ["list", "json"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            ...super.defineInputs,
            { key: "list", type: "text", isArray: true, state: "list" },
            {
                key: "json",
                type: "text",
                state: "json",
                field: { default: "[]", type: "json" },
            },
        ];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [{ key: "value", type: "text" }];
    }

    static async createDialog(options: SelectDialogQueryOptions): Promise<string | false | null> {
        const list = options.list.map(({ value, label }) => {
            return { value, label: label ? game.i18n.localize(label) : value };
        });

        const select = foundry.applications.fields.createSelectInput({
            localize: false,
            name: "value",
            options: list,
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
                        return dialog.element.querySelector("select")?.value ?? null;
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
            content: select.outerHTML,
        });
    }

    get canStop(): boolean {
        return true;
    }

    async _execute(): Promise<boolean> {
        const list = await (this.state === "json" ? this.#getFromJson() : this.#getFromList());
        if (!list.length) return true;

        // no need to go through all the back and forth when there is no real choice
        if (list.length === 1) {
            this.setOutputValue("value", list[0].value);
            return this.executeNext("out");
        }

        const result = await this.queryUser({ list });
        if (!R.isString(result)) return true;

        this.setOutputValue("value", result);
        return this.executeNext("out");
    }

    async #getFromList(): Promise<{ value: string; label?: string }[]> {
        return R.map(await this.getInputValue("list"), (entry) => {
            const [value, label] = entry.split(":").map((str) => str.trim());
            return { value, label };
        });
    }

    async #getFromJson(): Promise<{ value: string; label?: string }[]> {
        const json = await this.getInputValue("json");

        try {
            const list = JSON.parse(json);
            if (!R.isArray(list)) return [];

            return R.pipe(
                list,
                R.filter((entry): entry is { value: string; label?: string } => {
                    return R.isPlainObject(entry) && "value" in entry;
                }),
                R.map(({ value, label }) => {
                    return { value, label };
                }),
            );
        } catch (error: any) {
            return [];
        }
    }
}

type Inputs = QueryUserInputs & {
    json: string;
    list: string[];
};

type Outputs = {
    value: string;
};

type AwaitSelectQueryArgs = {
    list: { value: string; label?: string }[];
};

type SelectDialogQueryOptions = QueryUserArgs<"await-select"> & AwaitSelectQueryArgs;

export { AwaitSelectActionNode };
export type { AwaitSelectQueryArgs, SelectDialogQueryOptions };
