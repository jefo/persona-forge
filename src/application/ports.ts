import type { BotPersona } from "../domain/bot-persona";
import type { Conversation } from "../domain/conversation";

export interface PersonaRepository {
	save(persona: BotPersona): Promise<void>;
	findById(id: string): Promise<BotPersona | null>;
}

export interface ConversationRepository {
	save(conversation: Conversation): Promise<void>;
	findActiveByChatId(chatId: string): Promise<Conversation | null>;
}
