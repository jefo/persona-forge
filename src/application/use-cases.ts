import { BotPersona, type BotPersonaDefinition } from "../domain/bot-persona";
import { Conversation } from "../domain/conversation";
import type { RenderedMessage } from "../rendering/render";
import { renderMessage } from "../rendering/render";
import type { ConversationRepository, PersonaRepository } from "./ports";

export interface Dependencies {
	personas: PersonaRepository;
	conversations: ConversationRepository;
}

export async function definePersona(
	deps: Dependencies,
	definition: BotPersonaDefinition,
): Promise<BotPersona> {
	const persona = BotPersona.create(definition);
	await deps.personas.save(persona);
	return persona;
}

export interface StartedConversation {
	conversation: Conversation;
	message: RenderedMessage;
}

export async function startConversation(
	deps: Dependencies,
	input: { personaId: string; chatId: string },
): Promise<StartedConversation> {
	const persona = await deps.personas.findById(input.personaId);
	if (!persona) {
		throw new Error(`BotPersona '${input.personaId}' not found.`);
	}

	const existing = await deps.conversations.findActiveByChatId(input.chatId);
	if (existing) {
		throw new Error(`Chat '${input.chatId}' already has an active conversation.`);
	}

	const conversation = Conversation.start(persona, input.chatId);
	await deps.conversations.save(conversation);

	return {
		conversation,
		message: renderMessage(persona, conversation.currentStateId, conversation.form),
	};
}

export type HandleResult =
	| {
			ok: true;
			conversation: Conversation;
			message: RenderedMessage;
			finished: boolean;
	  }
	| { ok: false; reason: string };

export async function handleInput(
	deps: Dependencies,
	input: { chatId: string; event: string; payload?: Record<string, unknown> },
): Promise<HandleResult> {
	const conversation = await deps.conversations.findActiveByChatId(input.chatId);
	if (!conversation) {
		return {
			ok: false,
			reason: `Chat '${input.chatId}' has no active conversation.`,
		};
	}

	const persona = await deps.personas.findById(conversation.botPersonaId);
	if (!persona) {
		return {
			ok: false,
			reason: `BotPersona '${conversation.botPersonaId}' not found.`,
		};
	}

	const result = conversation.process(persona, input.event, input.payload ?? {});
	if (!result.ok) {
		return { ok: false, reason: result.reason };
	}

	await deps.conversations.save(conversation);

	return {
		ok: true,
		conversation,
		message: renderMessage(persona, conversation.currentStateId, conversation.form),
		finished: result.finished,
	};
}
