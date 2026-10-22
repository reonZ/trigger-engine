import { IconObject } from "_zod";
import { BuiltinsInputEntry, BuiltinsOutputEntry, CustomInputSchema, JsonField } from "engine";
import { DataModel, R, RegionSource } from "foundry-helpers";
import { BaseActionNode, parseJSONCustomInputValues, testBehaviorSource } from ".";
const shapeTypes = foundry.data.BaseShapeData.TYPES;

class CreateRegionActionNode extends BaseActionNode<"out", Inputs, Outputs, "behavior" | "shape"> {
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
            { key: "offset", type: "point", group: "shape" },
        ]);
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [{ key: "region", type: "region" }];
    }

    static get defineCustomInputs(): CustomInputSchema[] {
        return [
            {
                slug: "shape",
                types: ["text"],
                group: "shape",
                field: { type: "json" },
            } satisfies CustomInputSchema<JsonField>,
            {
                slug: "behavior",
                types: ["text"],
                group: "behavior",
                field: { type: "json" },
            } satisfies CustomInputSchema<JsonField>,
        ];
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

        // placement
        const attachment = await this.getInputValue("attachment");
        const levels = R.pipe(
            await this.getInputValue("levels"),
            R.split(","),
            R.map((str) => str.trim()),
            R.filter((id) => parent.levels.has(id)),
        );

        // shapes
        const offset = await this.getInputValue("offset");
        const shapes = R.pipe(
            await parseJSONCustomInputValues.call(this, "shape"),
            R.filter((source): source is DataModel["_source"] => {
                return R.isPlainObject(source) && R.isString(source.type) && source.type in shapeTypes;
            }),
            R.forEach((source) => {
                if (R.isPlainObject(source.base)) {
                    source.base.width ??= 1;
                    source.base.height ??= 1;

                    source.base.x = (source.base.x ?? 0) + offset.x;
                    source.base.y = (source.base.y ?? 0) + offset.y;

                    if (source.base.type === "token" && attachment) {
                        const token = this.getTargetToken(attachment);
                        if (token) {
                            source.base.width = token.width;
                            source.base.height = token.height;
                        }
                    }
                } else {
                    source.x = (source.x ?? 0) + offset.x;
                    source.y = (source.y ?? 0) + offset.y;
                }
            }),
            R.filter((source) => {
                try {
                    const shape = new shapeTypes[source.type as keyof typeof shapeTypes](source);
                    return !shape.invalid;
                } catch {
                    return false;
                }
            }),
        );

        // behaviors
        const behaviors = R.filter(await parseJSONCustomInputValues.call(this, "behavior"), testBehaviorSource);

        const firstSceneLevel = levels.length ? undefined : parent.levels.contents.at(0);
        const onlyLevel = levels.length === 1 ? parent.levels.get(levels[0]) : firstSceneLevel;

        const regionSource: DeepPartial<RegionSource> = {
            attachment: {
                token: this.getTargetToken(attachment)?.id ?? null,
            },
            behaviors,
            color: parsedColor && parsedColor === color ? (color as `#${string}`) : undefined,
            displayMeasurements: await this.getInputValue("displayMeasurements"),
            elevation: {
                bottom: bottom === -Infinity ? (onlyLevel?.elevation.bottom ?? null) : bottom,
                top: top === Infinity ? (onlyLevel?.elevation.top ?? null) : top,
                topInclusive: await this.getInputValue("topInclusive"),
            },
            hidden: await this.getInputValue("hidden"),
            highlightMode: await this.getInputValue("highlightMode"),
            levels: firstSceneLevel ? [firstSceneLevel.id] : levels,
            locked: await this.getInputValue("locked"),
            name: name || RegionCls.defaultName({ parent }),
            restriction: {
                enabled: await this.getInputValue("enabled"),
                priority: await this.getInputValue("priority"),
                type: await this.getInputValue("type"),
            },
            shapes: shapes,
            visibility: Number(await this.getInputValue("visibility")) as RegionVisibilityValue,
        };

        try {
            const region = await RegionCls.create(regionSource, { parent });
            if (region) {
                this.setOutputValue("region", region);
            }
        } catch (err: any) {
            console.error(err);
        }

        return this.executeNext("out");
    }
}

type AppearanceInputs = {
    name: string;
    color: string;
    visibility: `${RegionVisibilityValue}`;
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

type Inputs = AppearanceInputs &
    ElevationInputs &
    PlacementInputs &
    RestrictionInputs & {
        offset: Point;
    };

type Outputs = {
    region: RegionDocument | undefined;
};

type RegionVisibilityValue = ValueOf<typeof CONST.REGION_VISIBILITY>;

export { CreateRegionActionNode };
