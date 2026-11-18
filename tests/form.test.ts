import { describe, expect, it } from "bun:test";
import { Form, FormError } from "../src/domain/form";

const definition = {
	fields: {
		status: { type: "string" as const, default: "new" },
		count: { type: "number" as const },
		confirmed: { type: "boolean" as const, default: false },
		name: { type: "string" as const, required: true },
	},
};

describe("Form", () => {
	it("applies defaults and keeps types", () => {
		const form = new Form(definition);
		expect(form.get("status")).toBe("new");
		expect(form.get("confirmed")).toBe(false);
		expect(form.get("count")).toBeUndefined();
	});

	it("sets and reads values", () => {
		const form = new Form(definition);
		form.set("count", 3);
		form.set("name", "Иван");
		expect(form.get("count")).toBe(3);
		expect(form.toJSON()).toEqual({
			status: "new",
			confirmed: false,
			count: 3,
			name: "Иван",
		});
	});

	it("rejects a value of the wrong type", () => {
		const form = new Form(definition);
		expect(() => form.set("count", "3")).toThrow(FormError);
		expect(() => form.set("name", 42)).toThrow("expects string");
	});

	it("rejects an unknown field", () => {
		const form = new Form(definition);
		expect(() => form.set("email", "a@b.c")).toThrow("Unknown form field 'email'");
	});

	it("checks required fields", () => {
		const form = new Form(definition);
		expect(form.isComplete()).toBe(false);
		form.set("name", "Иван");
		expect(form.isComplete()).toBe(true);
	});

	it("clones without sharing mutable state", () => {
		const form = new Form(definition);
		const copy = form.clone();
		copy.set("name", "Пётр");
		expect(form.get("name")).toBeUndefined();
		expect(copy.get("name")).toBe("Пётр");
	});
});
