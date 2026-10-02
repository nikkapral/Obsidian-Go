import { expect, test } from "vitest";
import { collectCards, type NoteInput } from "../src/generator";
import type { Card } from "../src/types";

const NOTES: NoteInput[] = [
	{ title: "Даты", path: "История/Даты.md", content: "1812" },
	{ title: "Люди", path: "История/Люди.md", content: "Наполеон" },
];

const CARD: Card = {
	id: "c1",
	statement: "1812 — война",
	isTrue: true,
	note: "Даты",
	notePath: "История/Даты.md",
};

test("collectCards: все успешны → карточки и пустой failed", async () => {
	const gen = async () => [CARD];
	const { cards, failed } = await collectCards(NOTES, gen);
	expect(cards).toHaveLength(2);
	expect(failed).toEqual([]);
});

test("collectCards: часть упала → failed с путями, карточки остальных сохранены", async () => {
	const gen = async (note: NoteInput) => {
		if (note.path === "История/Люди.md") throw new Error("Kimi down");
		return [CARD];
	};
	const { cards, failed } = await collectCards(NOTES, gen);
	expect(cards).toHaveLength(1);
	expect(failed).toEqual(["История/Люди.md"]);
});

test("collectCards: все упали → пустые карточки, все пути в failed", async () => {
	const gen = async () => {
		throw new Error("Kimi down");
	};
	const { cards, failed } = await collectCards(NOTES, gen);
	expect(cards).toEqual([]);
	expect(failed).toEqual(["История/Даты.md", "История/Люди.md"]);
});
