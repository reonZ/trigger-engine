import { BaseMatchLogicNode, BuiltinsInputEntry } from "engine";

class ActorsMatchLogicNode extends BaseMatchLogicNode<BaseTargetDocuments | undefined> {
    static get type(): "actors-match" {
        return "actors-match";
    }

    static get tags(): string[] {
        return ["actor"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [
            { key: "a", type: "target" },
            { key: "b", type: "target" },
        ];
    }

    _match(entryA: BaseTargetDocuments | undefined, entryB: BaseTargetDocuments | undefined): boolean {
        return entryA?.actor.uuid === entryB?.actor.uuid;
    }
}

export { ActorsMatchLogicNode };
