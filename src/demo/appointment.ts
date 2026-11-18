import { createEngine } from "../application/engine";
import { appointmentBot } from "../examples/appointment-bot";
import type { RenderedMessage } from "../rendering/render";

const engine = createEngine();
const persona = await engine.definePersona(appointmentBot);
const chatId = "demo-appointment";

function printBot(message: RenderedMessage): void {
	console.log("\nБот:");
	for (const line of message.text.split("\n")) {
		console.log(`  ${line}`);
	}
	if (message.buttons.length > 0) {
		console.log(`  ${message.buttons.map((button) => `[ ${button.label} ]`).join(" ")}`);
	}
}

const started = await engine.start({ personaId: persona.id, chatId });
printBot(started.message);

const steps: Array<{
	label: string;
	event: string;
	payload?: Record<string, unknown>;
}> = [
	{ label: "Записаться", event: "BOOK" },
	{ label: "Консультация", event: "SERVICE_CONSULT" },
	{ label: "Иван", event: "NAME", payload: { name: "Иван" } },
	{ label: "+7 999 123-45-67", event: "CONTACT", payload: { contact: "+7 999 123-45-67" } },
	{ label: "Завтра, 14:00", event: "TIME_1" },
	{ label: "Подтвердить", event: "CONFIRM" },
];

let finished = false;
for (const step of steps) {
	console.log(`\nВы: ${step.label}`);
	const result = await engine.handle({
		chatId,
		event: step.event,
		payload: step.payload,
	});

	if (!result.ok) {
		console.error(`\nОшибка: ${result.reason}`);
		process.exit(1);
	}

	printBot(result.message);
	finished = result.finished;
}

const form = started.conversation.form.toJSON();

console.log(`\nstatus: ${finished ? "finished" : "active"}`);
console.log(`form: ${JSON.stringify(form)}`);

if (!finished) process.exit(1);
