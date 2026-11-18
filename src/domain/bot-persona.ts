import { z } from "zod";
import { Fsm, FsmDefinitionSchema } from "./fsm";
import { Form, FormDefinitionSchema } from "./form";
import { ViewMap, ViewMapDefinitionSchema } from "./view-map";

export const BotPersonaDefinitionSchema = z.object({
	name: z.string().min(1),
	fsm: FsmDefinitionSchema,
	viewMap: ViewMapDefinitionSchema,
	form: FormDefinitionSchema,
});

export type BotPersonaDefinition = z.infer<typeof BotPersonaDefinitionSchema>;

const TEMPLATE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function templateFields(text: string): string[] {
	return [...text.matchAll(TEMPLATE)].map((match) => match[1] as string);
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

			for (const field of templateFields(node.props.text)) {
				if (!fieldNames.has(field)) {
					throw new Error(
						`BotPersona invariant failed: template '{{${field}}}' in state '${nodeId}' is not a form field.`,
					);
				}
			}

			for (const button of node.props.buttons ?? []) {
				if (!fsm.findTransition(nodeId, button.event)) {
					throw new Error(
						`BotPersona invariant failed: button '${button.label}' in state '${nodeId}' sends unknown event '${button.event}'.`,
					);
				}
			}
		}

		for (const state of fsm.statesById.values()) {
			for (const transition of state.on) {
				for (const [key, expression] of Object.entries(transition.assign ?? {})) {
					const field = form.fields[key];
					if (!field) {
						throw new Error(
							`BotPersona invariant failed: transition '${transition.event}' assigns unknown form field '${key}'.`,
						);
					}

					if (typeof expression === "string" && expression.startsWith("form.")) {
						const source = expression.slice("form.".length);
						if (!fieldNames.has(source)) {
							throw new Error(
								`BotPersona invariant failed: transition '${transition.event}' reads unknown form field '${source}'.`,
							);
						}
					}

					if (
						typeof expression !== "string" ||
						(!expression.startsWith("payload.") && !expression.startsWith("form."))
					) {
						const expected = field.type;
						const actual =
							typeof expression === "number"
								? "number"
								: typeof expression === "boolean"
									? "boolean"
									: "string";
						if (expected !== actual) {
							throw new Error(
								`BotPersona invariant failed: transition '${transition.event}' assigns ${actual} to ${expected} field '${key}'.`,
							);
						}
					}
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
