import { R } from "foundry-helpers";
import { BaseInputEntrySchema, BuiltInNodeEntry, SelectFieldOption, TextField, TextFieldSchema } from ".";
import validators = foundry.data.validators;

class TextEntry extends BuiltInNodeEntry<string, TextFieldSchema> {
    #options?: SelectFieldOption[];

    static get type(): "text" {
        return "text";
    }

    static get default(): string {
        return "";
    }

    static get color(): ColorSource {
        return 0xe0a06c;
    }

    static get FieldClass(): typeof TextField {
        return TextField;
    }

    static get defaultJSON(): string {
        return "{\n  \n}";
    }

    static castValue(value: unknown): unknown {
        return String(value);
    }

    static isValidType(value: unknown): value is string {
        return R.isString(value);
    }

    static toJSON(value: string): string {
        return value;
    }

    static fromJSON(value: JSONValue): string {
        return String(value);
    }

    get isEnrichedInput(): boolean {
        return this.field.type === "enriched";
    }

    get isJavascript() {
        return this.field.type === "javascript";
    }

    get isJSONInput(): boolean {
        return this.field.type === "json";
    }

    get isSimpleInput(): boolean {
        return !this.field.type || (this.field.type === "select" && !this.options.length);
    }

    get isSelect(): boolean {
        return this.field.type === "select" && !!this.options.length;
    }

    get default(): string {
        if (this.isSelect) {
            return this.getSelectValue(this.field.default);
        }

        return this.field.default ?? (this.field.type === "json" ? TextEntry.defaultJSON : super.default);
    }

    get options(): SelectFieldOption[] {
        return (this.#options ??= R.map(this.field?.options ?? [], (option): SelectFieldOption =>
            R.isString(option) ? { value: option } : option,
        ));
    }

    generateTooltip(label: string, isConnected: boolean): string | undefined {
        if (this.tooltip === false) return;

        const tooltip = super.generateTooltip(label, isConnected);

        if (this.category === "inputs" && !isConnected) {
            return tooltip ? `<div class="title">${label}</div><hr>${tooltip}` : label;
        }

        return tooltip;
    }

    /**
     * only called after we made sure this is a select
     */
    getSelectValue(value: string | undefined): string {
        return this.options.find((option) => option.value === value) ? (value as string) : this.options[0].value;
    }

    processValue(value: string): string {
        if (this.isSelect) {
            return this.getSelectValue(value);
        } else if (this.field.type === "json") {
            return validators.isJSON(value) ? value : TextEntry.defaultJSON;
        }

        return this.field.trim !== false ? value.trim() : value;
    }
}

type BaseField = Partial<Omit<TextFieldSchema, "options" | "type">>;

type SimpleField = BaseField & { type?: "enriched" };
type SelectField = BaseField & { type: "select"; options: TextFieldSchema["options"] };
type JsonField = BaseField & { type: "json" };
type JavascriptField = BaseField & { type: "javascript" };

type BuiltinsTextFieldSchema = SimpleField | SelectField | JsonField | JavascriptField;

type InputTextEntry = BaseInputEntrySchema<"text", BuiltinsTextFieldSchema>;

export { TextEntry };
export type { InputTextEntry, JsonField, SelectField };
