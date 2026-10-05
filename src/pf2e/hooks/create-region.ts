import { TriggerHook } from "engine";
import {
    ActorPF2e,
    createTargetDocuments,
    createToggleHook,
    ItemPF2e,
    RegionDocumentPF2e,
    ScenePF2e,
    SYSTEM,
    UserPF2e,
} from "foundry-helpers";

class CreateRegionHook extends TriggerHook<TemplatePlacedEventOptions> {
    #createRegionTemplateHook = createToggleHook("createRegion", this.#onCreateRegion.bind(this));

    static get type(): "template-placed-hook" {
        return "template-placed-hook";
    }

    get events(): ["template-placed-event"] {
        return ["template-placed-event"];
    }

    _enable(): void {
        this.#createRegionTemplateHook.activate();
    }

    _disable(): void {
        this.#createRegionTemplateHook.disable();
    }

    async #onCreateRegion(region: RegionDocumentPF2e, _context: any, userId: string) {
        const user = game.users.get(userId);
        if (!user || !canvas.scene || !region.isEffectArea || !game.user.isActiveGM) return;

        const scene = region.object.scene;
        const flag = region.flags[SYSTEM.id].origin;
        if (!scene || !flag?.actor) return;

        const actor = await fromUuid<ActorPF2e>(flag.actor);
        const origin = createTargetDocuments({ actor });
        if (!origin) return;

        const item = flag.uuid ? await fromUuid<ItemPF2e>(flag.uuid) : null;

        const options: TemplatePlacedEventOptions = {
            attachment: createTargetDocuments({ token: region.attachment?.token }),
            item: item ?? undefined,
            options: flag.rollOptions || [],
            origin,
            region,
            scene,
            user,
        };

        this.executeEvent("template-placed-event", options);
    }
}

type TemplatePlacedEventOptions = {
    attachment?: TargetDocuments;
    item?: ItemPF2e;
    options: string[];
    origin: TargetDocuments;
    region: RegionDocumentPF2e;
    scene: ScenePF2e;
    user: UserPF2e;
};

export { CreateRegionHook };
export type { TemplatePlacedEventOptions };
