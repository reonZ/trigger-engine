import { IconObject } from "_zod";
import { BaseEventNode, BuiltinsOutputEntry, RegionEventOptions } from "engine";

class RegionEvent<TOutputs extends RegionEventOutputs = RegionEventOutputs> extends BaseEventNode<never, TOutputs> {
    static get type(): "region-event" {
        return "region-event";
    }

    static get tags(): string[] {
        return ["region"];
    }

    static get defineOutputs(): BuiltinsOutputEntry[] {
        return [
            { key: "region", type: "region" },
            { key: "attachment", type: "target" },
            { key: "target", type: "target" },
            { key: "event", type: "text" },
        ];
    }

    get icon(): IconObject {
        return { unicode: "\uf719" };
    }

    async _execute(options: RegionEventOptions): Promise<boolean> {
        this.sceneContext = options.target.token;
        this._setOutputs(options);
        return this.executeNext("out");
    }

    _setOutputs({ attachment, eventName, region, target, user }: RegionEventOptions) {
        this.userContext = user;
        this.setOutputValue("attachment", attachment);
        this.setOutputValue("event", eventName);
        this.setOutputValue("region", region);
        this.setOutputValue("target", target);
    }
}

type RegionEventOutputs = {
    attachment?: TargetDocuments;
    event: string;
    region: RegionDocument;
    target: TargetDocuments;
};

export { RegionEvent };
export type { RegionEventOutputs };
