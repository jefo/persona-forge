import type { BotPersona } from "../domain/bot-persona";
import type { Form } from "../domain/form";

export interface RenderedButton {
	label: string;
	event: string;
	payload?: Record<string, unknown>;
}

export interface RenderedMessage {
	component: string;
	text: string;
	buttons: RenderedButton[];
}

const TEMPLATE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function format(value: unknown): string {
	if (value === undefined || value === null) return "—";
	if (Array.isArray(value)) return value.join(", ");
	if (typeof value === "object") return JSON.stringify(value);
	return String(value);
}

function fillTemplate(text: string, form: Form): string {
	return text.replace(TEMPLATE, (_match, path: string) => {
		return format(form.getPath(path));
	});
}

/**
 * Turns a view node into a plain message. The renderer is deliberately
 * separate from the engine: Telegram, console or a test can use the same
 * RenderedMessage.
 */
export function renderMessage(
	persona: BotPersona,
	stateId: string,
	form: Form,
): RenderedMessage {
	const node = persona.viewMap.getNode(stateId);
	if (!node) {
		throw new Error(`View node for state '${stateId}' is missing.`);
	}

	return {
		component: node.component ?? "message",
		text: fillTemplate(node.props.text, form),
		buttons: (node.props.buttons ?? []).map((button) => ({
			label: button.label,
			event: button.event,
			...(button.payload ? { payload: button.payload } : {}),
		})),
	};
}
