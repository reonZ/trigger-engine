import { BaseActionNode, CustomInputSchema } from "engine";
import {
    ActorPF2e,
    ChoiceSetSource,
    DatabaseCreateOperation,
    ItemPF2e,
    ItemSourcePF2e,
    localize,
    R,
} from "foundry-helpers";
import { CreateItemActionNode } from "..";

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

        const choiceSet = source.system.rules.find((rule: ChoiceSetSource): rule is ChoiceSetSource => {
            if (rule.key !== "ChoiceSet") return false;
            return mode === "flag" ? rule.flag === name : rule.rollOption === name;
        });

        if (R.isArray(choiceSet?.choices)) {
            const choice = choiceSet.choices.at(choiceIndex) as object | undefined;
            const value = choice && "value" in choice && choice.value;

            if (R.isNonNullish(value)) {
                choiceSet.selection = value;
            }
        }
    }
}

async function createTargetsEmbeddedItem<T extends ItemPF2e>(
    targets: TargetDocuments[],
    source: PreCreate<ItemSourcePF2e>,
): Promise<boolean> {
    let i = 3;

    const operations = R.map(targets, ({ actor }): DatabaseCreateOperation<ActorPF2e> => {
        return {
            action: "create",
            data: [foundry.utils.deepClone(source)],
            documentName: "Item",
            parent: actor,
        };
    });

    while (i) {
        try {
            await foundry.documents.modifyBatch(operations);
            return true;
        } catch {
            i--;
        }
    }

    return false;
}

export { choiceSetCustomInput, createTargetsEmbeddedItem, selectChoiceSets };
