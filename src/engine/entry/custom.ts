import { z } from "foundry-helpers";
import { zCustomInputValue } from ".";

// data

const zBaseData = z.object({
    id: z.string().trim().min(1).default(foundry.utils.randomID).readonly(),
    input: zCustomInputValue,
    label: z.string().trim().min(1),
    slug: z.string().trim().min(1),
});

const zBaseEntryData = zBaseData.extend({
    isArray: z.boolean().optional().catch(false),
    type: z.string().trim().min(1),
});

type BaseCustomData = z.input<typeof zBaseData>;

type BaseCustomEntryDataSource = z.input<typeof zBaseEntryData>;
type BaseCustomEntryData = z.output<typeof zBaseEntryData>;

// schema

const zInputField = z.object({
    isNumber: z.boolean().default(false),
    label: z.string().trim().min(1).optional(),
    placeholder: z.string().trim().min(1).optional(),
    replaceLabel: z.boolean().default(false),
    validation: z.string().optional(),
});

const zBaseSchema = z.object({
    hidden: z.boolean().default(false),
    input: zInputField.optional(),
    label: z.string().trim().min(1).optional(),
    slug: z.string().trim().min(1),
});

const zBaseEntrySchema = zBaseSchema.extend({
    array: z.boolean().default(false),
    group: z.string().trim().min(1).optional(),
    tooltip: z.string().trim().optional(),
    types: z.array(z.string().trim().min(1)).default(() => []),
});

type BaseCustomSchema = z.input<typeof zBaseSchema>;

type BaseCustomEntrySchema = z.input<typeof zBaseEntrySchema>;

// out

const zCustomOutData = zBaseData;

const zCustomOutSchema = zBaseSchema;

type CustomOutData = z.input<typeof zCustomOutData>;

type CustomOutSchema = WithRequired<z.input<typeof zCustomOutSchema>, "input">;

// output

const zCustomOutputData = zBaseEntryData;

const zCustomOutputSchema = zBaseEntrySchema;

type CustomOutputData = z.input<typeof zCustomOutputData>;

type CustomOutputSchema = z.input<typeof zCustomOutputSchema>;

// input

const zCustomInputData = zBaseEntryData;

const zCustomInputSchema = zBaseEntrySchema;

type CustomInputData = z.input<typeof zCustomInputData>;

type CustomInputSchema<TFieldSchema extends Record<string, any> | undefined = any> = Prettify<
    z.input<typeof zCustomInputSchema> & {
        field?: TFieldSchema;
    }
>;

export {
    zBaseEntrySchema,
    zCustomInputData,
    zCustomInputSchema,
    zCustomOutData,
    zCustomOutSchema,
    zCustomOutputData,
    zCustomOutputSchema,
};
export type {
    BaseCustomData,
    BaseCustomEntryData,
    BaseCustomEntryDataSource,
    BaseCustomEntrySchema,
    BaseCustomSchema,
    CustomInputData,
    CustomInputSchema,
    CustomOutData,
    CustomOutSchema,
    CustomOutputData,
    CustomOutputSchema,
};
