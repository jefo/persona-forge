import { definePersona, handleInput, startConversation } from "./use-cases";
import type { HandleResult, StartedConversation } from "./use-cases";
import type { ConversationRepository, PersonaRepository } from "./ports";
import {
	createInMemoryConversationRepository,
	createInMemoryPersonaRepository,
} from "../infrastructure/memory-repositories";
import type { BotPersona, BotPersonaDefinition } from "../domain/bot-persona";
import type { Conversation } from "../domain/conversation";
import type { RenderedMessage } from "../rendering/render";
import { renderMessage } from "../rendering/render";

export interface EngineOptions {
	personas?: PersonaRepository;
	conversations?: ConversationRepository;
}

export interface Engine {
	definePersona(definition: BotPersonaDefinition): Promise<BotPersona>;
	start(input: { personaId: string; chatId: string }): Promise<StartedConversation>;
	handle(input: {
		chatId: string;
		event: string;
		payload?: Record<string, unknown>;
	}): Promise<HandleResult>;
	getActiveConversation(chatId: string): Promise<Conversation | null>;
	screen(persona: BotPersona, conversation: Conversation): RenderedMessage;
}

/**
 * Composition root. The only place where domain, use cases and adapters
 * meet. Swap the repositories here to move from memory to Postgres.
 */
export function createEngine(options: EngineOptions = {}): Engine {
	const deps = {
		personas: options.personas ?? createInMemoryPersonaRepository(),
		conversations: options.conversations ?? createInMemoryConversationRepository(),
	};

	return {
		definePersona: (definition) => definePersona(deps, definition),
		start: (input) => startConversation(deps, input),
		handle: (input) => handleInput(deps, input),
		getActiveConversation: (chatId) =>
			deps.conversations.findActiveByChatId(chatId),
		screen: (persona, conversation) =>
			renderMessage(persona, conversation.currentStateId, conversation.form),
	};
}
