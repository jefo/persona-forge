import { describe, expect, it } from "bun:test";
import { createEngine } from "../src/application/engine";
import { appointmentBot } from "../src/examples/appointment-bot";

describe("Engine", () => {
	it("starts with the welcome screen", async () => {
		const engine = createEngine();
		const persona = await engine.definePersona(appointmentBot);
		const started = await engine.start({
			personaId: persona.id,
			chatId: "chat-1",
		});

		expect(started.message.text).toContain("Запись на приём");
		expect(started.message.buttons.map((button) => button.label)).toEqual([
			"Записаться",
			"Не сейчас",
		]);
	});

	it("goes from /start to a finished appointment", async () => {
		const engine = createEngine();
		const persona = await engine.definePersona(appointmentBot);
		const chatId = "chat-1";
		await engine.start({ personaId: persona.id, chatId });

		const actions = [
			{ event: "BOOK" },
			{ event: "SERVICE_DIAG" },
			{ event: "NAME", payload: { name: "Иван" } },
			{ event: "CONTACT", payload: { contact: "+7 999 123-45-67" } },
			{ event: "TIME_2" },
		];

		for (const action of actions) {
			const result = await engine.handle({ chatId, ...action });
			expect(result.ok).toBe(true);
		}

		const final = await engine.handle({ chatId, event: "CONFIRM" });
		expect(final.ok).toBe(true);
		if (!final.ok) return;

		expect(final.finished).toBe(true);
		expect(final.message.text).toContain("Готово. Вы записаны.");
		expect(final.message.text).toContain("Диагностика");
		expect(final.message.text).toContain("Послезавтра, 10:00");
		expect(final.conversation.form.toJSON()).toEqual({
			service: "Диагностика",
			name: "Иван",
			contact: "+7 999 123-45-67",
			datetime: "Послезавтра, 10:00",
		});
	});

	it("reports an unknown chat instead of throwing", async () => {
		const engine = createEngine();
		const result = await engine.handle({ chatId: "ghost", event: "BOOK" });
		expect(result).toEqual({
			ok: false,
			reason: "Chat 'ghost' has no active conversation.",
		});
	});

	it("refuses a second active conversation in the same chat", async () => {
		const engine = createEngine();
		const persona = await engine.definePersona(appointmentBot);
		await engine.start({ personaId: persona.id, chatId: "chat-1" });

		await expect(
			engine.start({ personaId: persona.id, chatId: "chat-1" }),
		).rejects.toThrow("already has an active conversation");
	});

	it("allows a new conversation after the previous one finished", async () => {
		const engine = createEngine();
		const persona = await engine.definePersona(appointmentBot);
		const chatId = "chat-1";
		await engine.start({ personaId: persona.id, chatId });

		for (const action of [
			{ event: "BOOK" },
			{ event: "SERVICE_CONSULT" },
			{ event: "NAME", payload: { name: "Иван" } },
			{ event: "CONTACT", payload: { contact: "+7" } },
			{ event: "TIME_1" },
			{ event: "CONFIRM" },
		]) {
			await engine.handle({ chatId, ...action });
		}

		const restarted = await engine.start({ personaId: persona.id, chatId });
		expect(restarted.message.text).toContain("Запись на приём");
	});
});
