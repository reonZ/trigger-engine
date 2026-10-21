import { EntryConvertor } from "engine";
import { getTargetToken, ItemPF2e, primaryPlayerOwner, R, RegionDocumentPF2e, UserPF2e } from "foundry-helpers";

const TEXT_STRING_REGEX = /(?<x>[0-9\.]+)\s*[:,|_\/-]\s*(?<y>[0-9\.]+)/;

const builtinsConvertors = [
    {
        output: "boolean",
        input: "number",
        convertToInput: (value: boolean): number => {
            return Number(value);
        },
    },
    {
        output: "item",
        input: "target",
        convertToInput: (value: ItemPF2e): BaseTargetDocuments | undefined => {
            const actor = value.actor;
            return actor ? { actor } : undefined;
        },
    },
    {
        output: "number",
        input: "point",
        convertToInput: (value: number): Point | undefined => {
            return { x: value, y: value };
        },
    },
    {
        output: "number",
        input: "text",
        convertToInput: (value: number): string => {
            return String(value);
        },
    },
    {
        output: "region",
        input: "target",
        convertToInput: (value: RegionDocumentPF2e | undefined): BaseTargetDocuments[] => {
            return R.pipe(
                value ? [...value.tokens] : [],
                R.map((token) => {
                    const actor = token.actor;
                    return actor ? { actor, token } : undefined;
                }),
                R.filter(R.isTruthy),
            );
        },
    },
    {
        output: "target",
        input: "point",
        convertToInput: (value: BaseTargetDocuments): Point | undefined => {
            const token = getTargetToken(value);
            return token ? { x: token.x, y: token.y } : undefined;
        },
    },
    {
        output: "target",
        input: "user",
        convertToInput: (value: BaseTargetDocuments, userContext): User | undefined => {
            return !userContext.isGM && value.actor.testUserPermission(userContext, "OWNER")
                ? userContext
                : (primaryPlayerOwner(value.actor) ?? undefined);
        },
    },
    {
        output: "text",
        input: "number",
        convertToInput: (value: string): number => {
            const num = Number(value.trim() || "-1");
            return R.isNumber(num) ? num : -1;
        },
    },
    {
        output: "text",
        input: "point",
        convertToInput: (value: string): Point | undefined => {
            const match = TEXT_STRING_REGEX.exec(value);
            if (!match?.groups) return;

            return {
                x: Number(match.groups.x),
                y: Number(match.groups.y),
            };
        },
    },
    {
        output: "user",
        input: "target",
        convertToInput: (value: UserPF2e): BaseTargetDocuments | undefined => {
            const actor = value.character;
            return actor ? { actor } : undefined;
        },
    },
] as const satisfies EntryConvertor[];

export { builtinsConvertors };
