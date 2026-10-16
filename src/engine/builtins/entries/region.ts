import { NodeEntry } from "engine";
import { DocumentUUID, R } from "foundry-helpers";

class RegionEntry extends NodeEntry<RegionDocument | undefined> {
    static get type(): "region" {
        return "region";
    }

    static get default(): undefined {
        return undefined;
    }

    static get color(): ColorSource {
        return 0x4f4c42;
    }

    static castValue(value: unknown): unknown {
        return value instanceof foundry.canvas.placeables.Region ? value.document : value;
    }

    static isValidType(value: unknown): value is RegionDocument {
        return value instanceof RegionDocument && !value.pack;
    }

    static toJSON(value: RegionDocument): DocumentUUID {
        return value.uuid as DocumentUUID;
    }

    static async fromJSON(value: unknown): Promise<RegionDocument | undefined> {
        const region = R.isString(value) ? await fromUuid<RegionDocument>(value) : undefined;
        return this.isValidType(region) ? region : undefined;
    }
}

export { RegionEntry };
