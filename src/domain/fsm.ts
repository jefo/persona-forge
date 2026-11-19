import { z } from "zod";

/**
 * A transition is the only way a conversation can move.
 * `assign` writes into the conversation form:
 *   - "payload.name" takes the value from the incoming event payload;
 *   - "form.service" copies a value that is already in the form;
 *   - anything else is a literal.
 */
export const AssignExpressionSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.array(z.string()),
	z.record(z.string(), z.unknown()),
]);

export const ConditionSchema = z.object({
	field: z.string().min(1),
	operator: z.enum(["equals", "not_equals", "contains"]),
	value: z.unknown(),
});

export const TransitionSchema = z.object({
	event: z.string().min(1),
	target: z.string().min(1),
	assign: z.record(z.string(), AssignExpressionSchema).optional(),
	cond: ConditionSchema.optional(),
	resetForm: z.boolean().optional(),
});

export const StateSchema = z.object({
	id: z.string().min(1),
	on: z.array(TransitionSchema).default([]),
});

export const FsmDefinitionSchema = z.object({
	initialState: z.string().min(1),
	states: z.array(StateSchema).min(1),
});

export type AssignExpression = z.infer<typeof AssignExpressionSchema>;
export type ConditionDefinition = z.infer<typeof ConditionSchema>;
export type TransitionDefinition = z.infer<typeof TransitionSchema>;
export type StateDefinition = z.infer<typeof StateSchema>;
export type FsmDefinition = z.infer<typeof FsmDefinitionSchema>;

/**
 * Validated, immutable control flow. It knows nothing about forms,
 * rendering or Telegram.
 */
export class Fsm {
	readonly initialState: string;
	private readonly states: Map<string, StateDefinition>;

	constructor(definition: FsmDefinition) {
		const parsed = FsmDefinitionSchema.parse(definition);

		this.initialState = parsed.initialState;
		this.states = new Map(parsed.states.map((state) => [state.id, state]));

		if (this.states.size !== parsed.states.length) {
			throw new Error("FSM invariant failed: state ids must be unique.");
		}

		if (!this.states.has(this.initialState)) {
			throw new Error(
				`FSM invariant failed: initialState '${this.initialState}' not found.`,
			);
		}

		for (const state of this.states.values()) {
			for (const transition of state.on) {
				if (!this.states.has(transition.target)) {
					throw new Error(
						`FSM invariant failed: transition target '${transition.target}' from state '${state.id}' not found.`,
					);
				}
			}
		}
	}

	findTransitions(fromStateId: string, event: string): TransitionDefinition[] {
		const state = this.states.get(fromStateId);
		if (!state) return [];
		return state.on.filter((transition) => transition.event === event);
	}

	findTransition(fromStateId: string, event: string): TransitionDefinition | null {
		return this.findTransitions(fromStateId, event)[0] ?? null;
	}

	getState(stateId: string): StateDefinition | undefined {
		return this.states.get(stateId);
	}

	/** A state with no outgoing transitions ends the conversation. */
	isFinal(stateId: string): boolean {
		const state = this.states.get(stateId);
		return state !== undefined && state.on.length === 0;
	}

	get statesById(): ReadonlyMap<string, StateDefinition> {
		return this.states;
	}
}
