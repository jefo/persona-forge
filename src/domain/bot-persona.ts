import { z } from "zod";
import { Fsm, FsmDefinitionSchema } from "./fsm";
import { Form, FormDefinitionSchema } from "./form";
import { ViewMap, ViewMapDefinitionSchema } from "./view-map";
import type { AssignExpression } from "./fsm";

export const BotPersonaDefinitionSchema = z.object({
	name: z.string().min(1),
	fsm: FsmDefinitionSchema,
	viewMap: ViewMapDefinitionSchema,
	form: FormDefinitionSchema,
});

export type BotPersonaDefinition = z.infer<typeof BotPersonaDefinitionSchema>;

const TEMPLATE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function templateFields(text: string): string[] {
	return [...text.matchAll(TEMPLATE)].map((match) => match[1] as string);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function actualType(value: unknown): string {
	if (Array.isArray(value)) return "array";
	if (isRecord(value)) return "object";
	if (typeof value === "number") return "number";
	if (typeof value === "boolean") return "boolean";
	return "string";
}

function checkAssign(
	stateId: string,
	event: string,
	key: string,
	expression: AssignExpression,
	fieldType: string,
	fieldNames: Set<string>,
): void {
	const fail = (message: string) => {
		throw new Error(
			`BotPersona invariant failed: transition '${event}' from '${stateId}' ${message}.`,
		);
	};

	if (typeof expression === "string") {
		if (expression.startsWith("payload.")) return;
		if (expression.startsWith("form.")) {
			const source = expression.slice("form.".length).split(".")[0] as string;
			if (!fieldNames.has(source)) {
				fail(`reads unknown form field '${source}'`);
			}
			return;
		}
	}

	if (isRecord(expression) && expression.op === "add") {
		if (fieldType !== "array") {
			fail(`adds to non-array field '${key}'`);
		}
		const value = expression.value;
		if (typeof value === "string" && (value.startsWith("payload.") || value.startsWith("form."))) {
			return;
		}
		if (typeof value !== "string") {
			fail(`adds a non-string value to '${key}'`);
		}
		return;
	}

	const type = actualType(expression);
	if (fieldType !== type) {
		fail(`assigns ${type} to ${fieldType} field '${key}'`);
	}
}

/**
 * The aggregate that protects one bot definition. It is the only place
 * that checks the three parts agree with each other:
 *
 *   FSM states  <->  view nodes  <->  form fields
 */
export class BotPersona {
	readonly id: string;
	readonly definition: BotPersonaDefinition;
	readonly fsm: Fsm;
	readonly viewMap: ViewMap;

	constructor(id: string, definition: BotPersonaDefinition) {
		if (!id) throw new Error("BotPersona id is required.");

		const parsed = BotPersonaDefinitionSchema.parse(definition);
		const fsm = new Fsm(parsed.fsm);
		const viewMap = new ViewMap(parsed.viewMap);
		const form = new Form(parsed.form);

		const fieldNames = new Set(Object.keys(form.fields));
		const nodeIds = viewMap.nodeIds;

		for (const stateId of fsm.statesById.keys()) {
			if (!nodeIds.has(stateId)) {
				throw new Error(
					`BotPersona invariant failed: state '${stateId}' has no view node.`,
				);
			}
		}

		for (const nodeId of nodeIds) {
			const state = fsm.getState(nodeId);
			if (!state) {
				throw new Error(
					`BotPersona invariant failed: view node '${nodeId}' has no FSM state.`,
				);
			}

			const node = viewMap.getNode(nodeId);
			if (!node) continue;

			for (const path of templateFields(node.props.text)) {
				const field = path.split(".")[0] as string;
				if (!fieldNames.has(field)) {
					throw new Error(
						`BotPersona invariant failed: template '{{${path}}}' in state '${nodeId}' is not a form field.`,
					);
				}
			}

			for (const button of node.props.buttons ?? []) {
				if (fsm.findTransitions(nodeId, button.event).length === 0) {
					throw new Error(
						`BotPersona invariant failed: button '${button.label}' in state '${nodeId}' sends unknown event '${button.event}'.`,
					);
				}
			}
		}

		for (const state of fsm.statesById.values()) {
			for (const transition of state.on) {
				if (transition.cond) {
					if (!fieldNames.has(transition.cond.field.split(".")[0] as string)) {
						throw new Error(
							`BotPersona invariant failed: transition '${transition.event}' from '${state.id}' checks unknown form field '${transition.cond.field}'.`,
						);
					}
				}

				for (const [key, expression] of Object.entries(transition.assign ?? {})) {
					const field = form.fields[key];
					if (!field) {
						throw new Error(
							`BotPersona invariant failed: transition '${transition.event}' from '${state.id}' assigns unknown form field '${key}'.`,
						);
					}

					checkAssign(
						state.id,
						transition.event,
						key,
						expression,
						field.type,
						fieldNames,
					);
				}
			}
		}

		this.id = id;
		this.definition = parsed;
		this.fsm = fsm;
		this.viewMap = viewMap;
	}

	static create(
		definition: BotPersonaDefinition,
		id: string = crypto.randomUUID(),
	): BotPersona {
		return new BotPersona(id, definition);
	}
}
