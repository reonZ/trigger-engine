import { BaseLogicNode, BuiltinsInputEntry, BuiltinsOutputEntry } from "engine";
import { GridSnappingMode, R } from "foundry-helpers";

const SQUARE_H_POINTS = ["AnchorCenter", "AnchorLeft", "AnchorRight"] as const;
const SQUARE_V_POINTS = ["AnchorCenter", "AnchorTop", "AnchorBottom"] as const;

class SnapGridLogicNode extends BaseLogicNode<"out", Inputs, Outputs, never, never, "square"> {
    static get type(): "snap-grid" {
        return "snap-grid";
    }

    static get states(): string[] {
        return ["square"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            { key: "position", type: "point" },
            ...R.map(
                [
                    ["squareH", SQUARE_H_POINTS],
                    ["squareV", SQUARE_V_POINTS],
                ] as const,
                ([key, options]): BuiltinsInputEntry => {
                    return {
                        key,
                        type: "text",
                        field: {
                            type: "select",
                            default: options[0],
                            options: options.map((value) => {
                                return { value, label: `JOURNAL.${value}` };
                            }),
                        },
                    };
                },
            ),
        ];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [{ key: "snapped", type: "point" }];
    }

    get title(): Maybe<string> {
        return this.localize("titles", this.state ?? "square");
    }

    async getGridSnappingMode(): Promise<GridSnappingMode> {
        const snappingH = await this.getInputValue("squareH");
        const snappingV = await this.getInputValue("squareV");

        switch (snappingV) {
            case "AnchorCenter": {
                switch (snappingH) {
                    case "AnchorCenter":
                        return CONST.GRID_SNAPPING_MODES.CENTER;
                    case "AnchorLeft":
                        return CONST.GRID_SNAPPING_MODES.LEFT_SIDE_MIDPOINT;
                    case "AnchorRight":
                        return CONST.GRID_SNAPPING_MODES.RIGHT_SIDE_MIDPOINT;
                }
            }
            case "AnchorTop": {
                switch (snappingH) {
                    case "AnchorCenter":
                        return CONST.GRID_SNAPPING_MODES.TOP_SIDE_MIDPOINT;
                    case "AnchorLeft":
                        return CONST.GRID_SNAPPING_MODES.TOP_LEFT_CORNER;
                    case "AnchorRight":
                        return CONST.GRID_SNAPPING_MODES.TOP_RIGHT_CORNER;
                }
            }
            case "AnchorBottom": {
                switch (snappingH) {
                    case "AnchorCenter":
                        return CONST.GRID_SNAPPING_MODES.BOTTOM_SIDE_MIDPOINT;
                    case "AnchorLeft":
                        return CONST.GRID_SNAPPING_MODES.BOTTOM_LEFT_CORNER;
                    case "AnchorRight":
                        return CONST.GRID_SNAPPING_MODES.BOTTOM_RIGHT_CORNER;
                }
            }
        }
    }

    async _execute(): Promise<boolean> {
        if (!canvas.grid.isSquare) {
            return this.executeNext("out");
        }

        const position = await this.getInputValue("position");
        const mode = await this.getGridSnappingMode();
        const snapped = canvas.grid.getSnappedPoint(position, { mode });

        this.setOutputValue("snapped", snapped);
        return this.executeNext("out");
    }
}

type Inputs = {
    position: Point;
    squareH: (typeof SQUARE_H_POINTS)[number];
    squareV: (typeof SQUARE_V_POINTS)[number];
};

type Outputs = {
    snapped: Point;
};

export { SnapGridLogicNode };
