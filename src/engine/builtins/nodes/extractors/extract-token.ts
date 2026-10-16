import { BuiltinsInputEntry } from "engine";
import { TokenDocumentPF2e } from "foundry-helpers";
import { BaseDocumentExtractorNode } from ".";

class TokenExtractorNode extends BaseDocumentExtractorNode<TargetDocuments, TokenDocumentPF2e> {
    static get type(): "extract-token" {
        return "extract-token";
    }

    static get tags(): string[] {
        return ["token"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [{ key: "input", type: "target" }];
    }

    _castDocument(target: TargetDocuments): TokenDocumentPF2e | undefined {
        return this.getTargetToken(target);
    }
}

export { TokenExtractorNode };
