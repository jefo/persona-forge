import type { ConversationRepository, PersonaRepository } from "../application/ports";
import type { BotPersona } from "../domain/bot-persona";
import type { Conversation } from "../domain/conversation";

export const createInMemoryPersonaRepository = (): PersonaRepository => {
	const items = new Map<string, BotPersona>();

	return {
		async save(persona) {
			items.set(persona.id, persona);
		},
		async findById(id) {
			return items.get(id) ?? null;
		},
	};
};

export const createInMemoryConversationRepository =
	(): ConversationRepository => {
		const items = new Map<string, Conversation>();

		return {
			async save(conversation) {
				items.set(conversation.id, conversation);
			},
			async findActiveByChatId(chatId) {
				for (const conversation of items.values()) {
					if (
						conversation.chatId === chatId &&
						conversation.status === "active"
					) {
						return conversation;
					}
				}
				return null;
			},
		};
	};
