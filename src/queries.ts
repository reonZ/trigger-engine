import {
    ApplicationKey,
    AwaitConfirmActionNode,
    AwaitInputActionNode,
    AwaitPositionActionNode,
    AwaitSelectActionNode,
    AwaitTokenActionNode,
    ConfirmDialogQueryOptions,
    ExecuteScriptActionNode,
    ExecuteScriptQueryOptions,
    InputDialogQueryOptions,
    PanSocketArgs,
    PositionDialogQueryOptions,
    QueryUserArgs,
    SelectDialogQueryOptions,
    TokenDialogQueryOptions,
    TriggerApplication,
    TriggerPath,
} from "engine";
import { ActorPF2e, pan, R } from "foundry-helpers";
import { CreateItemQueryOptions, processCreateTargetsEmbeddedItem } from "queries-pf2e";

function onSocket(data: OnSocketArgs) {
    if (!R.isIncludedIn(game.user.id, data._ids)) return;

    switch (data._type) {
        case "pan-scene": {
            const user = game.users.get(data.user);
            pan(data.position, { ping: data.ping, user });
            return;
        }
    }
}

async function onUserQuery(data: UserQueryOptions) {
    switch (data._type) {
        case "await-confirm": {
            return AwaitConfirmActionNode.createDialog(data);
        }
        case "await-input": {
            return AwaitInputActionNode.createDialog(data);
        }
        case "await-position": {
            return AwaitPositionActionNode.createDialog(data);
        }
        case "await-select": {
            return AwaitSelectActionNode.createDialog(data);
        }
        case "await-token": {
            return AwaitTokenActionNode.createDialog(data);
        }
        case "create-item": {
            const actors = await Promise.all(data.actors.map(async (uuid) => await fromUuid<ActorPF2e>(uuid)));
            return processCreateTargetsEmbeddedItem(R.filter(actors, R.isTruthy), data.source);
        }
        case "execute-event": {
            const { applicationKey, args, eventName, userId } = data;
            return TriggerApplication.executeEvent(userId, applicationKey, eventName, args);
        }
        case "execute-script": {
            return ExecuteScriptActionNode.processExecuteScript(data);
        }
        case "execute-trigger": {
            const { args, eventName, triggerPath, userId } = data;
            return TriggerApplication.executeTriggerEvent(userId, triggerPath, eventName, args);
        }
    }
}

type UserQueryOptions =
    | ConfirmDialogQueryOptions
    | CreateItemQueryOptions
    | ExecuteEventQueryOptions
    | ExecuteScriptQueryOptions
    | ExecuteTriggerQueryOptions
    | InputDialogQueryOptions
    | PositionDialogQueryOptions
    | SelectDialogQueryOptions
    | TokenDialogQueryOptions;

type OnSocketArgs = PanSocketArgs;

type ExecuteTriggerQueryOptions = {
    _type: "execute-trigger";
    args: Record<string, any>;
    eventName: string;
    triggerPath: TriggerPath;
    userId: string;
};

type ExecuteEventQueryOptions = {
    _type: "execute-event";
    args: Record<string, any>;
    applicationKey: ApplicationKey;
    eventName: string;
    userId: string;
};

export { onSocket, onUserQuery };
export type { ExecuteEventQueryOptions, ExecuteTriggerQueryOptions, QueryUserArgs, UserQueryOptions };
