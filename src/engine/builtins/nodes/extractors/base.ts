import { TriggerNode } from "engine";

abstract class BaseExtractorNode<
    TInputs extends Record<string, any> | never = Record<string, any>,
    TOutputs extends Record<string, any> | never = Record<string, any>,
    TCustomInputs extends string | never = string,
    TCustomOutputs extends string | never = string,
    TState extends string | never = string,
    TOuts extends string = "out",
> extends TriggerNode<TOuts, TInputs, TOutputs, TCustomInputs, TCustomOutputs, TState> {
    static get category(): string {
        return "extractor";
    }

    get headerColor(): ColorSource {
        return "#86910d";
    }

    get subtitle(): Maybe<string> {
        return null;
    }
}

export { BaseExtractorNode };
