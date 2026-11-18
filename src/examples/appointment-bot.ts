import type { BotPersonaDefinition } from "../domain/bot-persona";

/**
 * Appointment booking: welcome -> service -> name -> contact -> time ->
 * confirm -> booked. Two final states, no code changes needed to add a
 * third service.
 */
export const appointmentBot = {
	name: "Appointment Bot",
	fsm: {
		initialState: "welcome",
		states: [
			{
				id: "welcome",
				on: [
					{ event: "BOOK", target: "service" },
					{ event: "CANCEL", target: "cancelled" },
				],
			},
			{
				id: "service",
				on: [
					{
						event: "SERVICE_CONSULT",
						target: "name",
						assign: { service: "Консультация" },
					},
					{
						event: "SERVICE_DIAG",
						target: "name",
						assign: { service: "Диагностика" },
					},
					{
						event: "SERVICE_TREAT",
						target: "name",
						assign: { service: "Лечение" },
					},
					{ event: "BACK", target: "welcome" },
				],
			},
			{
				id: "name",
				on: [
					{
						event: "NAME",
						target: "contact",
						assign: { name: "payload.name" },
					},
				],
			},
			{
				id: "contact",
				on: [
					{
						event: "CONTACT",
						target: "datetime",
						assign: { contact: "payload.contact" },
					},
				],
			},
			{
				id: "datetime",
				on: [
					{
						event: "TIME_1",
						target: "confirm",
						assign: { datetime: "Завтра, 14:00" },
					},
					{
						event: "TIME_2",
						target: "confirm",
						assign: { datetime: "Послезавтра, 10:00" },
					},
				],
			},
			{
				id: "confirm",
				on: [
					{ event: "CONFIRM", target: "booked" },
					{ event: "CHANGE_TIME", target: "datetime" },
					{ event: "CANCEL", target: "cancelled" },
				],
			},
			{ id: "booked", on: [] },
			{ id: "cancelled", on: [] },
		],
	},
	viewMap: {
		nodes: [
			{
				id: "welcome",
				component: "message",
				props: {
					text: "Запись на приём\n\nВыберите услугу или отмените запись.",
					buttons: [
						{ label: "Записаться", event: "BOOK" },
						{ label: "Не сейчас", event: "CANCEL" },
					],
				},
			},
			{
				id: "service",
				component: "message",
				props: {
					text: "Шаг 1 из 4. Выберите услугу:",
					buttons: [
						{ label: "Консультация", event: "SERVICE_CONSULT" },
						{ label: "Диагностика", event: "SERVICE_DIAG" },
						{ label: "Лечение", event: "SERVICE_TREAT" },
						{ label: "Назад", event: "BACK" },
					],
				},
			},
			{
				id: "name",
				component: "message",
				props: {
					text: "Шаг 2 из 4. Как вас зовут?\n\nНапишите имя одним сообщением.",
				},
			},
			{
				id: "contact",
				component: "message",
				props: {
					text: "Шаг 3 из 4. Телефон для связи?\n\nНапишите номер одним сообщением.",
				},
			},
			{
				id: "datetime",
				component: "message",
				props: {
					text: "Шаг 4 из 4. Выберите время:",
					buttons: [
						{ label: "Завтра, 14:00", event: "TIME_1" },
						{ label: "Послезавтра, 10:00", event: "TIME_2" },
					],
				},
			},
			{
				id: "confirm",
				component: "summary",
				props: {
					text: "Проверьте запись.\n\nУслуга: {{service}}\nИмя: {{name}}\nТелефон: {{contact}}\nВремя: {{datetime}}",
					buttons: [
						{ label: "Подтвердить", event: "CONFIRM" },
						{ label: "Изменить время", event: "CHANGE_TIME" },
						{ label: "Отменить", event: "CANCEL" },
					],
				},
			},
			{
				id: "booked",
				component: "receipt",
				props: {
					text: "Готово. Вы записаны.\n\n{{service}}\n{{datetime}}\n\nПозвоним на {{contact}}.",
				},
			},
			{
				id: "cancelled",
				component: "receipt",
				props: {
					text: "Запись отменена.\n\nНачать заново — /start.",
				},
			},
		],
	},
	form: {
		fields: {
			service: { type: "string", required: true },
			name: { type: "string", required: true },
			contact: { type: "string", required: true },
			datetime: { type: "string", required: true },
		},
	},
} satisfies BotPersonaDefinition;
