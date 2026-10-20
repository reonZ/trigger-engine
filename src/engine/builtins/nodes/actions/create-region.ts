import { IconObject } from "_zod";
import { BuiltinsInputEntry, BuiltinsOutputEntry } from "engine";
import { R, RegionSource, splitListString } from "foundry-helpers";
import { BaseActionNode } from ".";

class CreateRegionActionNode extends BaseActionNode<"out", Inputs, Outputs> {
    static #inputSchema?: BuiltinsInputEntry[];

    static get type(): "create-region" {
        return "create-region";
    }

    static get tags(): string[] {
        return ["region"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        if (this.#inputSchema) {
            return this.#inputSchema;
        }

        const appearanceGroup = game.i18n.localize("REGION.TABS.appearance");
        const appearance: BuiltinsInputEntry[] = [
            { key: "name", type: "text" },
            { key: "color", type: "text" },
            {
                key: "visibility",
                type: "text",
                field: {
                    type: "select",
                    default: String(CONST.REGION_VISIBILITY.LAYER_UNLOCKED),
                    options: R.pipe(
                        CONST.REGION_VISIBILITY,
                        R.entries(),
                        R.map(([label, value]) => {
                            return {
                                value: String(value),
                                label: `REGION.VISIBILITY.${label}.label`,
                            };
                        }),
                    ),
                },
            },
            { key: "hidden", type: "boolean" },
            { key: "locked", type: "boolean" },
            {
                key: "highlightMode",
                type: "text",
                field: {
                    type: "select",
                    default: "shapes",
                    options: [
                        { value: "shapes", label: "REGION.HIGHLIGHT_MODES.shapes.label" },
                        { value: "coverage", label: "REGION.HIGHLIGHT_MODES.coverage.label" },
                    ],
                },
            },
            { key: "displayMeasurements", type: "boolean" },
        ];

        const placementGroup = game.i18n.localize("REGION.TABS.placement");
        const placement: BuiltinsInputEntry[] = [
            {
                key: "levels",
                type: "text",
                label: "DOCUMENT.FIELDS.levels.label",
                tooltip: "DOCUMENT.FIELDS.levels.hint",
            },
            {
                key: "attachment",
                type: "target",
                label: "REGION.FIELDS.attachment.token.label",
                tooltip: "REGION.FIELDS.attachment.token.hint",
            },
        ];

        const elevationGroup = game.i18n.localize("REGION.FIELDS.elevation.label");
        const elevation: BuiltinsInputEntry[] = [
            {
                key: "topInclusive",
                type: "boolean",
            },
            {
                key: "top",
                type: "number",
                field: { default: Infinity },
            },
            {
                key: "bottom",
                type: "number",
                field: { default: -Infinity },
            },
        ];

        const restrictionGroup = game.i18n.localize("REGION.SECTIONS.restriction");
        const restriction: BuiltinsInputEntry[] = [
            { key: "enabled", type: "boolean" },
            {
                key: "type",
                type: "text",
                field: {
                    type: "select",
                    default: "move",
                    options: R.map(CONST.EDGE_RESTRICTION_TYPES, (value) => {
                        return { value, label: `REGION.RESTRICTION_TYPES.${value}.label` };
                    }),
                },
            },
            {
                key: "priority",
                type: "number",
                field: { min: 0 },
            },
        ];

        return (this.#inputSchema = [
            ...appearance.map((entry) => {
                entry.group = appearanceGroup;
                if (entry.key !== "name") {
                    entry.label = `REGION.FIELDS.${entry.key}.label`;
                    entry.tooltip = `REGION.FIELDS.${entry.key}.hint`;
                }
                return entry;
            }),
            ...elevation.map((entry) => {
                entry.group = elevationGroup;
                entry.label = `REGION.FIELDS.elevation.${entry.key}.label`;
                entry.tooltip = `REGION.FIELDS.elevation.${entry.key}.hint`;
                return entry;
            }),
            ...placement.map((entry) => {
                entry.group = placementGroup;
                return entry;
            }),
            ...restriction.map((entry) => {
                entry.group = restrictionGroup;
                entry.label = `REGION.FIELDS.restriction.${entry.key}.label`;
                if (entry.key === "enabled") {
                    entry.tooltip = `REGION.FIELDS.restriction.${entry.key}.hint`;
                }
                return entry;
            }),
        ]);
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [{ key: "region", type: "region" }];
    }

    get icon(): IconObject {
        return { unicode: "\uf867", fontWeight: "900" };
    }

    async _execute(): Promise<boolean> {
        const parent = this.sceneContext;

        if (!parent) {
            return this.executeNext("out");
        }

        const RegionCls = getDocumentClass("Region") as typeof RegionDocument;

        // appearance
        const name = await this.getInputValue("name");
        const color = await this.getInputValue("color");
        const parsedColor = Color.fromString(color).css;

        // elevation
        const bottom = await this.getInputValue("bottom");
        const top = await this.getInputValue("top");

        //placement
        const levels = await this.getInputValue("levels");
        const attachment = await this.getInputValue("attachment");

        const source: DeepPartial<RegionSource> = {
            attachment: {
                token: this.getTargetToken(attachment)?.id ?? null,
            },
            color: parsedColor && parsedColor === color ? (color as `#${string}`) : undefined,
            displayMeasurements: await this.getInputValue("displayMeasurements"),
            elevation: {
                bottom: bottom === -Infinity ? null : bottom,
                top: top === Infinity ? null : top,
                topInclusive: await this.getInputValue("topInclusive"),
            },
            hidden: await this.getInputValue("hidden"),
            highlightMode: await this.getInputValue("highlightMode"),
            levels: splitListString(levels).filter((id) => parent.levels.has(id)),
            locked: await this.getInputValue("locked"),
            name: name || RegionCls.defaultName({ parent }),
            restriction: {
                enabled: await this.getInputValue("enabled"),
                priority: await this.getInputValue("priority"),
                type: await this.getInputValue("type"),
            },
            visibility: await this.getInputValue("visibility"),
        };

        console.log(source);

        // const region = await RegionCls.create(source, { parent });
        // this.setOutputValue("region", region);

        return this.executeNext("out");
    }
}

type AppearanceInputs = {
    name: string;
    color: string;
    visibility: ValueOf<typeof CONST.REGION_VISIBILITY>;
    hidden: boolean;
    locked: boolean;
    highlightMode: "coverage" | "shapes";
    displayMeasurements: boolean;
};

type ElevationInputs = {
    topInclusive: boolean;
    top: number;
    bottom: number;
};

type PlacementInputs = {
    levels: string;
    attachment?: BaseTargetDocuments;
};

type RestrictionInputs = {
    enabled: boolean;
    type: (typeof CONST.EDGE_RESTRICTION_TYPES)[number];
    priority: number;
};

type Inputs = AppearanceInputs & ElevationInputs & PlacementInputs & RestrictionInputs;

type Outputs = {
    region: RegionDocument | undefined;
};

export { CreateRegionActionNode };
