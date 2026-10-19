import { R, roundToStep } from "foundry-helpers";
import { BaseInputEntrySchema, BuiltInNodeEntry, NumberField, NumberFieldSchema } from ".";

class NumberEntry extends BuiltInNodeEntry<number, NumberFieldSchema> {
    static get type(): "number" {
        return "number";
    }

    static get default(): number {
        return 0;
    }

    static get color(): ColorSource {
        return 0x07b88f;
    }

    static get FieldClass(): typeof NumberField {
        return NumberField;
    }

    static castValue(value: unknown): unknown {
        const casted = Number(value);
        return R.isNumber(casted) ? casted : value;
    }

    static isValidType(value: unknown): value is number {
        return R.isNumber(value);
    }

    static toJSON(value: number): number {
        return value;
    }

    static fromJSON(value: JSONValue): number {
        return Number(value);
    }

    get default(): number {
        return this.field.default ?? super.default;
    }

    processValue(value: number): number {
        const { min = -Infinity, max = Infinity, step } = this.field;
        const stepped = R.isNumber(step) ? roundToStep(value, step) : value;
        return Math.clamp(stepped, min, max);
    }
}

type InputNumberEntry = BaseInputEntrySchema<"number", Partial<NumberFieldSchema>>;

export { NumberEntry };
export type { InputNumberEntry };
