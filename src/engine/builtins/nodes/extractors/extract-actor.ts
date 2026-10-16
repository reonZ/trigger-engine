import { BuiltinsInputEntry } from "engine";
import { BaseDocumentExtractorNode } from ".";

class ActorExtractorNode extends BaseDocumentExtractorNode<BaseTargetDocuments, Actor> {
    static get type(): "extract-actor" {
        return "extract-actor";
    }

    static get tags(): string[] {
        return ["actor"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [{ key: "input", type: "target" }];
    }

    _castDocument(target: BaseTargetDocuments): Actor {
        return target.actor;
    }
}

export { ActorExtractorNode };
