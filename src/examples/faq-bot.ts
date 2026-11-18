import type { BotPersonaDefinition } from "../domain/bot-persona";

/**
 * A branching FAQ. Any answer can return to the menu, the menu can end
 * the conversation. The form is empty: this bot only navigates.
 */
export const faqBot = {
	name: "FAQ Bot",
	fsm: {
		initialState: "welcome",
		states: [
			{
				id: "welcome",
				on: [
					{ event: "FAQ_1", target: "answer_1" },
					{ event: "FAQ_2", target: "answer_2" },
					{ event: "FAQ_3", target: "answer_3" },
					{ event: "END", target: "end" },
				],
			},
			{
				id: "answer_1",
				on: [
					{ event: "BACK", target: "welcome" },
					{ event: "END", target: "end" },
				],
			},
			{
				id: "answer_2",
				on: [
					{ event: "BACK", target: "welcome" },
					{ event: "END", target: "end" },
				],
			},
			{
				id: "answer_3",
				on: [
					{ event: "BACK", target: "welcome" },
					{ event: "END", target: "end" },
				],
			},
			{ id: "end", on: [] },
		],
	},
	viewMap: {
		nodes: [
			{
				id: "welcome",
				component: "message",
				props: {
					text: "Частые вопросы\n\nВыберите тему:",
					buttons: [
						{ label: "Как работает бот", event: "FAQ_1" },
						{ label: "Где документация", event: "FAQ_2" },
						{ label: "Как получить помощь", event: "FAQ_3" },
						{ label: "Завершить", event: "END" },
					],
				},
			},
			{
				id: "answer_1",
				component: "message",
				props: {
					text: "Бот ведёт диалог по конечному автомату. Каждое состояние — это экран, каждый переход — событие. Сценарий лежит в данных, а не в коде.",
					buttons: [
						{ label: "Назад", event: "BACK" },
						{ label: "Завершить", event: "END" },
					],
				},
			},
			{
				id: "answer_2",
				component: "message",
				props: {
					text: "Документация — в README и в docs/ репозитория. Там описан формат определения бота и инварианты.",
					buttons: [
						{ label: "Назад", event: "BACK" },
						{ label: "Завершить", event: "END" },
					],
				},
			},
			{
				id: "answer_3",
				component: "message",
				props: {
					text: "Создайте issue в репозитории. Опишите сценарий, состояние и событие — этого достаточно, чтобы воспроизвести проблему.",
					buttons: [
						{ label: "Назад", event: "BACK" },
						{ label: "Завершить", event: "END" },
					],
				},
			},
			{
				id: "end",
				component: "message",
				props: {
					text: "Спасибо. Диалог завершён.",
				},
			},
		],
	},
	form: {
		fields: {},
	},
} satisfies BotPersonaDefinition;
