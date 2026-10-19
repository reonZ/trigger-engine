import {
    BuiltinsInputEntry,
    BuiltinsOutputEntry,
    DescriptionInputs,
    descriptionSchemas,
    DescriptionState,
    descriptionStates,
    getDescriptionData,
    localizeKeyOrDescription,
} from "engine";
import {
    addListenerAll,
    createTargetDocuments,
    htmlQuery,
    isTokenObject,
    localize,
    panToToken,
    pingToken,
    R,
    render,
    Token,
    TokenDocumentUUID,
} from "foundry-helpers";
import { AwaitDialogActionNode, QueryUserArgs, QueryUserInputs } from ".";

const DEFAULT_CALLBACK = `/**
 * @param {Actor} actor
 * @param {TokenDocument} token
 * @returns {boolean}
 *
 * @example
 * return actor.level >= 1;
 */
return true;`;

class AwaitTokenActionNode extends AwaitDialogActionNode<
    AwaitTokenQueryArgs,
    TokenDocumentUUID,
    "out",
    Inputs,
    Outputs,
    never,
    never,
    DescriptionState
> {
    static localize = localize.sub("builtins.node.action.await-token");
    static TIMEOUT: number = 60;

    static get type(): "await-token" {
        return "await-token";
    }

    static get states(): string[] | null {
        return descriptionStates;
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            ...super.defineInputs,
            ...descriptionSchemas(),
            {
                key: "callback",
                type: "text",
                field: {
                    type: "javascript",
                    default: DEFAULT_CALLBACK,
                },
            },
        ];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [{ key: "target", type: "target" }];
    }

    static async createDialog(options: TokenDialogQueryOptions): Promise<TokenDocumentUUID | false | null> {
        const code = options.callback.trim() || "return true;";
        const Fn = function () {}.constructor as SyncFunction;
        const callback = new Fn("actor", "token", code);
        const content = await render("user-input/select-token", {
            flavor: options.flavor,
            i18n: this.localize.subkey,
        });

        let _notify: fa.ui.Notification | undefined;
        let _token: Token | undefined;
        let _tokenInput: HTMLInputElement | null = null;

        const _clearNotify = () => {
            if (!_notify) return;
            ui.notifications.remove(_notify.id);
            _notify = undefined;
        };

        const _setToken = (token: Token) => {
            _clearPick();
            const actor = token.actor;

            if (!actor) {
                return this.localize.error("error.actor");
            }

            try {
                const testResult = callback(actor, token.document);

                if (testResult !== true) {
                    const err = R.isString(testResult) ? testResult : this.localize.path("error.callback");
                    return ui.notifications.warn(err, { localize: true });
                }

                _token = token;

                const document = token.document;

                if (_tokenInput) {
                    _tokenInput.value = canSeeName(document) ? document.name : this.localize("token.anonymous");
                }
            } catch (error: any) {}
        };

        const _pickToken = (event: PIXI.FederatedPointerEvent) => {
            const token = (event as FederatedEvent).interactionData?.object;
            return isTokenObject(token) && _setToken(token);
        };

        const _clearPick = () => {
            canvas.tokens.off("click", _pickToken);
            _clearNotify();
        };

        const result = await this.awaitQueryDialog<boolean>({
            ...options,
            buttons: [
                {
                    action: "yes",
                    icon: "fa-solid fa-check",
                    label: "COMMON.Confirm",
                    default: false,
                    callback: () => true,
                },
                {
                    action: "no",
                    icon: "fa-solid fa-xmark",
                    label: "COMMON.Cancel",
                    default: true,
                    callback: () => false,
                },
            ],
            content,
            position: {
                top: 100,
            },
            render: (html: HTMLElement) => {
                _tokenInput = htmlQuery(html, "input");
                if (!_tokenInput) return;

                addListenerAll(html, "[data-action]", (btn) => {
                    type Action = "pan-token" | "ping-token" | "pick-token" | "from-select" | "from-target";

                    const action = btn.dataset.action as Action;

                    switch (action) {
                        case "pan-token": {
                            return _token && panToToken(_token);
                        }

                        case "ping-token": {
                            return _token && pingToken(_token);
                        }

                        case "pick-token": {
                            if (_notify) return;
                            _notify = this.localize.info("pick.info", true);
                            return canvas.tokens.on("click", _pickToken);
                        }

                        case "from-select":
                        case "from-target": {
                            const targets =
                                action === "from-target" ? [...game.user.targets] : [...canvas.tokens.controlled];
                            const target = targets.length === 1 ? targets[0] : undefined;

                            if (target) {
                                _setToken(target);
                            } else {
                                _clearPick();
                                this.localize.warning(action, "error");
                            }
                        }
                    }
                });
            },
        });

        _clearPick();

        return (result && _token?.document.uuid) || null;
    }

    get canStop(): boolean {
        return true;
    }

    async _execute(): Promise<boolean> {
        const descriptionInputs = await getDescriptionData.call(this);
        const flavor = await localizeKeyOrDescription(descriptionInputs);
        const callback = await this.getInputValue("callback");
        const result = await this.queryUser({ callback, flavor });
        const token = R.isString(result) ? fromUuidSync(result) : null;
        const target = token instanceof TokenDocument ? createTargetDocuments({ token }) : null;

        if (target) {
            this.setOutputValue("target", target);
            return this.executeNext("out");
        } else {
            return true;
        }
    }
}

function playersCanSeeName(token: TokenDocument): boolean {
    if ("playersCanSeeName" in token) {
        return !!token.playersCanSeeName;
    }
    return R.isIncludedIn(token.displayName, [CONST.TOKEN_DISPLAY_MODES.ALWAYS, CONST.TOKEN_DISPLAY_MODES.HOVER]);
}

function canSeeName(token: TokenDocument): boolean {
    return game.user.isGM || playersCanSeeName(token);
}

type Inputs = QueryUserInputs &
    DescriptionInputs & {
        callback: string;
    };

type Outputs = {
    target: BaseTargetDocuments;
};

type AwaitTokenQueryArgs = {
    callback: string;
    flavor: string;
};

type TokenDialogQueryOptions = QueryUserArgs<"await-token"> & AwaitTokenQueryArgs;

type SyncFunction = {
    new (...args: any[]): (actor: Actor, token: TokenDocument) => boolean | string;
};

export { AwaitTokenActionNode };
export type { AwaitTokenQueryArgs, TokenDialogQueryOptions };
