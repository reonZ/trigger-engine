import { IconObject } from "_zod";
import { BuiltinsInputEntry } from "engine";
import { R } from "foundry-helpers";
import { BaseActionNode } from ".";

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
        const byScenes = R.reduce(
            await this.getInputValue("region"),
            (acc, region) => {
                const scene = region.parent;
                if (!scene) return acc;
                const entry = (acc[scene.id] ??= { scene, ids: [] });
                entry.ids.push(region.id);
                return acc;
            },
            {} as Record<string, { scene: Scene; ids: string[] }>,
        );

        await Promise.all(R.values(byScenes).map(({ scene, ids }) => scene.deleteEmbeddedDocuments("Item", ids)));

        return this.executeNext("out");
    }
}

export { DeleteRegionActionNode };
