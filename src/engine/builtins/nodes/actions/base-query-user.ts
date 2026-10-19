import { BuiltinsInputEntry } from "engine/builtins/entries";
import { htmlQuery, localize, MODULE, WaitDialogOptions } from "foundry-helpers";
import { onUserQuery } from "queries";
import { BaseActionNode } from ".";
import { IconObject } from "_zod";

class AwaitDialogActionNode<
    TQueryArgs extends Record<string, any> = Record<string, any>,
    TQueryResult extends any = any,
    TOuts extends string | never = string,
    TInputs extends QueryUserInputs = QueryUserInputs,
    TOutputs extends Record<string, any> | never = Record<string, any>,
    TCustomInputs extends string | never = string,
    TCustomOutputs extends string | never = string,
    TState extends string | never = string,
> extends BaseActionNode<TOuts, TInputs, TOutputs, TCustomInputs, TCustomOutputs, TState> {
    static TIMEOUT: number = 30;

    static get tags(): string[] {
        return ["dialog", "user"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            {
                key: "title",
                type: "text",
                label: localize.path("builtins.shared.user-query.title.label"),
                tooltip: localize.path("builtins.shared.strings.localize.tooltip"),
            },
            { key: "user", type: "user" },
            {
                key: "timeout",
                type: "number",
                label: localize.path("builtins.shared.user-query.timeout.label"),
                tooltip: localize.path("builtins.shared.numbers.disable.tooltip"),
                field: {
                    default: this.TIMEOUT,
                    min: 0,
                },
            },
        ];
    }

    static async awaitQueryDialog<TQueryResult>(options: {
        buttons: fa.api.DialogV2Button[];
        content: string;
        position?: Partial<fa.ApplicationPosition>;
        render?: (el: HTMLElement) => void;
        timeout: number;
        title: string;
    }): Promise<TQueryResult | false | null> {
        let intervale: NodeJS.Timeout | undefined;
        let timeout = options.timeout ?? (this.constructor as typeof AwaitDialogActionNode).TIMEOUT;

        const title = options.title
            ? game.i18n.localize(options.title)
            : localize("builtins.node.action", this.type, "title");

        const dialogOptions: WaitDialogOptions = {
            classes: [MODULE.id, `${MODULE.id}-query-${this.type}`],
            content: options.content,
            buttons: options.buttons,
            render: (_, dialog) => {
                const element = dialog.element;

                options.render?.(element);
                if (timeout <= 0) return;

                setTimeout(() => {
                    dialog.close();
                }, timeout * 1000);

                const titleEl = htmlQuery(element, ".window-header .window-title");
                if (!titleEl) return;

                intervale = setInterval(() => {
                    timeout--;
                    titleEl.innerHTML = `(${timeout}) ${title}`;
                }, 1000);
            },
            close: () => {
                clearInterval(intervale);
            },
            position: options.position ?? {},
            window: {
                title: timeout > 0 ? `(${timeout}) ${title}` : title,
            },
        };

        return foundry.applications.api.DialogV2.wait(dialogOptions) as Promise<TQueryResult | null>;
    }

    get isEmit(): boolean {
        return true;
    }

    get icon(): IconObject {
        return {
            fontWeight: "900",
            unicode: "\ue7a4",
        };
    }

    async queryUser(args: TQueryArgs): Promise<TQueryResult | false | null> {
        const userInput = await this.getInputValue("user");
        const user = userInput?.active ? userInput : this.userContext;

        const queryArgs: TQueryArgs & QueryUserArgs = {
            ...args,
            _type: (this.constructor as typeof AwaitDialogActionNode).type,
            timeout: await this.getInputValue("timeout"),
            title: await this.getInputValue("title"),
        };

        try {
            const result = user.isSelf
                ? await onUserQuery(queryArgs as any)
                : await user.query(MODULE.path("user-query"), queryArgs, { timeout: queryArgs.timeout * 1000 });

            return result as TQueryResult;
        } catch (error: any) {
            console.error(error);
            return null;
        }
    }
}

type QueryUserArgs<T extends string = string> = {
    _type: T;
    timeout: number;
    title: string;
};

type QueryUserInputs = {
    timeout: number;
    title: string;
    user?: User;
};

export { AwaitDialogActionNode };
export type { QueryUserArgs, QueryUserInputs };
