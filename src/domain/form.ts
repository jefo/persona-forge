import { z } from "zod";

export const FieldSchema = z.object({
	type: z.enum(["string", "number", "boolean"]),
	required: z.boolean().optional(),
	default: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export const FormDefinitionSchema = z.object({
	fields: z.record(z.string(), FieldSchema),
});

export type FieldDefinition = z.infer<typeof FieldSchema>;
export type FormDefinition = z.infer<typeof FormDefinitionSchema>;
export type FormValue = string | number | boolean;

export class FormError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FormError";
	}
}

function assertType(field: string, definition: FieldDefinition, value: unknown): FormValue {
	if (definition.type === "string" && typeof value === "string") return value;
	if (definition.type === "number" && typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (definition.type === "boolean" && typeof value === "boolean") return value;

	throw new FormError(
		`Form field '${field}' expects ${definition.type}, got ${typeof value}.`,
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

	has(key: string): boolean {
		return this.values[key] !== undefined;
	}

	isComplete(): boolean {
		return Object.entries(this.definition.fields).every(([key, field]) => {
			return field.required !== true || this.values[key] !== undefined;
		});
	}

	toJSON(): Readonly<Record<string, FormValue>> {
		return { ...this.values };
	}

	clone(): Form {
		return new Form(this.definition, this.toJSON());
	}

	get fields(): Readonly<Record<string, FieldDefinition>> {
		return this.definition.fields;
	}
}
