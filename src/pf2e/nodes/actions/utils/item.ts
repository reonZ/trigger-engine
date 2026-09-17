import { BaseActionNode, CustomInputSchema } from "engine";
import {
    ChoiceSetSource,
    ItemSourcePF2e,
    localize,
    MODULE,
    primaryPlayerOwner,
    R,
    RuleElementSource,
    TokenDocumentUUID,
} from "foundry-helpers";
import { CreateItemActionNode } from "..";
import { CreateItemQueryOptions, processCreateTargetsEmbeddedItem } from "queries-pf2e";

function choiceSetCustomInput(): CustomInputSchema {
    return {
        slug: "choices",
        group: "choiceset",
        types: ["text"],
        label: localize("pf2e-trigger.shared.item.choiceset.label"),
        tooltip: localize("pf2e-trigger.shared.item.choiceset.tooltip"),
    };
}

async function selectChoiceSets(this: BaseActionNode<any, any, any, "choices">, source: ItemSourcePF2e) {
    const choiceSets: string[] = await this.getCustomInputsValues("choices");

    for (const path of choiceSets) {
        const [mode, name, index] = R.split(path, ":");
        const choiceIndex = Number(index);
        if (!R.isNumber(choiceIndex) || !R.isIncludedIn(mode, CreateItemActionNode.modes)) continue;

        const rule = source.system.rules.find((rule: ChoiceSetSource): rule is ChoiceSetSource => {
            if (rule.key !== "ChoiceSet") return false;
            return mode === "flag" ? rule.flag === name : rule.rollOption === name;
        });

        if (R.isArray(rule?.choices)) {
            const choice = rule.choices.at(choiceIndex) as object | undefined;
            const value = choice && "value" in choice && choice.value;

            if (R.isNonNullish(value)) {
                rule.selection = value;
            }
        }
    }
}

async function selectTokenMarks(this: BaseActionNode<any, any, any, "marks">, source: ItemSourcePF2e) {
    const marks: string[] = await this.getCustomInputsValues("marks");

    for (const path of marks) {
        const [_, slug, uuid] = R.split(path, ":");
        const parsed = foundry.utils.parseUuid(uuid);
        if (parsed?.primaryType !== "Scene" || parsed.type !== "Token") continue;

        const rule = source.system.rules.find((rule): rule is TokenMarkSource => {
            return rule.key === "TokenMark" && rule.slug === slug;
        });

        if (rule) {
            rule.uuid = uuid as TokenDocumentUUID;
        }
    }
}

async function createTargetsEmbeddedItem(targets: TargetDocuments[], source: PreCreate<ItemSourcePF2e>) {
    const hasRulesToSet = source.system?.rules?.some((rule) => {
        return (
            (rule.key === "ChoiceSet" && R.isNullish((rule as ChoiceSetSource).selection)) ||
            (rule.key === "TokenMark" && !R.isString(rule.slug))
        );
    });

    const activeGM = game.users.activeGM;
    if (!activeGM) return;

    // we have rules to set still, so we redirect item creation to owners
    if (hasRulesToSet) {
        return Promise.all(
            targets.map(({ actor }) => {
                const user = primaryPlayerOwner(actor) ?? activeGM;
                const queryArgs: CreateItemQueryOptions = {
                    _type: "create-item",
                    actors: [actor.uuid],
                    source,
                };

                return user.query(MODULE.path("user-query"), queryArgs);
            }),
        );
    }

    // we aren't a GM user so we redirect to the active GM instead
    if (!game.user.isGM) {
        return activeGM.query(MODULE.path("user-query"), {
            _type: "create-item",
            actors: targets.map(({ actor }) => actor.uuid),
            source,
        } satisfies CreateItemQueryOptions);
    }

    await processCreateTargetsEmbeddedItem(
        targets.map(({ actor }) => actor),
        source,
    );
}

type TokenMarkSource = RuleElementSource & {
    uuid?: TokenDocumentUUID;
};

export { choiceSetCustomInput, createTargetsEmbeddedItem, selectChoiceSets, selectTokenMarks };
