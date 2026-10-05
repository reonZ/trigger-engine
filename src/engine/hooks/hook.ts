import { ApplicationKey, TriggerDataInput, TriggerNode, UserValue } from "engine";
import { ActorPF2e, MODULE } from "foundry-helpers";

class TriggerHook<TArgs extends Record<string, any> = Record<string, any>> {
    /**
     * @abstract
     * List of event types that this hook can execute.
     *
     * @see {@link TriggerHook#_enable}.
     */
    get events(): string[] {
        throw MODULE.Error("'events' accessor not implemented.");
    }

    /**
     * Should this hook only be enabled for the GM clients. You still have to account for isActiveGM yourself.
     */
    get gmOnly(): boolean {
        return true;
    }

    /** List of non-event node types that this hook has relation with. */
    get otherNodes(): string[] {
        return [];
    }

    /**
     * @abstract
     * This method is called if at least one trigger can be executed by this hook.
     */
    _enable(sources: TriggerDataInput[]) {
        throw MODULE.Error("'_enable' method not implemented.");
    }

    /**
     * @abstract
     * This method is called during preparation before {@link TriggerHook#_enable} if it was previously enabled.
     */
    _disable() {
        throw MODULE.Error("'_disable' method not implemented.");
    }

    /**
     * This method is called if no trigger can be executed by this hook but some {@link TriggerHook#otherNodes} exist.
     *
     * This is useful if you need to have some background process running for exceptional nodes.
     */
    _listen(sources: TriggerDataInput[]) {}
}

interface TriggerHook<TArgs extends Record<string, any> = Record<string, any>> {
    /** The internal key for the parent application. */
    get applicationKey(): ApplicationKey;

    /**
     * Convert a data object composed of raw data and/or user values into one that is sent via websocket
     *
     * @see {@link TriggerHook#convertToEmitable}
     * @see {@link TriggerHook#convertValueToEmitable}
     * @see {@link TriggerHook#convertValuesToEmitable}
     */
    convertObjectToEmitable<T extends string>(
        obj: Record<T, unknown>,
        conversionTypes: PartialRecord<T, string>,
        userValueEntries?: Partial<T>[],
        parseUserValues?: boolean,
    ): Record<T, unknown>;

    /** Convert a value into one that is sent via websocket. */
    convertToEmitable(type: string, value: any): UserValue | undefined;

    /**
     * Convert a user value into one that is sent via websocket.
     *
     * @see {@link TriggerHook#parseUserValue}
     */
    convertValueToEmitable(value: UserValue, parse?: boolean): UserValue | undefined;

    /** @see {@link TriggerHook#convertValueToEmitable} */
    convertValuesToEmitable(values: (UserValue | undefined)[], parse?: boolean): (UserValue | undefined)[];

    /**
     * Execute all triggers that have this event.
     *
     * @param event the name of the event to execute.
     * @param args the arguments to pass to the {@link TriggerNode#_execute} function.
     */
    executeEvent(event: this["events"][number], args?: TArgs): Promise<void>;

    /**
     * @see {@link TriggerHook#executeEvent}
     *
     * Execute the event of a specific trigger.
     *
     * @param triggerId the id of the trigger belonging to the same application.
     */
    executeTriggerEvent(triggerId: string, event: this["events"][number], args?: TArgs): Promise<void>;

    /**
     * @see {@link TriggerHook#executeEvent}
     *
     * You must make sure to pass an argument that can be stringified.
     */
    executeEventAsGM(event: this["events"][number], args?: TArgs): Promise<void>;

    /**
     * @see {@link TriggerHook#executeTriggerEvent}
     *
     * You must make sure to pass an argument that can be stringified.
     */
    executeTriggerEventAsGM(triggerId: string, event: this["events"][number], args?: TArgs): Promise<void>;

    /** Test if an actor is a world actor. */
    isValidActor(actor: Maybe<ActorPF2e>): actor is ActorPF2e;

    /** This is used to validate values provided by users at runtime. */
    parseUserValue(userValue: UserValue): UserValue | undefined;

    /**
     * @see {@link TriggerHook#validateUserValue}
     *
     * Parse & filter an array of user values.
     */
    parseUserValues(values: UserValue[]): (UserValue | undefined)[];
}

export { TriggerHook };
