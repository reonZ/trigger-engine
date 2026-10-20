import { MODULE, R, z } from "foundry-helpers";
import { zCollection, zDocumentId } from ".";

abstract class zDocument<TSchema extends zDocumentSource = zDocumentSource> {
    #invalid: boolean = false;

    declare readonly _schema: TSchema;
    declare readonly _source: z.core.$ZodLooseShape;

    static get defineSchema(): zDocumentSource {
        throw new Error("'defineSchema' static getter must be defined");
    }

    static get collections(): Record<string, typeof zDocument & any> {
        return {};
    }

    constructor(source: z.input<TSchema>) {
        Object.defineProperty(this, "_schema", {
            value: (this.constructor as typeof zDocument).defineSchema,
            configurable: false,
            enumerable: false,
            writable: false,
        });

        Object.defineProperty(this, "_source", {
            value: this.#initializeSource(source),
            configurable: false,
            enumerable: false,
            writable: false,
        });

        Object.seal(this._schema);
        // Object.seal(this._source);

        this._initialize();
    }

    get invalid(): boolean {
        return this.#invalid;
    }

    _initialize() {
        try {
            const collections = (this.constructor as typeof zDocument).collections;

            for (const [key, field] of R.entries(this._schema.shape)) {
                if (key in collections) {
                    if (!(key in this)) {
                        Object.defineProperty(this, key, {
                            value: new zCollection(key, this, collections[key]),
                            writable: false,
                        });
                    }

                    (this[key as keyof this] as zCollection)._initialize();
                } else if (field.type === "readonly") {
                    if (key in this) continue;

                    Object.defineProperty(this, key, {
                        value: field.parse(this._source[key]),
                        writable: false,
                    });
                } else {
                    const value = field.parse(this._source[key]);
                    Object.defineProperty(this, key, {
                        get() {
                            return value;
                        },
                        set() {},
                        configurable: true,
                    });
                }
            }

            this.#invalid = false;
        } catch (error: any) {
            MODULE.error(`an error ocurred during initialization of {${this.constructor.name}}.`, error);
            this.#invalid = true;
        }
    }

    update(changes: DeepPartial<z.input<TSchema>> & { [k: string]: any }): this {
        const flattened = foundry.utils.flattenObject(changes) as Record<string, any>;

        for (const [key, value] of R.entries(flattened)) {
            if (value === undefined) {
                foundry.utils.deleteProperty(this._source, key);
            } else if (R.isObjectType(value) && !R.isArray(value)) {
                const current = foundry.utils.getProperty(this._source, key) ?? {};
                const merged = foundry.utils.mergeObject(current, value);
                foundry.utils.setProperty(this._source, key, merged);
            } else {
                foundry.utils.setProperty(this._source, key, value);
            }
        }

        this._initialize();
        return this;
    }

    clone(): this {
        const source = this.toObject();
        const Cls = this.constructor as typeof _zDocument<TSchema>;
        return new Cls(source) as this;
    }

    toObject(): z.output<TSchema> {
        return foundry.utils.deepClone(this._source) as z.output<TSchema>;
    }

    #initializeSource(source: z.core.$ZodLooseShape) {
        source.id = zDocumentId.parse(source.id);

        for (const [key, field] of R.entries(this._schema.shape)) {
            if (!(key in source)) {
                source[key] = field.parse(undefined);
            }
        }

        return source;
    }
}

declare class _zDocument<TSchema extends zDocumentSource = zDocumentSource> {
    constructor(source: z.output<TSchema>);
}

type zDocumentInstance<TSchema extends zDocumentSource> = Prettify<z.output<TSchema> & zDocument<TSchema>>;

type zDocumentSource = z.ZodObject<{ id: z.ZodReadonly<z.ZodDefault<z.ZodString>> }>;

export { zDocument };
export type { zDocumentInstance, zDocumentSource };
