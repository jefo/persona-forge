import { z } from "zod";

/**
 * A transition is the only way a conversation can move.
 * `assign` writes into the conversation form:
 *   - "payload.name" takes the value from the incoming event payload;
 *   - "form.service" copies a value that is already in the form;
 *   - anything else is a literal.
 */
export const TransitionSchema = z.object({
	event: z.string().min(1),
	target: z.string().min(1),
	assign: z
		.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
		.optional(),
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

	findTransition(fromStateId: string, event: string): TransitionDefinition | null {
		const state = this.states.get(fromStateId);
		if (!state) return null;
		return state.on.find((transition) => transition.event === event) ?? null;
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
