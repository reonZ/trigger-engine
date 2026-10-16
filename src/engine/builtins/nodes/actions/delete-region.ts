import { IconObject } from "_zod";
import { BuiltinsInputEntry } from "engine";
import { BaseActionNode } from ".";
import { R } from "foundry-helpers";

class DeleteRegionActionNode extends BaseActionNode<"out", { region: RegionDocument[] }> {
    static get type(): "delete-region" {
        return "delete-region";
    }

    static get tags(): string[] {
        return ["region"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [{ key: "region", type: "region", isArray: true }];
    }

    get icon(): IconObject {
        return { unicode: "\uf867" };
    }

    async _execute(): Promise<boolean> {
        await Promise.all(R.map(await this.getInputValue("region"), (region) => region.delete()));
        return this.executeNext("out");
    }
}

export { DeleteRegionActionNode };
