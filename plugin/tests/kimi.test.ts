import { expect, test } from "vitest";
import { parseCards } from "../src/kimi";

test("снимает markdown-обёртку и парсит карточки", () => {
	const raw = '```json\n[{"statement":"Земля плоская","isTrue":false}]\n```';
	const cards = parseCards(raw, { title: "География", path: "География.md" });
	expect(cards).toEqual([
		{
			id: "География.md#0",
			statement: "Земля плоская",
			isTrue: false,
			note: "География",
			notePath: "География.md",
		},
	]);
});

test("фильтрует элементы без isTrue boolean", () => {
	const cards = parseCards(
		'[{"statement":"a","isTrue":"да"},{"statement":"b","isTrue":true}]',
		{ title: "T", path: "T.md" },
	);
	expect(cards).toHaveLength(1);
});

test("бросает на невалидном JSON", () => {
	expect(() => parseCards("не json", { title: "T", path: "T.md" })).toThrow();
});
