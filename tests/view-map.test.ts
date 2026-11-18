import { describe, expect, it } from "bun:test";
import { ViewMap } from "../src/domain/view-map";

const definition = {
	nodes: [
		{ id: "welcome", component: "message", props: { text: "Hello" } },
		{
			id: "menu",
			component: "menu",
			props: {
				text: "Pick one",
				buttons: [{ label: "A", event: "A" }],
			},
		},
	],
};

describe("ViewMap", () => {
	it("returns a node by state id", () => {
		const map = new ViewMap(definition);
		expect(map.getNode("welcome")?.props.text).toBe("Hello");
		expect(map.getNode("menu")?.props.buttons).toHaveLength(1);
	});

	it("returns null for an unknown state", () => {
		const map = new ViewMap(definition);
		expect(map.getNode("missing")).toBeNull();
	});

	it("rejects duplicate node ids", () => {
		expect(
			() =>
				new ViewMap({
					nodes: [
						{ id: "a", props: { text: "A" } },
						{ id: "a", props: { text: "B" } },
					],
				}),
		).toThrow("node ids must be unique");
	});

	it("requires at least one node", () => {
		expect(() => new ViewMap({ nodes: [] })).toThrow();
	});
});
