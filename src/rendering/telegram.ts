import type { RenderedMessage } from "./render";

export interface TelegramMessage {
	text: string;
	reply_markup?: {
		inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
	};
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
			inline_keyboard: message.buttons.map((button, index) => [
				{
					text: button.label,
					// Telegram limits callback_data to 64 bytes. A payload can
					// contain Cyrillic, so send its index in the current screen
					// instead of JSON.
					callback_data: button.payload
						? `${button.event}|${index}`
						: button.event,
				},
			]),
		};
	}

	return payload;
}
