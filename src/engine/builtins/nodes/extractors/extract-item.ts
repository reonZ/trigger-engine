import { BuiltinsInputEntry } from "engine";
import { BaseDocumentExtractorNode } from ".";

class ItemExtractorNode extends BaseDocumentExtractorNode<Item, Item> {
    static get type(): "extract-item" {
        return "extract-item";
    }

    static get tags(): string[] {
        return ["item"];
    }

    static get defineInputs(): BuiltinsInputEntry[] {
        return [{ key: "input", type: "item" }];
    }

    _castDocument(item: Item): Item {
        return item;
    }
}

export { ItemExtractorNode };
