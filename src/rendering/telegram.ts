import type { RenderedMessage } from "./render";

export interface TelegramMessage {
	text: string;
	reply_markup?: {
		inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
	};
}

function encodeCallback(button: RenderedMessage["buttons"][number]): string {
	if (!button.payload) return button.event;

	const encoded = `${button.event}|${JSON.stringify(button.payload)}`;
	if (Buffer.byteLength(encoded) > 64) {
		throw new Error(`Telegram callback_data is too long for event '${button.event}'.`);
	}
	return encoded;
}

/**
 * Maps a rendered bot message to a Bot API payload. Kept as a pure
 * function so a screenshot script can capture the exact same payload
 * the bot would send.
 */
export function toTelegram(message: RenderedMessage): TelegramMessage {
	const payload: TelegramMessage = { text: message.text };

	if (message.buttons.length > 0) {
		payload.reply_markup = {
			inline_keyboard: message.buttons.map((button) => [
				{ text: button.label, callback_data: encodeCallback(button) },
			]),
		};
	}

	return payload;
}
