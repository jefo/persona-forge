import { z } from "zod";

export const ButtonSchema = z.object({
	label: z.string().min(1),
	event: z.string().min(1),
});

export const ViewNodeSchema = z.object({
	id: z.string().min(1),
	component: z.string().min(1).optional(),
	props: z.object({
		text: z.string().min(1),
		buttons: z.array(ButtonSchema).optional(),
	}),
});

export const ViewMapDefinitionSchema = z.object({
	nodes: z.array(ViewNodeSchema).min(1),
});

export type ButtonDefinition = z.infer<typeof ButtonSchema>;
export type ViewNode = z.infer<typeof ViewNodeSchema>;
export type ViewMapDefinition = z.infer<typeof ViewMapDefinitionSchema>;

/**
 * Maps every FSM state id to a screen. The map is intentionally dumb:
 * it does not know the FSM, it only stores nodes by id.
 */
export class ViewMap {
	private readonly nodes: Map<string, ViewNode>;

	constructor(definition: ViewMapDefinition) {
		const parsed = ViewMapDefinitionSchema.parse(definition);

		this.nodes = new Map(parsed.nodes.map((node) => [node.id, node]));

		if (this.nodes.size !== parsed.nodes.length) {
			throw new Error("ViewMap invariant failed: node ids must be unique.");
		}
	}

	getNode(stateId: string): ViewNode | null {
		return this.nodes.get(stateId) ?? null;
	}

	get nodeIds(): ReadonlySet<string> {
		return new Set(this.nodes.keys());
	}
}
