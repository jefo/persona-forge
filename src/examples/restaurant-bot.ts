import type { BotPersonaDefinition } from "../domain/bot-persona";

/**
 * A small menu bot. It shows that a number field can be assigned from a
 * literal and rendered back into the text.
 */
export const restaurantBot = {
	name: "Restaurant Bot",
	fsm: {
		initialState: "welcome",
		states: [
			{
				id: "welcome",
				on: [
					{ event: "VIEW_MENU", target: "menu" },
					{ event: "CANCEL", target: "cancelled" },
				],
			},
			{
				id: "menu",
				on: [
					{
						event: "PIZZA",
						target: "dish",
						assign: { dish: "Маргарита" },
					},
					{
						event: "PASTA",
						target: "dish",
						assign: { dish: "Карбонара" },
					},
					{ event: "BACK", target: "welcome" },
				],
			},
			{
				id: "dish",
				on: [
					{ event: "ADD", target: "cart", assign: { quantity: 1 } },
					{ event: "BACK", target: "menu" },
				],
			},
			{
				id: "cart",
				on: [
					{ event: "CHECKOUT", target: "confirmed" },
					{ event: "BACK", target: "menu" },
				],
			},
			{ id: "confirmed", on: [] },
			{ id: "cancelled", on: [] },
		],
	},
	viewMap: {
		nodes: [
			{
				id: "welcome",
				component: "message",
				props: {
					text: "Кухня\n\nПосмотрите меню или закройте диалог.",
					buttons: [
						{ label: "Меню", event: "VIEW_MENU" },
						{ label: "Не сейчас", event: "CANCEL" },
					],
				},
			},
			{
				id: "menu",
				component: "message",
				props: {
					text: "Что приготовить?",
					buttons: [
						{ label: "Маргарита", event: "PIZZA" },
						{ label: "Карбонара", event: "PASTA" },
						{ label: "Назад", event: "BACK" },
					],
				},
			},
			{
				id: "dish",
				component: "message",
				props: {
					text: "{{dish}}\n\nДобавить в корзину?",
					buttons: [
						{ label: "Добавить", event: "ADD" },
						{ label: "Назад", event: "BACK" },
					],
				},
			},
			{
				id: "cart",
				component: "summary",
				props: {
					text: "В корзине:\n\n{{dish}} × {{quantity}}",
					buttons: [
						{ label: "Оформить", event: "CHECKOUT" },
						{ label: "В меню", event: "BACK" },
					],
				},
			},
			{
				id: "confirmed",
				component: "receipt",
				props: {
					text: "Заказ принят.\n\n{{dish}} × {{quantity}}\n\nОплата на кассе.",
				},
			},
			{
				id: "cancelled",
				component: "receipt",
				props: {
					text: "Диалог закрыт. Начать заново — /start.",
				},
			},
		],
	},
	form: {
		fields: {
			dish: { type: "string", required: true },
			quantity: { type: "number", required: true },
		},
	},
} satisfies BotPersonaDefinition;
