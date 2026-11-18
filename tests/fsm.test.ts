import { describe, expect, it } from "bun:test";
import { Fsm } from "../src/domain/fsm";

const valid = {
	initialState: "welcome",
	states: [
		{ id: "welcome", on: [{ event: "GO", target: "done" }] },
		{ id: "done", on: [] },
	],
};

describe("Fsm", () => {
	it("builds a machine with a valid initial state", () => {
		const fsm = new Fsm(valid);
		expect(fsm.initialState).toBe("welcome");
		expect(fsm.statesById.size).toBe(2);
	});

	it("rejects a missing initial state", () => {
		expect(
			() =>
				new Fsm({
					initialState: "missing",
					states: [{ id: "welcome", on: [] }],
				}),
		).toThrow("initialState 'missing' not found");
	});

	it("rejects a transition to a missing state", () => {
		expect(
			() =>
				new Fsm({
					initialState: "welcome",
					states: [{ id: "welcome", on: [{ event: "GO", target: "nope" }] }],
				}),
		).toThrow("transition target 'nope'");
	});

	it("rejects duplicate state ids", () => {
		expect(
			() =>
				new Fsm({
					initialState: "a",
					states: [
						{ id: "a", on: [] },
						{ id: "a", on: [] },
					],
				}),
		).toThrow("state ids must be unique");
	});

	it("finds a transition by event", () => {
		const fsm = new Fsm(valid);
		expect(fsm.findTransition("welcome", "GO")).toEqual({
			event: "GO",
			target: "done",
		});
	});

	it("returns null for an unknown event or state", () => {
		const fsm = new Fsm(valid);
		expect(fsm.findTransition("welcome", "NOPE")).toBeNull();
		expect(fsm.findTransition("missing", "GO")).toBeNull();
	});

	it("detects final states", () => {
		const fsm = new Fsm(valid);
		expect(fsm.isFinal("done")).toBe(true);
		expect(fsm.isFinal("welcome")).toBe(false);
	});
});
