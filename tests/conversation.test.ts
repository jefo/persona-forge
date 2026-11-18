import { describe, expect, it } from "bun:test";
import { BotPersona } from "../src/domain/bot-persona";
import { Conversation } from "../src/domain/conversation";
import { appointmentBot } from "../src/examples/appointment-bot";

const persona = BotPersona.create(appointmentBot, "persona-1");

function walk(conversation: Conversation, events: string[]) {
	for (const event of events) {
		const result = conversation.process(persona, event);
		expect(result.ok).toBe(true);
	}
}

describe("Conversation", () => {
	it("starts in the initial state with an empty form", () => {
		const conversation = Conversation.start(persona, "chat-1");
		expect(conversation.status).toBe("active");
		expect(conversation.currentStateId).toBe("welcome");
		expect(conversation.form.toJSON()).toEqual({});
	});

	it("moves on a valid event", () => {
		const conversation = Conversation.start(persona, "chat-1");
		const result = conversation.process(persona, "BOOK");
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.node.id).toBe("service");
		expect(conversation.currentStateId).toBe("service");
	});

	it("writes literals and payload values into the form", () => {
		const conversation = Conversation.start(persona, "chat-1");

		conversation.process(persona, "BOOK");
		conversation.process(persona, "SERVICE_CONSULT");
		expect(conversation.form.get("service")).toBe("Консультация");

		conversation.process(persona, "NAME", { name: "Иван" });
		expect(conversation.form.get("name")).toBe("Иван");
	});

	it("keeps state and form unchanged on an invalid event", () => {
		const conversation = Conversation.start(persona, "chat-1");
		const result = conversation.process(persona, "SERVICE_CONSULT");
		expect(result).toEqual({
			ok: false,
			reason: "Unknown event 'SERVICE_CONSULT' in state 'welcome'.",
		});
		expect(conversation.currentStateId).toBe("welcome");
		expect(conversation.form.toJSON()).toEqual({});
	});

	it("keeps state and form unchanged when a payload field is missing", () => {
		const conversation = Conversation.start(persona, "chat-1");
		conversation.process(persona, "BOOK");
		conversation.process(persona, "SERVICE_CONSULT");

		const result = conversation.process(persona, "NAME", {});
		expect(result).toEqual({
			ok: false,
			reason: "Payload field 'name' is required.",
		});
		expect(conversation.currentStateId).toBe("name");
		expect(conversation.form.get("name")).toBeUndefined();
	});

	it("finishes in a final state and records history", () => {
		const conversation = Conversation.start(persona, "chat-1");
		walk(conversation, ["BOOK", "SERVICE_CONSULT"]);
		conversation.process(persona, "NAME", { name: "Иван" });
		conversation.process(persona, "CONTACT", { contact: "+7 999 123-45-67" });
		conversation.process(persona, "TIME_1");

		const result = conversation.process(persona, "CONFIRM");
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.finished).toBe(true);
		expect(conversation.status).toBe("finished");
		expect(conversation.history).toHaveLength(6);
		expect(conversation.form.toJSON()).toEqual({
			service: "Консультация",
			name: "Иван",
			contact: "+7 999 123-45-67",
			datetime: "Завтра, 14:00",
		});
	});

	it("refuses to process input after finishing", () => {
		const conversation = Conversation.start(persona, "chat-1");
		walk(conversation, ["BOOK", "SERVICE_CONSULT"]);
		conversation.process(persona, "NAME", { name: "Иван" });
		conversation.process(persona, "CONTACT", { contact: "+7" });
		conversation.process(persona, "TIME_1");
		conversation.process(persona, "CONFIRM");

		expect(conversation.process(persona, "BOOK")).toEqual({
			ok: false,
			reason: "Conversation is finished.",
		});
	});

	it("resets the form when a transition asks for it", () => {
		const resetBot = BotPersona.create({
			name: "Reset bot",
			fsm: {
				initialState: "a",
				states: [
					{
						id: "a",
						on: [
							{
								event: "SET",
								target: "b",
								assign: { value: "payload.value" },
							},
						],
					},
					{
						id: "b",
						on: [
							{
								event: "RESET",
								target: "a",
								resetForm: true,
								assign: { value: "fresh" },
							},
						],
					},
				],
			},
			viewMap: {
				nodes: [
					{ id: "a", props: { text: "A" } },
					{ id: "b", props: { text: "B" } },
				],
			},
			form: {
				fields: {
					value: { type: "string", default: "default" },
				},
			},
		});

		const conversation = Conversation.start(resetBot, "chat-reset");
		expect(conversation.form.get("value")).toBe("default");
		conversation.process(resetBot, "SET", { value: "old" });
		expect(conversation.form.get("value")).toBe("old");
		conversation.process(resetBot, "RESET");
		expect(conversation.form.get("value")).toBe("fresh");
	});

	it("cancels an active conversation", () => {
		const conversation = Conversation.start(persona, "chat-1");
		conversation.cancel();
		expect(conversation.status).toBe("cancelled");
		expect(conversation.process(persona, "BOOK")).toEqual({
			ok: false,
			reason: "Conversation is cancelled.",
		});
	});

	it("refuses a conversation that belongs to another persona", () => {
		const conversation = Conversation.start(persona, "chat-1");
		const other = BotPersona.create(appointmentBot, "persona-2");
		expect(() => conversation.process(other, "BOOK")).toThrow(
			"Conversation belongs to another BotPersona.",
		);
	});
});
