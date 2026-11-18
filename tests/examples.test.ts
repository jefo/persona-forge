import { describe, expect, it } from "bun:test";
import { BotPersona } from "../src/domain/bot-persona";
import { createEngine } from "../src/application/engine";
import { appointmentBot } from "../src/examples/appointment-bot";
import { faqBot } from "../src/examples/faq-bot";
import { restaurantBot } from "../src/examples/restaurant-bot";

describe("example bots", () => {
	it("all definitions pass the persona invariants", () => {
		expect(() => BotPersona.create(appointmentBot)).not.toThrow();
		expect(() => BotPersona.create(faqBot)).not.toThrow();
		expect(() => BotPersona.create(restaurantBot)).not.toThrow();
	});

	it("FAQ bot can answer, go back and finish", async () => {
		const engine = createEngine();
		const persona = await engine.definePersona(faqBot);
		const chatId = "faq-chat";
		await engine.start({ personaId: persona.id, chatId });

		const answer = await engine.handle({ chatId, event: "FAQ_2" });
		expect(answer.ok).toBe(true);
		if (answer.ok) {
			expect(answer.message.text).toContain("Документация");
		}

		const back = await engine.handle({ chatId, event: "BACK" });
		expect(back.ok).toBe(true);
		if (back.ok) {
			expect(back.message.text).toContain("Частые вопросы");
		}

		const end = await engine.handle({ chatId, event: "END" });
		expect(end.ok).toBe(true);
		if (end.ok) expect(end.finished).toBe(true);
	});

	it("restaurant bot collects a dish and a quantity", async () => {
		const engine = createEngine();
		const persona = await engine.definePersona(restaurantBot);
		const chatId = "food-chat";
		await engine.start({ personaId: persona.id, chatId });

		for (const event of ["VIEW_MENU", "PIZZA", "ADD"]) {
			const result = await engine.handle({ chatId, event });
			expect(result.ok).toBe(true);
		}

		const cart = await engine.handle({ chatId, event: "CHECKOUT" });
		expect(cart.ok).toBe(true);
		if (!cart.ok) return;

		expect(cart.finished).toBe(true);
		expect(cart.message.text).toContain("Маргарита × 1");
		expect(cart.conversation.form.toJSON()).toEqual({
			dish: "Маргарита",
			quantity: 1,
		});
	});

	it("restaurant bot can be cancelled from the menu", async () => {
		const engine = createEngine();
		const persona = await engine.definePersona(restaurantBot);
		const chatId = "food-chat";
		await engine.start({ personaId: persona.id, chatId });

		const result = await engine.handle({ chatId, event: "CANCEL" });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.finished).toBe(true);
			expect(result.message.text).toContain("Диалог закрыт");
		}
	});
});
