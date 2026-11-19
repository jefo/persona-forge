import type { BotPersona } from "./bot-persona";
import { Form, FormError } from "./form";
import type {
	AssignExpression,
	ConditionDefinition,
	TransitionDefinition,
} from "./fsm";
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

function isAddOperation(
	expression: AssignExpression,
): expression is { op: "add"; value: AssignExpression } {
	return (
		typeof expression === "object" &&
		expression !== null &&
		!Array.isArray(expression) &&
		(expression as Record<string, unknown>).op === "add" &&
		"value" in expression
	);
}

function resolveValue(
	expression: AssignExpression,
	payload: Record<string, unknown>,
	form: Form,
): unknown {
	if (typeof expression !== "string") return expression;

	if (expression.startsWith("payload.")) {
		const path = expression.slice("payload.".length);
		let current: unknown = payload;
		for (const segment of path.split(".")) {
			if (current === null || current === undefined || typeof current !== "object") {
				throw new FormError(`Payload field '${path}' is required.`);
			}
			current = (current as Record<string, unknown>)[segment];
		}
		if (current === undefined) {
			throw new FormError(`Payload field '${path}' is required.`);
		}
		return current;
	}

	if (expression.startsWith("form.")) {
		const path = expression.slice("form.".length);
		const value = form.getPath(path);
		if (value === undefined) {
			throw new FormError(`Form field '${path}' is empty.`);
		}
		return value;
	}

	return expression;
}

function equalValues(left: unknown, right: unknown): boolean {
	if (Array.isArray(left) && Array.isArray(right)) {
		return left.length === right.length && left.every((item, index) => item === right[index]);
	}
	if (
		typeof left === "object" &&
		left !== null &&
		typeof right === "object" &&
		right !== null
	) {
		return JSON.stringify(left) === JSON.stringify(right);
	}
	return left === right;
}

function conditionMet(condition: ConditionDefinition, form: Form): boolean {
	const actual = form.getPath(condition.field);

	switch (condition.operator) {
		case "equals":
			return equalValues(actual, condition.value);
		case "not_equals":
			return !equalValues(actual, condition.value);
		case "contains":
			if (Array.isArray(actual)) return actual.includes(condition.value);
			if (typeof actual === "string") return actual.includes(String(condition.value));
			return false;
	}
}

function applyAssign(
	key: string,
	expression: AssignExpression,
	payload: Record<string, unknown>,
	form: Form,
): unknown {
	if (isAddOperation(expression)) {
		const value = resolveValue(expression.value, payload, form);
		const current = form.get(key);
		const items = Array.isArray(current) ? current : [];
		return [...items, value];
	}

	return resolveValue(expression, payload, form);
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

		const candidates = persona.fsm.findTransitions(this._currentStateId, event);
		if (candidates.length === 0) {
			return {
				ok: false,
				reason: `Unknown event '${event}' in state '${this._currentStateId}'.`,
			};
		}

		const transition = candidates.find(
			(candidate) => !candidate.cond || conditionMet(candidate.cond, this._form),
		);

		if (!transition) {
			return {
				ok: false,
				reason: `Conditions for event '${event}' are not met in state '${this._currentStateId}'.`,
			};
		}

		const nextForm = transition.resetForm
			? new Form(persona.definition.form)
			: this._form.clone();

		try {
			for (const [key, expression] of Object.entries(transition.assign ?? {})) {
				nextForm.set(
					key,
					applyAssign(key, expression, payload, this._form),
				);
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
