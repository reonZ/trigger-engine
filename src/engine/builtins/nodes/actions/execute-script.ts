import { ApplicationKey, BuiltinsCustomEntry, BuiltinsInputEntry, CustomInputSchema, TriggerApplication } from "engine";
import { CompendiumIndexData, MODULE, MacroUUID, R, isScriptMacro } from "foundry-helpers";
import { BaseActionNode } from ".";
import { IconObject } from "_zod";

const DEFAULT_SCRIPT = `/**
 * @param {unknown[]} inputs
 * @returns {boolean} to break out current process
 * @returns {{type: EntryType; value: unknown}[]}
 *
 * @example
 * const x = inputs[0];
 * const y = inputs[1];
 * return [{type: "number", value: x + y}];
 */
return [];`;

class ExecuteScriptActionNode extends BaseActionNode<"out", Inputs, never, "input", "output", "macro" | "script"> {
    static get type(): "execute-script" {
        return "execute-script";
    }

    static get tags(): string[] {
        return ["macro"];
    }

    static get states(): string[] {
        return ["script", "macro"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            {
                key: "script",
                type: "text",
                field: {
                    type: "javascript",
                    default: DEFAULT_SCRIPT,
                },
                state: "script",
            },
            {
                key: "macro",
                type: "text",
                state: "macro",
            },
            {
                key: "user",
                type: "user",
            },
        ];
    }

    static get defineCustomInputs(): CustomInputSchema[] | null {
        return [{ slug: "input", array: true }];
    }

    static get defineCustomOutputs(): BuiltinsCustomEntry[] | null {
        return [{ slug: "output", array: true }];
    }

    static async processExecuteScript({
        applicationKey,
        values,
        code,
        uuid,
    }: ExecuteScriptQueryOptions): Promise<unknown> {
        const application = TriggerApplication.instances.get(applicationKey);

        if (!application) {
            return new Error("Couldn't recover the application");
        }

        const result = await this.executeScript({
            values: await application.convertValuesFomEmitable(values),
            code: code,
            uuid: uuid,
        });

        return R.isArray(result) ? application.convertValuesToEmitable(result) : result;
    }

    static async executeScript({
        values,
        code,
        uuid,
    }: ExecuteScriptArgs): Promise<boolean | ReadonlyArray<unknown> | Error | undefined> {
        const result = uuid
            ? await this.#executeMacro(uuid, values)
            : await this.#executeScriptCode(code ?? "", values);
        return R.isArray(result) || R.isBoolean(result) || R.isError(result) ? result : undefined;
    }

    static async #executeMacro(uuid: MacroUUID, values: any[]): Promise<unknown> {
        try {
            const macro = await fromUuid(uuid);
            return isScriptMacro(macro) ? await macro.execute({ inputs: values }) : undefined;
        } catch (error: any) {
            return error;
        }
    }

    static async #executeScriptCode(code: string, values: any[]): Promise<unknown> {
        try {
            const fn = new foundry.utils.AsyncFunction("inputs", code);
            return await fn(values);
        } catch (error: any) {
            return error;
        }
    }

    get title(): string | null {
        return this.localMacro?.name ?? super.title;
    }

    get subtitle(): string | null {
        return this.localMacro ? super.title : super.subtitle;
    }

    get icon(): IconObject | string {
        const macro = this.localMacro;
        return macro === null ? { unicode: "\uf127" } : (macro?.img ?? { unicode: "\uf121" });
    }

    get canStop(): boolean {
        return true;
    }

    get localMacro(): CompendiumIndexData | undefined | null {
        if (this.state !== "macro") return;

        const uuid = this.getLocalValue("macro");
        if (!uuid) return;

        const macro = fromUuidSync<CompendiumIndexData>(uuid, { strict: false });
        if (!macro) return null;

        return isScriptMacro(macro) || foundry.utils.parseUuid(macro.uuid)?.type === "Macro" ? macro : null;
    }

    async _execute(): Promise<boolean> {
        const user = (await this.getInputValue("user")) ?? game.user;

        if (!user.active) {
            return true;
        }

        const isSelf = user.isSelf;

        const executeArgs: ExecuteScriptQueryOptions = {
            _type: "execute-script",
            applicationKey: this.applicationKey,
            code: this.state === "script" ? await this.getInputValue("script") : undefined,
            uuid: this.state === "macro" ? await this.getInputValue("macro") : undefined,
            values: isSelf ? await this.getCustomInputsValues("input") : await this.getCustomInputs("input"),
        };

        const result = isSelf
            ? await ExecuteScriptActionNode.executeScript(executeArgs)
            : await user.query(MODULE.path("user-query"), executeArgs);

        if (R.isBoolean(result)) {
            return result;
        }

        if (R.isError(result)) {
            MODULE.error(
                `an error occured in the node "${this.type}" (${this.id}) of the trigger "${this.triggerPath}"`,
                result,
            );
        } else {
            const returnedValues = this.parseUserValues(result).map((x) => x?.value);

            if (returnedValues.length) {
                this.setCustomOutputValues("output", returnedValues);
            }
        }

        return this.executeNext("out");
    }
}

type Inputs = {
    macro: MacroUUID;
    script: string;
    user?: User;
};

type ExecuteScriptArgs = {
    code?: string;
    uuid?: MacroUUID;
    values: any[];
};

type ExecuteScriptQueryOptions = ExecuteScriptArgs & {
    _type: "execute-script";
    applicationKey: ApplicationKey;
};

export { ExecuteScriptActionNode };
export type { ExecuteScriptQueryOptions };
