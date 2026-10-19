import { NodeFieldSchema } from "engine";
import { InputField } from ".";

class NumberField extends InputField<number, NumberFieldSchema> {
    static get defineSchema(): NodeFieldSchema {
        return {
            default: { type: "number", const: null },
            min: { type: "number" },
            max: { type: "number" },
            step: { type: "number" },
        };
    }

    get fontSize(): number {
        return this.baseFontSize * 0.9;
    }

    get width(): number {
        return 40;
    }

    get targetWidth(): number {
        return this.width * 2;
    }

    get toDisplay(): string {
        return String(this.value);
    }

    createInput(): HTMLInputElement {
        const { min, max, step } = this.field;

        return foundry.applications.fields.createNumberInput({
            name: "field",
            placeholder: String(this.default),
            value: this.value,
            min,
            max,
            step,
        });
    }

    afterRender(input: HTMLInputElement): void {
        input.focus();
    }

    afterAnimation(input: HTMLInputElement): void {
        input.select();
    }
}

type NumberFieldSchema = {
    default?: number;
    max?: number;
    min?: number;
    step: number;
};

export { NumberField };
export type { NumberFieldSchema };
