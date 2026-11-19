import { z } from "zod";

const ScalarSchema = z.union([z.string(), z.number(), z.boolean()]);
const ValueSchema = z.union([
	ScalarSchema,
	z.array(z.string()),
	z.record(z.string(), z.unknown()),
]);

export const FieldSchema = z.object({
	type: z.enum(["string", "number", "boolean", "array", "object"]),
	items: z.enum(["string"]).optional(),
	required: z.boolean().optional(),
	default: ValueSchema.optional(),
});

export const FormDefinitionSchema = z.object({
	fields: z.record(z.string(), FieldSchema),
});

export type FieldDefinition = z.infer<typeof FieldSchema>;
export type FormDefinition = z.infer<typeof FormDefinitionSchema>;
export type FormValue =
	| string
	| number
	| boolean
	| string[]
	| Record<string, unknown>;

export class FormError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FormError";
	}
}

function cloneValue(value: FormValue): FormValue {
	if (Array.isArray(value)) return [...value];
	if (typeof value === "object" && value !== null) return { ...value };
	return value;
}

function describe(value: unknown): string {
	if (Array.isArray(value)) return "array";
	if (value === null) return "null";
	return typeof value;
}

function assertType(
	field: string,
	definition: FieldDefinition,
	value: unknown,
): FormValue {
	if (definition.type === "string" && typeof value === "string") return value;
	if (
		definition.type === "number" &&
		typeof value === "number" &&
		Number.isFinite(value)
	) {
		return value;
	}
	if (definition.type === "boolean" && typeof value === "boolean") return value;

	if (definition.type === "array") {
		if (!Array.isArray(value)) {
			throw new FormError(`Form field '${field}' expects array, got ${describe(value)}.`);
		}
		if (definition.items === "string" && !value.every((item) => typeof item === "string")) {
			throw new FormError(`Form field '${field}' expects an array of strings.`);
		}
		return [...value];
	}

	if (definition.type === "object") {
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			throw new FormError(`Form field '${field}' expects object, got ${describe(value)}.`);
		}
		return { ...(value as Record<string, unknown>) };
	}

	throw new FormError(
		`Form field '${field}' expects ${definition.type}, got ${describe(value)}.`,
	);
}

/**
 * A typed key-value store for one conversation. The schema lives in the
 * bot definition, so a conversation can be restored from plain JSON later.
 */
export class Form {
	private readonly definition: FormDefinition;
	private values: Record<string, FormValue>;

	constructor(definition: FormDefinition, initial: Record<string, unknown> = {}) {
		this.definition = FormDefinitionSchema.parse(definition);
		this.values = {};

		for (const [key, field] of Object.entries(this.definition.fields)) {
			if (field.default !== undefined) {
				this.set(key, field.default);
			}
		}

		for (const [key, value] of Object.entries(initial)) {
			if (!this.definition.fields[key]) {
				throw new FormError(`Unknown form field '${key}'.`);
			}
			this.set(key, value);
		}
	}

	set(key: string, value: unknown): void {
		const field = this.definition.fields[key];
		if (!field) {
			throw new FormError(`Unknown form field '${key}'.`);
		}
		this.values[key] = assertType(key, field, value);
	}

	get(key: string): FormValue | undefined {
		return this.values[key];
	}

	/** Reads "estimate.price" or "job.0" from the form. */
	getPath(path: string): unknown {
		let current: unknown = this.values;

		for (const segment of path.split(".")) {
			if (current === null || current === undefined) return undefined;
			if (Array.isArray(current)) {
				const index = Number(segment);
				current = Number.isInteger(index) ? current[index] : undefined;
			} else if (typeof current === "object") {
				current = (current as Record<string, unknown>)[segment];
			} else {
				return undefined;
			}
		}

		return current;
	}

	has(key: string): boolean {
		return this.values[key] !== undefined;
	}

	isComplete(): boolean {
		return Object.entries(this.definition.fields).every(([key, field]) => {
			return field.required !== true || this.values[key] !== undefined;
		});
	}

	toJSON(): Readonly<Record<string, FormValue>> {
		const copy: Record<string, FormValue> = {};
		for (const [key, value] of Object.entries(this.values)) {
			copy[key] = cloneValue(value);
		}
		return copy;
	}

	clone(): Form {
		return new Form(this.definition, this.toJSON());
	}

	get fields(): Readonly<Record<string, FieldDefinition>> {
		return this.definition.fields;
	}
}
