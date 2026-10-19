import { BuiltinsInputEntry, TriggerNode } from "engine";
import { enrichHTML, localize } from "foundry-helpers";

const descriptionStates = ["plain", "description", "localization"];

function descriptionSchemas(tooltip: boolean | string = true): BuiltinsInputEntry[] {
    const schemas: BuiltinsInputEntry[] = [
        {
            key: "plain",
            type: "text",
            state: "plain",
            tooltip,
        },
        {
            key: "content",
            type: "text",
            field: { type: "enriched" },
            state: "description",
            tooltip,
        },
        {
            key: "localization",
            type: "text",
            state: "localization",
            tooltip,
        },
    ];

    return schemas;
}

function flavorDescriptionSchemas() {
    const schemas = descriptionSchemas();

    schemas[0].label = localize("builtins.shared.flavor.plain.label");
    schemas[1].label = localize("builtins.shared.flavor.content.label");

    return schemas;
}

async function getDescriptionData(
    this: TriggerNode<any, DescriptionInputs, any, any, any, DescriptionState>,
): Promise<DescriptionInputsData> {
    return {
        content: this.state === "description" ? await this.getInputValue("content") : undefined,
        key: this.state === "localization" ? await this.getInputValue("localization") : undefined,
        plain: this.state === "plain" ? await this.getInputValue("plain") : undefined,
    };
}

async function localizeKeyOrDescription({ content, key, plain }: DescriptionInputsData): Promise<string> {
    return key ? game.i18n.localize(key) : enrichHTML(content ?? plain ?? "");
}

type DescriptionState = "plain" | "description" | "localization";

type DescriptionInputs = {
    content: string;
    localization: string;
    plain: string;
};

type DescriptionInputsData = {
    content: string | undefined;
    key: string | undefined;
    plain: string | undefined;
};

export {
    descriptionSchemas,
    descriptionStates,
    flavorDescriptionSchemas,
    getDescriptionData,
    localizeKeyOrDescription,
};
export type { DescriptionInputs, DescriptionInputsData, DescriptionState };
