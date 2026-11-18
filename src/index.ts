export { Fsm, FsmDefinitionSchema } from "./domain/fsm";
export type {
	FsmDefinition,
	StateDefinition,
	TransitionDefinition,
} from "./domain/fsm";

export { ViewMap, ViewMapDefinitionSchema, ViewNodeSchema } from "./domain/view-map";
export type { ButtonDefinition, ViewMapDefinition, ViewNode } from "./domain/view-map";

export { Form, FormDefinitionSchema, FormError, FieldSchema } from "./domain/form";
export type { FieldDefinition, FormDefinition, FormValue } from "./domain/form";

export { BotPersona, BotPersonaDefinitionSchema } from "./domain/bot-persona";
export type { BotPersonaDefinition } from "./domain/bot-persona";

export { Conversation } from "./domain/conversation";
export type {
	ConversationStatus,
	HistoryEntry,
	ProcessResult,
} from "./domain/conversation";

export { createEngine } from "./application/engine";
export type { Engine, EngineOptions } from "./application/engine";
export {
	definePersona,
	handleInput,
	startConversation,
} from "./application/use-cases";
export type { HandleResult, StartedConversation } from "./application/use-cases";
export type { ConversationRepository, PersonaRepository } from "./application/ports";

export {
	createInMemoryConversationRepository,
	createInMemoryPersonaRepository,
} from "./infrastructure/memory-repositories";

export { renderMessage } from "./rendering/render";
export type { RenderedButton, RenderedMessage } from "./rendering/render";
export { toTelegram } from "./rendering/telegram";
export type { TelegramMessage } from "./rendering/telegram";

export { appointmentBot } from "./examples/appointment-bot";
export { faqBot } from "./examples/faq-bot";
export { restaurantBot } from "./examples/restaurant-bot";
