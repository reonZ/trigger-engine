import { BuiltinsInputEntry, BuiltinsOutputEntry } from "engine";
import { addListenerAll, htmlQuery, localize, pan, ping, R, render, tokenCenter } from "foundry-helpers";
import { AwaitDialogActionNode, QueryUserArgs, QueryUserInputs } from ".";
import {
    DescriptionInputs,
    DescriptionState,
    descriptionStates,
    flavorDescriptionSchemas,
    getDescriptionData,
    localizeKeyOrDescription,
} from "..";

class AwaitPositionActionNode extends AwaitDialogActionNode<
    AwaitPositionQueryArgs,
    Point,
    "out",
    Inputs,
    Outputs,
    never,
    never,
    DescriptionState
> {
    static localize = localize.sub("builtins.node.action.await-position");
    static TIMEOUT: number = 60;

    static get type(): "await-position" {
        return "await-position";
    }

    static get states(): string[] | null {
        return descriptionStates;
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [...super.defineInputs, ...flavorDescriptionSchemas()];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [{ key: "position", type: "point", spacing: 1 }];
    }

    static async createDialog(options: PositionDialogQueryOptions): Promise<Point | false | null> {
        const content = await render("user-input/select-position", {
            flavor: options.flavor,
            i18n: this.localize.subkey,
        });

        let _notify: fa.ui.Notification | undefined;
        let _positionX: HTMLInputElement | null = null;
        let _positionY: HTMLInputElement | null = null;

        const _getPosition = (): Point | null => {
            const x = _positionX?.valueAsNumber;
            const y = _positionY?.valueAsNumber;
            return R.isNumber(x) && R.isNumber(y) ? { x, y } : null;
        };

        const _setPosition = (point: Point) => {
            _clearPick();

            const { height, width } = canvas.stage.getLocalBounds();

            if (_positionX && _positionY) {
                const x = Math.clamp(Math.round(point.x), 0, width);
                const y = Math.clamp(Math.round(point.y), 0, height);

                _positionX.valueAsNumber = x;
                _positionY.valueAsNumber = y;

                const computed = _getPosition();
                return computed && pan(computed, { ping: true });
            }
        };

        const _pickPosition = (event: PIXI.FederatedPointerEvent) => {
            const coords = canvas.canvasCoordinatesFromClient(event.client);
            _setPosition(coords);
        };

        const _clearPick = () => {
            canvas.stage.off("click", _pickPosition);
            if (_notify) {
                ui.notifications.remove(_notify.id);
                _notify = undefined;
            }
        };

        const result = await this.awaitQueryDialog<Point | null | false>({
            ...options,
            buttons: [
                {
                    action: "yes",
                    icon: "fa-solid fa-check",
                    label: "COMMON.Confirm",
                    default: false,
                    callback: _getPosition,
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
                _positionX = htmlQuery(html, `input[name="x"]`);
                _positionY = htmlQuery(html, `input[name="y"]`);
                if (!_positionX || !_positionY) return;

                addListenerAll(html, "[data-action]", async (btn) => {
                    const action = btn.dataset.action as Action;

                    switch (action) {
                        case "pan-position": {
                            const pos = _getPosition();
                            return pos && pan(pos, { ping: true });
                        }

                        case "ping-position": {
                            const pos = _getPosition();
                            return pos && ping(pos);
                        }

                        case "pick-position": {
                            if (_notify) return;
                            _notify = this.localize.info("pick.info", true);
                            return canvas.stage.on("click", _pickPosition);
                        }

                        case "from-select":
                        case "from-target": {
                            const targets =
                                action === "from-target" ? [...game.user.targets] : [...canvas.tokens.controlled];
                            const target = targets.length === 1 ? targets[0] : undefined;

                            if (target) {
                                const center = tokenCenter(target);
                                _setPosition(center);
                            } else {
                                _clearPick();
                                this.localize.warning(action, "error");
                            }
                        }
                    }
                });
            },
        });

        return result;
    }

    get canStop(): boolean {
        return true;
    }

    async _execute(): Promise<boolean> {
        const descriptionInputs = await getDescriptionData.call(this);
        const flavor = await localizeKeyOrDescription(descriptionInputs);
        const position = await this.queryUser({ flavor });

        if (!position) {
            return true;
        } else {
            this.setOutputValue("position", position);
            return this.executeNext("out");
        }
    }
}

type Action = "pan-position" | "ping-position" | "pick-position" | "from-select" | "from-target";

type Inputs = QueryUserInputs & DescriptionInputs;

type Outputs = {
    position: Point;
};

type AwaitPositionQueryArgs = {
    flavor: string;
};

type PositionDialogQueryOptions = QueryUserArgs<"await-position"> & AwaitPositionQueryArgs;

export { AwaitPositionActionNode };
export type { AwaitPositionQueryArgs, PositionDialogQueryOptions };
