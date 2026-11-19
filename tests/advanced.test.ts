import { describe, expect, it } from "bun:test";
import { BotPersona } from "../src/domain/bot-persona";
import { Conversation } from "../src/domain/conversation";
import { Form } from "../src/domain/form";
import { renderMessage } from "../src/rendering/render";
import { toTelegram } from "../src/rendering/telegram";

const multiSelectBot = {
	name: "Multi select",
	fsm: {
		initialState: "pick",
		states: [
			{
				id: "pick",
				on: [
					{
						event: "ADD",
						target: "pick",
						assign: {
							job: { op: "add" as const, value: "payload.value" },
						},
					},
					{ event: "DONE", target: "done" },
				],
			},
			{ id: "done", on: [] },
		],
	},
	viewMap: {
		nodes: [
			{
				id: "pick",
				props: {
					text: "Выбрано: {{job}}",
					buttons: [
						{ label: "Добавить", event: "ADD", payload: { value: "support" } },
					],
				},
			},
			{ id: "done", props: { text: "Готово: {{job}}" } },
		],
	},
	form: {
		fields: {
			job: { type: "array" as const, items: "string" as const },
		},
	},
};

describe("advanced engine features", () => {
	it("accumulates multiselect values with the add operation", () => {
		const persona = BotPersona.create(multiSelectBot);
		const conversation = Conversation.start(persona, "chat-add");

		conversation.process(persona, "ADD", { value: "qualification" });
		conversation.process(persona, "ADD", { value: "support" });

		expect(conversation.form.get("job")).toEqual(["qualification", "support"]);
	});

	it("validates arrays and objects in the form", () => {
		const form = new Form({
			fields: {
				job: { type: "array", items: "string" },
				estimate: { type: "object" },
			},
		});

		form.set("job", ["a", "b"]);
		form.set("estimate", { price: "$100" });

		expect(form.get("job")).toEqual(["a", "b"]);
		expect(form.get("estimate")).toEqual({ price: "$100" });
		expect(() => form.set("job", "a")).toThrow("expects array");
		expect(() => form.set("estimate", [])).toThrow("expects object");
	});

	it("selects a conditional transition and stores an object", () => {
		const persona = BotPersona.create({
			name: "Conditional",
			fsm: {
				initialState: "budget",
				states: [
					{
						id: "budget",
						on: [
							{
								event: "SELECT",
								target: "offer",
								cond: {
									field: "extras",
									operator: "contains",
									value: "crm",
								},
								assign: {
									estimate: { price: "$1500-$2500", timeline: "4-6 недель" },
								},
							},
							{
								event: "SELECT",
								target: "offer",
								assign: {
									estimate: { price: "$800-$1200", timeline: "3-4 недели" },
								},
							},
						],
					},
					{ id: "offer", on: [] },
				],
			},
			viewMap: {
				nodes: [
					{ id: "budget", props: { text: "Бюджет" } },
					{ id: "offer", props: { text: "Оценка: {{estimate.price}}" } },
				],
			},
			form: {
				fields: {
					extras: { type: "array", items: "string" },
					estimate: { type: "object" },
				},
			},
		});

		const withCrm = Conversation.start(persona, "chat-crm");
		withCrm.form.set("extras", ["crm", "analytics"]);
		const first = withCrm.process(persona, "SELECT");
		expect(first.ok).toBe(true);
		expect(withCrm.form.get("estimate")).toEqual({
			price: "$1500-$2500",
			timeline: "4-6 недель",
		});

		const withoutCrm = Conversation.start(persona, "chat-no-crm");
		withoutCrm.form.set("extras", ["analytics"]);
		withoutCrm.process(persona, "SELECT");
		expect(withoutCrm.form.get("estimate")).toEqual({
			price: "$800-$1200",
			timeline: "3-4 недели",
		});
	});

	it("renders nested fields and button payloads", () => {
		const persona = BotPersona.create(multiSelectBot);
		const conversation = Conversation.start(persona, "chat-render");
		conversation.process(persona, "ADD", { value: "qualification" });

		const message = renderMessage(persona, "pick", conversation.form);
		expect(message.text).toBe("Выбрано: qualification");
		expect(message.buttons[0]?.payload).toEqual({ value: "support" });

		const payload = toTelegram(message);
		expect(payload.reply_markup?.inline_keyboard[0]?.[0]?.callback_data).toContain(
			"ADD|",
		);
	});

	it("rejects conditions on unknown fields", () => {
		expect(() =>
			BotPersona.create({
				...multiSelectBot,
				viewMap: {
					nodes: [
						{ id: "pick", props: { text: "Выбрано: {{job}}" } },
						{ id: "done", props: { text: "Готово: {{job}}" } },
					],
				},
				fsm: {
					initialState: "pick",
					states: [
						{
							id: "pick",
							on: [
								{
									event: "DONE",
									target: "done",
									cond: { field: "ghost", operator: "equals", value: 1 },
								},
							],
						},
						{ id: "done", on: [] },
					],
				},
			}),
		).toThrow("checks unknown form field 'ghost'");
	});
});
