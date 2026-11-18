import { describe, expect, it } from "bun:test";
import { BotPersona } from "../src/domain/bot-persona";
import { Form } from "../src/domain/form";
import { appointmentBot } from "../src/examples/appointment-bot";
import { renderMessage } from "../src/rendering/render";
import { toTelegram } from "../src/rendering/telegram";

const persona = BotPersona.create(appointmentBot, "persona-1");

describe("renderMessage", () => {
	it("fills template fields from the form", () => {
		const form = new Form(appointmentBot.form);
		form.set("service", "Консультация");
		form.set("name", "Иван");
		form.set("contact", "+7 999 123-45-67");
		form.set("datetime", "Завтра, 14:00");

		const message = renderMessage(persona, "confirm", form);
		expect(message.component).toBe("summary");
		expect(message.text).toContain("Услуга: Консультация");
		expect(message.text).toContain("Имя: Иван");
		expect(message.text).toContain("Телефон: +7 999 123-45-67");
		expect(message.text).toContain("Время: Завтра, 14:00");
		expect(message.buttons).toHaveLength(3);
	});

	it("renders a dash for an empty field", () => {
		const form = new Form(appointmentBot.form);
		const message = renderMessage(persona, "confirm", form);
		expect(message.text).toContain("Услуга: —");
	});

	it("maps buttons to Telegram inline keyboard rows", () => {
		const form = new Form(appointmentBot.form);
		const message = renderMessage(persona, "confirm", form);
		const payload = toTelegram(message);

		expect(payload.reply_markup?.inline_keyboard[0]).toEqual([
			{ text: "Подтвердить", callback_data: "CONFIRM" },
		]);
		expect(payload.reply_markup?.inline_keyboard).toHaveLength(3);
	});

	it("omits the keyboard when there are no buttons", () => {
		const form = new Form(appointmentBot.form);
		const message = renderMessage(persona, "name", form);
		expect(toTelegram(message).reply_markup).toBeUndefined();
	});
});
