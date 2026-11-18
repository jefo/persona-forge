import type { BotPersona } from "./bot-persona";
import { Form, FormError } from "./form";
import type { TransitionDefinition } from "./fsm";
import type { ViewNode } from "./view-map";

export type ConversationStatus = "active" | "finished" | "cancelled";

export interface HistoryEntry {
	event: string;
	fromState: string;
	toState: string;
	at: Date;
}

export type ProcessResult =
	| {
			ok: true;
			transition: TransitionDefinition;
			node: ViewNode;
			finished: boolean;
	  }
	| { ok: false; reason: string };

function resolveExpression(
	expression: string | number | boolean,
	payload: Record<string, unknown>,
	form: Form,
): unknown {
	if (typeof expression !== "string") return expression;

	if (expression.startsWith("payload.")) {
		const key = expression.slice("payload.".length);
		if (!Object.prototype.hasOwnProperty.call(payload, key)) {
			throw new FormError(`Payload field '${key}' is required.`);
		}
		return payload[key];
	}

	if (expression.startsWith("form.")) {
		const key = expression.slice("form.".length);
		const value = form.get(key);
		if (value === undefined) {
			throw new FormError(`Form field '${key}' is empty.`);
		}
		return value;
	}

	return expression;
}

/**
 * One live dialogue. It owns the current state, the filled form and the
 * history. It never talks to Telegram or a database.
 */
export class Conversation {
	readonly id: string;
	readonly botPersonaId: string;
	readonly chatId: string;
	readonly createdAt: Date;

	private _status: ConversationStatus;
	private _currentStateId: string;
	private _form: Form;
	private _updatedAt: Date;
	private _history: HistoryEntry[];

	constructor(props: {
		id: string;
		botPersonaId: string;
		chatId: string;
		status: ConversationStatus;
		currentStateId: string;
		form: Form;
		createdAt: Date;
		updatedAt: Date;
		history?: HistoryEntry[];
	}) {
		this.id = props.id;
		this.botPersonaId = props.botPersonaId;
		this.chatId = props.chatId;
		this._status = props.status;
		this._currentStateId = props.currentStateId;
		this._form = props.form;
		this.createdAt = props.createdAt;
		this._updatedAt = props.updatedAt;
		this._history = props.history ?? [];
	}

	static start(persona: BotPersona, chatId: string): Conversation {
		if (!chatId) throw new Error("chatId is required.");

		const now = new Date();
		return new Conversation({
			id: crypto.randomUUID(),
			botPersonaId: persona.id,
			chatId,
			status: persona.fsm.isFinal(persona.fsm.initialState) ? "finished" : "active",
			currentStateId: persona.fsm.initialState,
			form: new Form(persona.definition.form),
			createdAt: now,
			updatedAt: now,
		});
	}

	get status(): ConversationStatus {
		return this._status;
	}

	get currentStateId(): string {
		return this._currentStateId;
	}

	get form(): Form {
		return this._form;
	}

	get updatedAt(): Date {
		return this._updatedAt;
	}

	get history(): readonly HistoryEntry[] {
		return this._history;
	}

	process(
		persona: BotPersona,
		event: string,
		payload: Record<string, unknown> = {},
	): ProcessResult {
		if (this.botPersonaId !== persona.id) {
			throw new Error("Conversation belongs to another BotPersona.");
		}

		if (this._status !== "active") {
			return { ok: false, reason: `Conversation is ${this._status}.` };
		}

		const transition = persona.fsm.findTransition(this._currentStateId, event);
		if (!transition) {
			return {
				ok: false,
				reason: `Unknown event '${event}' in state '${this._currentStateId}'.`,
			};
		}

		const nextForm = transition.resetForm
			? new Form(persona.definition.form)
			: this._form.clone();

		try {
			for (const [key, expression] of Object.entries(transition.assign ?? {})) {
				nextForm.set(key, resolveExpression(expression, payload, this._form));
			}
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			return { ok: false, reason };
		}

		const fromState = this._currentStateId;
		this._form = nextForm;
		this._currentStateId = transition.target;
		this._updatedAt = new Date();
		this._history.push({
			event,
			fromState,
			toState: transition.target,
			at: this._updatedAt,
		});

		const finished = persona.fsm.isFinal(transition.target);
		if (finished) this._status = "finished";

		const node = persona.viewMap.getNode(transition.target);
		if (!node) {
			throw new Error(`View node for state '${transition.target}' is missing.`);
		}

		return { ok: true, transition, node, finished };
	}

	cancel(): void {
		if (this._status !== "active") return;
		this._status = "cancelled";
		this._updatedAt = new Date();
	}
}
