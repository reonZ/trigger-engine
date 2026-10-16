import { IconObject } from "_zod";
import {
    BuiltinsInputEntry,
    DescriptionInputs,
    DescriptionState,
    descriptionSchemas,
    descriptionStates,
    getDescriptionData,
    localizeKeyOrDescription,
} from "engine";
import { primaryPlayerOwner } from "foundry-helpers";
import { BaseActionNode } from ".";

const VISIBILITY_OPTIONS = ["all", "gm", "self"] as const;

class CreateMessageActionNode extends BaseActionNode<"out", Inputs, never, never, never, DescriptionState> {
    static get type(): "create-message" {
        return "create-message";
    }

    static get tags(): string[] {
        return ["chat"];
    }

    static get states(): string[] {
        return descriptionStates;
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            ...descriptionSchemas(),
            {
                key: "author",
                type: "user",
                label: "Author",
            },
            {
                key: "speaker",
                type: "target",
            },
            {
                key: "visibility",
                type: "text",
                field: {
                    type: "select",
                    default: "all",
                    options: VISIBILITY_OPTIONS,
                },
            },
        ];
    }

    get icon(): IconObject {
        return { unicode: "\uf4b6" };
    }

    async _execute(): Promise<boolean> {
        const descriptionInputs = await getDescriptionData.call(this);
        const content = await localizeKeyOrDescription(descriptionInputs);

        if (!content) {
            return this.executeNext("out");
        }

        const ChatMessage = getDocumentClass("ChatMessage");
        const speaker = await this.getInputValue("speaker");
        const visibility = await this.getInputValue("visibility");
        const userContext = this.userContext;

        const author =
            (await this.getInputValue("author")) ??
            (!userContext.isGM && speaker?.actor.testUserPermission(userContext, "OWNER")
                ? userContext
                : (speaker && primaryPlayerOwner(speaker.actor)) || userContext);

        const whisper =
            visibility === "all"
                ? undefined
                : visibility === "gm"
                  ? ChatMessage.getWhisperRecipients("GM")
                  : [userContext];

        await ChatMessage.create({
            author: author.id,
            content,
            speaker: speaker ? ChatMessage.getSpeaker(speaker) : undefined,
            whisper: whisper?.map((user) => user.id),
        });

        return this.executeNext("out");
    }
}

type Inputs = DescriptionInputs & {
    author?: User;
    speaker?: BaseTargetDocuments;
    visibility: (typeof VISIBILITY_OPTIONS)[number];
};

export { CreateMessageActionNode };
