import { describe, expect, it } from "bun:test";
import { BotPersona } from "../src/domain/bot-persona";
import { appointmentBot } from "../src/examples/appointment-bot";

const base = {
	name: "Test bot",
	fsm: {
		initialState: "a",
		states: [{ id: "a", on: [] as Array<{ event: string; target: string }> }],
	},
	viewMap: {
		nodes: [{ id: "a", props: { text: "A" } }],
	},
	form: { fields: {} },
};

describe("BotPersona", () => {
	it("creates a persona from a coherent definition", () => {
		const persona = BotPersona.create(appointmentBot, "persona-1");
		expect(persona.id).toBe("persona-1");
		expect(persona.definition.name).toBe("Appointment Bot");
		expect(persona.fsm.initialState).toBe("welcome");
	});

	it("rejects a state without a view node", () => {
		expect(
			() =>
				BotPersona.create({
					...base,
					fsm: {
						initialState: "a",
						states: [{ id: "a", on: [] }, { id: "b", on: [] }],
					},
				}),
		).toThrow("state 'b' has no view node");
	});

	it("rejects a view node without a state", () => {
		expect(
			() =>
				BotPersona.create({
					...base,
					viewMap: {
						nodes: [
							{ id: "a", props: { text: "A" } },
							{ id: "ghost", props: { text: "Boo" } },
						],
					},
				}),
		).toThrow("view node 'ghost' has no FSM state");
	});

	it("rejects a template for an unknown form field", () => {
		expect(
			() =>
				BotPersona.create({
					...base,
					viewMap: {
						nodes: [{ id: "a", props: { text: "Hello {{name}}" } }],
					},
				}),
		).toThrow("template '{{name}}'");
	});

	it("rejects a button with an unknown event", () => {
		expect(
			() =>
				BotPersona.create({
					...base,
					viewMap: {
						nodes: [
							{
								id: "a",
								props: {
									text: "A",
									buttons: [{ label: "Go", event: "GO" }],
								},
							},
						],
					},
				}),
		).toThrow("unknown event 'GO'");
	});

	it("rejects an assign to an unknown form field", () => {
		expect(
			() =>
				BotPersona.create({
					...base,
					fsm: {
						initialState: "a",
						states: [
							{
								id: "a",
								on: [
									{
										event: "GO",
										target: "a",
										assign: { name: "payload.name" },
									},
								],
							},
						],
					},
				}),
		).toThrow("assigns unknown form field 'name'");
	});

	it("rejects a literal of the wrong type", () => {
		expect(
			() =>
				BotPersona.create({
					...base,
					fsm: {
						initialState: "a",
						states: [
							{
								id: "a",
								on: [
									{
										event: "GO",
										target: "a",
										assign: { quantity: "1" },
									},
								],
							},
						],
					},
					form: { fields: { quantity: { type: "number" } } },
				}),
		).toThrow("assigns string to number field 'quantity'");
	});
});
