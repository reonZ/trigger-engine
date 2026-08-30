import { TriggerHook } from "engine";
import {
    AbilityItemPF2e,
    ActorPF2e,
    ChatMessagePF2e,
    CheckContextChatFlag,
    CheckType,
    DegreeOfSuccessString,
    FeatPF2e,
    ItemOriginFlag,
    ItemPF2e,
    R,
    SYSTEM,
    SpellPF2e,
    TokenDocumentPF2e,
    createToggleHook,
    isActionMessage,
    isSpellMessage,
    isValidTargetDocuments,
    messageHasCastSpellOption,
    messageHasUseActionOption,
} from "foundry-helpers";

class CreateMessageHook extends TriggerHook<
    ActionChatOptions | AttackRollOptions | DamageTakenOptions | CheckRollOptions | SpellCastOptions
> {
    static damageTakenTypes = ["all", "damage", "heal", "persistent", "negated"] as const;

    #hook = createToggleHook("createChatMessage", this.#onCreateMessage.bind(this));

    get events(): [
        "action-chat-event",
        "attack-roll-event",
        "damage-taken-event",
        "check-roll-event",
        "spell-cast-event",
    ] {
        return ["action-chat-event", "attack-roll-event", "damage-taken-event", "check-roll-event", "spell-cast-event"];
    }

    _enable() {
        this.#hook.activate();
    }

    _disable() {
        this.#hook.disable();
    }

    async #onCreateMessage(message: ChatMessagePF2e) {
        if (!game.user.isActiveGM) return;

        const { appliedDamage, origin, context } = message.flags[SYSTEM.id];

        if (
            origin &&
            isActionMessage(message) &&
            (!game.toolbelt?.getToolSetting("actionable", "actionable") || messageHasUseActionOption(message))
        ) {
            const data = await getMessageData<AbilityItemPF2e | FeatPF2e>(message, origin);
            if (!data) return;

            const { item, originActor, targets } = data;
            return this.executeEvent("action-chat-event", {
                item,
                options: origin.rollOptions ?? [],
                origin: originActor ? { actor: originActor } : undefined,
                targets,
            } satisfies ActionChatOptions);
        }

        if (origin && isSpellMessage(message) && messageHasCastSpellOption(message)) {
            const data = await getMessageData<SpellPF2e>(message, origin);
            if (!data) return;

            const { item, originActor, targets } = data;
            return this.executeEvent("spell-cast-event", {
                castRank: origin.castRank,
                item,
                options: origin.rollOptions ?? [],
                origin: originActor ? { actor: originActor } : undefined,
                targets,
                variant: origin.variant,
            } satisfies SpellCastOptions);
        }

        if (!context) return;

        if (context.type === "attack-roll") {
            const target = message.target;
            const source = { actor: message.actor, token: message.token };
            if (!isValidTargetDocuments(target) || !isValidTargetDocuments(source)) return;

            return this.executeEvent("attack-roll-event", {
                action: (context as { action?: string }).action || "",
                isReroll: context.isReroll,
                item: message.item,
                options: context.options ?? [],
                origin: source,
                outcome: context.outcome,
                target,
            } satisfies AttackRollOptions);
        }

        if (context.type === "damage-taken") {
            const target = { actor: message.actor, token: message.token };
            if (!isValidTargetDocuments(target)) return;

            const originActor = origin?.actor ? await fromUuid<ActorPF2e>(origin.actor) : null;

            const types: DamageTakenType[] = !appliedDamage
                ? ["all", "negated"]
                : appliedDamage.isHealing
                  ? ["heal"]
                  : appliedDamage.persistent.length
                    ? ["all", "damage", "persistent"]
                    : ["all", "damage"];

            return this.executeEvent("damage-taken-event", {
                item: await getAttackItem(origin?.uuid),
                options: context.options ?? [],
                origin: originActor ? { actor: originActor } : undefined,
                target,
                types,
            } satisfies DamageTakenOptions);
        }

        if (message.isCheckRoll) {
            const checkData = await checkRollData(message);
            return checkData && this.executeEvent("check-roll-event", checkData);
        }
    }
}

async function getMessageData<T extends ItemPF2e>(
    message: ChatMessagePF2e,
    origin: ItemOriginFlag,
): Promise<{ item: T; originActor: ActorPF2e | null; targets: TargetDocuments[] } | undefined> {
    const item = await fromUuid<T>(origin.uuid);
    if (!item) return;

    const originActor = origin?.actor ? await fromUuid<ActorPF2e>(origin.actor) : null;
    const targets = R.pipe(
        game.toolbelt?.api.targetHelper.getMessageTargets(message) ?? [],
        R.map((token) => {
            const actor = token.actor;
            return actor ? { actor, token } : null;
        }),
        R.filter(R.isTruthy),
    );

    return { item, originActor, targets };
}

async function checkRollData(message: ChatMessagePF2e, reroll?: boolean): Promise<CheckRollOptions | undefined> {
    const { context, origin } = message.flags[SYSTEM.id] as { context: CheckContextChatFlag; origin?: ItemOriginFlag };
    const roller = { actor: message.actor, token: message.token };
    if (!isValidTargetDocuments(roller)) return;

    const originActorUuid = origin?.actor ?? context.origin?.actor;
    const originActor = originActorUuid ? await fromUuid<ActorPF2e>(originActorUuid) : null;
    const originToken = context.origin?.token ? await fromUuid<TokenDocumentPF2e>(context.origin.token) : null;

    return {
        isReroll: reroll ?? context.isReroll,
        item: message.item,
        options: context.options ?? [],
        origin: originActor ? { actor: originActor, token: originToken } : undefined,
        outcome: context.outcome,
        roller,
        target: message.target ?? undefined,
        type: context.type,
    };
}

async function getAttackItem(uuid: string | undefined): Promise<ItemPF2e | undefined> {
    if (!uuid) return;

    const splits = R.split(uuid, ".");
    const actorUUID = splits.slice(0, -2).join(".");
    const actor = await fromUuid<ActorPF2e>(actorUUID);
    if (!actor) return;

    const itemId = splits.at(-1) as string;
    return itemId.startsWith("xx")
        ? actor.system.actions?.find((action) => action.item.id === itemId)?.item
        : actor.items.get(itemId);
}

type BaseOptions = {
    item: ItemPF2e | null | undefined;
    options: string[];
    origin: TargetDocuments | undefined;
    target: TargetDocuments;
};

type ActionChatOptions = Omit<BaseOptions, "item" | "target"> & {
    item: AbilityItemPF2e | FeatPF2e;
    targets: TargetDocuments[];
};

type SpellCastOptions = Omit<BaseOptions, "item" | "target"> & {
    castRank: number | undefined;
    item: SpellPF2e;
    targets: TargetDocuments[];
    variant: { overlays: string[] } | null | undefined;
};

type AttackRollOptions = WithRequired<BaseOptions, "origin"> & {
    action: string;
    isReroll: boolean;
    outcome: DegreeOfSuccessString | null;
};

type DamageTakenOptions = BaseOptions & {
    types: DamageTakenType[];
};

type CheckRollOptions = WithPartial<BaseOptions, "target"> & {
    isReroll: boolean;
    outcome: DegreeOfSuccessString | null;
    roller: TargetDocuments;
    type: CheckType;
};

type DamageTakenType = (typeof CreateMessageHook.damageTakenTypes)[number];

export { CreateMessageHook, checkRollData };
export type {
    ActionChatOptions,
    AttackRollOptions,
    CheckRollOptions,
    DamageTakenOptions,
    DamageTakenType,
    SpellCastOptions,
};
