import { IconObject } from "_zod";
import { BaseActionNode, CustomInputSchema, JsonField, parseJSONCustomInputValues } from "engine";
import { ActorPF2e, R, RuleElementSource, createCustomEffect, localize } from "foundry-helpers";
import { PF2eInputEntry } from "pf2e";
import {
    DurationState,
    EffectInputs,
    createTargetsEmbeddedItem,
    durationStates,
    effectSchemas,
    getEffectData,
    getItemTargets,
} from ".";

class CreateEffectActionNode extends BaseActionNode<"out", Inputs, never, "rule", never, DurationState> {
    static get type(): "create-effect" {
        return "create-effect";
    }

    static get tags(): string[] {
        return ["duration", "effect", "item"];
    }

    static get states(): string[] {
        return [...durationStates];
    }

    static get defineInputs(): PF2eInputEntry[] {
        return [
            { key: "target", type: "target", isArray: true },
            ...R.splice(effectSchemas(), 3, 0, [
                {
                    key: "level",
                    type: "number",
                    field: {
                        default: 1,
                        min: 1,
                        step: 1,
                    },
                },
                {
                    key: "counter",
                    type: "number",
                    tooltip: localize.path("builtins.shared.numbers.disable.tooltip"),
                    field: { min: 0 },
                },
            ]),
        ];
    }

    static get defineCustomInputs(): CustomInputSchema[] {
        return [
            {
                slug: "rule",
                types: ["text"],
                group: "rule",
                field: { type: "json" },
            } satisfies CustomInputSchema<JsonField>,
        ];
    }

    get icon(): IconObject {
        return { unicode: "\uf890" };
    }

    async _execute(): Promise<boolean> {
        const targets = await getItemTargets.call(this, "effect");

        if (!targets.length) {
            return this.executeNext("out");
        }

        const effect = await getEffectData.call(this);
        const ItemCls = getDocumentClass("Item");
        const parent = new ItemCls<ActorPF2e>({ type: "effect", name: "fake" }, { parent: targets[0].actor });
        const counter = await this.getInputValue("counter");

        const rules = R.filter(
            await parseJSONCustomInputValues.call(this, "rule"),
            (source): source is RuleElementSource => {
                try {
                    const RuleCls = R.isString(source.key) ? game.pf2e.RuleElements.builtin[source.key] : null;
                    if (!RuleCls) return false;

                    const rule = new RuleCls(source, { parent });
                    return !rule.invalid;
                } catch {
                    return false;
                }
            },
        );

        const source = createCustomEffect({
            ...effect,
            badge: counter > 0 ? { type: "counter", value: counter } : undefined,
            level: await this.getInputValue("level"),
            name: effect.name || game.i18n.localize("TYPES.Item.effect"),
            rules,
        });

        await createTargetsEmbeddedItem(targets, source);

        return this.executeNext("out");
    }
}

type Inputs = EffectInputs & {
    counter: number;
    level: number;
    target: TargetDocuments[];
};

export { CreateEffectActionNode };
