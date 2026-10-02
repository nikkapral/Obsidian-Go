import { expect, test } from "vitest";
import { generateForNote } from "../src/generator";
import { DEFAULT_SETTINGS, type PluginSettings } from "../src/settings";

const SETTINGS: PluginSettings = { ...DEFAULT_SETTINGS };

const note = {
	title: "История",
	path: "История/Даты.md",
	content: "1812 — Отечественная война.",
};

test("возвращает карточки из ответа API", async () => {
	const chat = async () => '[{"statement":"1812 — война","isTrue":true}]';
	expect(await generateForNote(SETTINGS, note, chat)).toHaveLength(1);
});

test("ретрай при невалидном JSON, затем успех", async () => {
	const prompts: string[] = [];
	const chat = async (_settings: unknown, prompt: string) => {
		prompts.push(prompt);
		return prompts.length === 1 ? "мусор" : "[]";
	};
	await generateForNote(SETTINGS, note, chat as never);
	expect(prompts).toHaveLength(2);
	expect(prompts[1]).toContain(note.content);
	expect(prompts[1]).toContain("Верни только валидный JSON без пояснений");
});

test("ретрай → валидные карточки возвращены", async () => {
	let calls = 0;
	const chat = async () =>
		++calls === 1 ? "мусор" : '[{"statement":"1812 — война","isTrue":true}]';
	const cards = await generateForNote(SETTINGS, note, chat);
	expect(cards).toHaveLength(1);
	expect(cards[0].statement).toBe("1812 — война");
});

test("двойной провал → пустой массив", async () => {
	const chat = async () => {
		throw new Error("bad");
	};
	expect(await generateForNote(SETTINGS, note, chat)).toEqual([]);
});

test("пустая заметка → без вызова API", async () => {
	let called = false;
	const chat = async () => {
		called = true;
		return "[]";
	};
	expect(await generateForNote(SETTINGS, { ...note, content: "" }, chat)).toEqual([]);
	expect(called).toBe(false);
});
