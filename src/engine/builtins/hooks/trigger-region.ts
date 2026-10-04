import { TriggerApplication, TriggerHook, TriggerPath } from "engine";
import { R, RegionEventPF2e, TokenDocumentPF2e, createTargetDocuments, localize } from "foundry-helpers";
import fields = foundry.data.fields;

class RegionHook extends TriggerHook<RegionEventOptions> {
    static get type(): "region-hook" {
        return "region-hook";
    }

    get events(): ["region-event"] {
        return ["region-event"];
    }

    _enable(): void {}

    _disable(): void {}
}

class TriggerEngineRegionBehaviorType extends foundry.data.regionBehaviors.RegionBehaviorType {
    declare path: TriggerPath;

    static defineSchema() {
        return {
            events: this._createEventsField({
                events: R.values(CONST.REGION_EVENTS).filter((event) => event.startsWith("token")),
            }),
            path: new fields.StringField({
                required: true,
                nullable: false,
                trim: true,
                initial: "",
                label: localize("builtins.region.path"),
                validate: (value) => R.isString(value) && R.split(value, ":").length === 3,
            }),
        };
    }

    async _handleRegionEvent(event: RegionEventPF2e): Promise<void> {
        const region = this.region;
        if (!region || !("token" in event.data) || !game.user.isActiveGM) return;

        const target = createTargetDocuments({ token: event.data.token as TokenDocumentPF2e });
        if (!target) return;

        const args = await this._createRegionEventOptions(region, event, target);
        TriggerApplication.executeTriggerEvent(game.user.id, this.path, "region-event", args);
    }

    async _createRegionEventOptions(
        region: RegionDocument,
        event: RegionEventPF2e,
        target: TargetDocuments,
    ): Promise<RegionEventOptions> {
        return {
            attachment: createTargetDocuments({ token: this.region?.attachment?.token }),
            eventName: event.name,
            region,
            target,
            user: event.user,
        };
    }
}

type RegionEventOptions = {
    attachment: TargetDocuments | undefined;
    eventName: string;
    region: RegionDocument;
    target: TargetDocuments;
    user: User;
};

export { RegionHook, TriggerEngineRegionBehaviorType };
export type { RegionEventOptions };
