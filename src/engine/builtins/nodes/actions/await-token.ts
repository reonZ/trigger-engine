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
    addListener,
    createTargetDocuments,
    getInputValue,
    htmlQuery,
    isTokenObject,
    localize,
    R,
    render,
    TokenDocumentUUID,
} from "foundry-helpers";
import { AwaitDialogActionNode, QueryUserArgs, QueryUserInputs } from ".";

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
        return [...super.defineInputs, ...descriptionSchemas()];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [{ key: "target", type: "target" }];
    }

    static async createDialog(options: TokenDialogQueryOptions): Promise<TokenDocumentUUID | false | null> {
        const content = await render("user-input/select-token", {
            flavor: options.flavor,
            i18n: this.localize.subkey,
        });

        let _notify: fa.ui.Notification | null = null;
        let _token: fc.placeables.Token | null = null;

        const _clearNotify = () => {
            if (!_notify) return;
            ui.notifications.remove(_notify.id);
            _notify = null;
        };

        const _clearPick = () => {
            canvas.tokens.off("click", _pickToken);
            _clearNotify();
        };

        const _setToken = (token: fc.placeables.Token) => {
            _token = token;
            const document = token.document;
            const input = htmlQuery(html, "input");
            if (input) {
                input.value = canSeeName(document) ? document.name : this.localize("token.anonymous");
            }
            _clearPick();
        };

        const _pickToken = (event: PIXI.FederatedPointerEvent) => {
            const token = (event as FederatedEvent).interactionData?.object;
            return isTokenObject(token) && _setToken(token);
        };

        return this.awaitQueryDialog({
            ...options,
            buttons: [
                {
                    action: "yes",
                    icon: "fa-solid fa-check",
                    label: "COMMON.Confirm",
                    default: false,
                    callback: (_event, _btn, dialog) => {
                        _clearPick();
                        return null;
                    },
                },
                {
                    action: "no",
                    icon: "fa-solid fa-xmark",
                    label: "COMMON.Cancel",
                    default: true,
                    callback: () => {
                        _clearPick();
                        return false;
                    },
                },
            ],
            content,
            render: (html: HTMLElement) => {
                const tokenInput = htmlQuery(html, "input");
                if (!tokenInput) return;

                addListener(html, `button[data-action="pick-token"]`, (btn) => {
                    if (_notify) return;
                    _notify = this.localize.info("pick.info", true);
                    canvas.tokens.on("click", _pickToken);
                });
            },
        });
    }

    get canStop(): boolean {
        return true;
    }

    async _execute(): Promise<boolean> {
        const descriptionInputs = await getDescriptionData.call(this);
        const flavor = await localizeKeyOrDescription(descriptionInputs);
        const result = await this.queryUser({ flavor });
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

type Inputs = QueryUserInputs & DescriptionInputs;

type Outputs = {
    target: BaseTargetDocuments;
};

type AwaitTokenQueryArgs = {
    flavor: string;
};

type TokenDialogQueryOptions = QueryUserArgs<"await-token"> & AwaitTokenQueryArgs;

export { AwaitTokenActionNode };
export type { AwaitTokenQueryArgs, TokenDialogQueryOptions };
