import { IconObject } from "_zod";
import { BaseEventNode } from "engine";
import { ItemPF2e, RegionDocumentPF2e } from "foundry-helpers";
import { PF2eOutputEntry, TemplatePlacedEventOptions } from "pf2e";

class TemplatePlacedEvent extends BaseEventNode<never, Outputs> {
    static get type(): "template-placed-event" {
        return "template-placed-event";
    }

    static get tags(): string[] {
        return ["region"];
    }

    static get defineOutputs(): PF2eOutputEntry[] {
        return [
            { key: "region", type: "region" },
            { key: "origin", type: "target" },
            { key: "attachment", type: "target" },
            { key: "item", type: "item" },
            { key: "options", type: "text", isArray: true },
        ];
    }

    get icon(): IconObject {
        return { unicode: "\uf867" };
    }

    _execute({ attachment, item, options, origin, region, scene, user }: TemplatePlacedEventOptions): Promise<boolean> {
        this.sceneContext = scene;
        this.userContext = user;

        this.setOutputValue("attachment", attachment);
        this.setOutputValue("item", item);
        this.setOutputValue("options", options);
        this.setOutputValue("origin", origin);
        this.setOutputValue("region", region);

        return this.executeNext("out");
    }
}

type Outputs = {
    attachment?: TargetDocuments;
    item?: ItemPF2e;
    options: string[];
    origin: TargetDocuments;
    region: RegionDocumentPF2e;
};

export { TemplatePlacedEvent };
