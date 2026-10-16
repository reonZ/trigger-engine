import { BuiltinsInputEntry, BuiltinsOutputEntry } from "engine";
import { BaseConditionNodeWithAfter } from ".";

class InsideRegionConditionNode extends BaseConditionNodeWithAfter<InsideRegionInputs, InsideRegionOutputs> {
    static get type() {
        return "inside-region";
    }

    static get tags(): string[] {
        return ["region"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            { key: "target", type: "target" },
            { key: "name", type: "text" },
        ];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [...BaseConditionNodeWithAfter.defineOutputs, { key: "region", type: "region" }];
    }

    get isLoop(): boolean {
        return true;
    }

    async _execute(): Promise<boolean> {
        const target = await this.getInputValue("target");
        const token = this.getTargetToken(target);

        if (!token?.regions.size) {
            return this.excuteFalse();
        }

        const regionCallback = await this._testRegionCallback();
        const regions = token.regions.filter((region) => regionCallback(region));

        if (!regions.size) {
            return this.excuteFalse();
        }

        for (const region of regions) {
            this.setOutputValue("region", region);

            const keepExecuting = await this.execute("true");
            if (!keepExecuting) break;
        }

        return this.executeNext("after");
    }

    async _testRegionCallback(): Promise<(region: RegionDocument) => boolean> {
        const name = await this.getInputValue("name");

        return (region: RegionDocument) => {
            return region.name === name;
        };
    }
}

type InsideRegionInputs = {
    name: string;
    target?: BaseTargetDocuments;
};

type InsideRegionOutputs = {
    boolean: boolean;
    region?: RegionDocument;
};

export { InsideRegionConditionNode };
export type { InsideRegionInputs };
