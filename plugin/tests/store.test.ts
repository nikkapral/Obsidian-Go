import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { DeckStore } from "../src/store";
import type { Deck } from "../src/types";

const DECK: Deck = {
	path: "История",
	generatedAt: 1700000000000,
	stale: false,
	notes: { "История/Даты.md": 1, "История/Люди.md": 1 },
	cards: [
		{
			id: "c1",
			statement: "1812 — Отечественная война.",
			isTrue: true,
			note: "Даты",
			notePath: "История/Даты.md",
		},
		{
			id: "c2",
			statement: "1812 — Куликовская битва.",
			isTrue: false,
			note: "Даты",
			notePath: "История/Даты.md",
		},
	],
};

let tmp: string;

beforeEach(() => {
	tmp = mkdtempSync(join(tmpdir(), "deck-store-"));
});

afterEach(() => {
	rmSync(tmp, { recursive: true, force: true });
});

test("старт без decks.json → пусто", async () => {
	const s = new DeckStore(tmp);
	await s.load();
	expect(s.getDecks()).toEqual([]);
});

test("saveDeck + getDeck round-trip и атомарность (нет .tmp после записи)", async () => {
	const s = new DeckStore(tmp);
	await s.load();
	await s.saveDeck(DECK);
	const s2 = new DeckStore(tmp);
	await s2.load();
	expect(s2.getDeck("История")!.cards).toEqual(DECK.cards);
	expect(existsSync(join(tmp, ".obsidian-check/decks.json.tmp"))).toBe(false);
});

test("markStale: изменённый mtime → stale", async () => {
	const s = new DeckStore(tmp);
	await s.load();
	await s.saveDeck({ ...DECK, notes: { "a.md": 1 } });
	await s.markStale({ История: { "a.md": 2 } });
	expect(s.getDeck("История")!.stale).toBe(true);
});

test("markStale: без изменений → не stale", async () => {
	const s = new DeckStore(tmp);
	await s.load();
	await s.saveDeck({ ...DECK, notes: { "a.md": 1 } });
	await s.markStale({ История: { "a.md": 1 } });
	expect(s.getDeck("История")!.stale).toBe(false);
});
