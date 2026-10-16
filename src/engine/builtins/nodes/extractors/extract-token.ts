import { BuiltinsInputEntry } from "engine";
import { BaseDocumentExtractorNode } from ".";

class TokenExtractorNode extends BaseDocumentExtractorNode<BaseTargetDocuments, TokenDocument> {
    static get type(): "extract-token" {
        return "extract-token";
    }

    static get tags(): string[] {
        return ["token"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [{ key: "input", type: "target" }];
    }

    _castDocument(target: BaseTargetDocuments): TokenDocument | undefined {
        return this.getTargetToken(target);
    }
}

export { TokenExtractorNode };
