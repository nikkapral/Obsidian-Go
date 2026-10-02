import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { startServer } from "../src/server";
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
let store: DeckStore;
let server: Server;
let base: string;
let calledWith: string[];

beforeEach(async () => {
	tmp = mkdtempSync(join(tmpdir(), "deck-server-"));
	store = new DeckStore(tmp);
	await store.saveDeck(DECK);
	calledWith = [];
	server = startServer({
		port: 0,
		store,
		regenerate: async (path) => {
			calledWith.push(path);
		},
	});
	await new Promise<void>((resolve) => server.once("listening", resolve));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
	await new Promise<void>((resolve) => server.close(() => resolve()));
	rmSync(tmp, { recursive: true, force: true });
});

test("GET /decks → список с cardCount и stale", async () => {
	const res = await fetch(`${base}/decks`);
	expect(res.status).toBe(200);
	expect(res.headers.get("content-type")).toContain("application/json");
	expect(await res.json()).toEqual([{ path: "История", cardCount: 2, stale: false }]);
});

test("GET /decks/:path с URL-encoded кириллицей", async () => {
	const res = await fetch(`${base}/decks/${encodeURIComponent("История")}`);
	expect(res.status).toBe(200);
	expect((await res.json()).cards).toHaveLength(2);
});

test("GET /decks/:path с вложенным путём vault", async () => {
	await store.saveDeck({ ...DECK, path: "История/Даты" });
	const res = await fetch(`${base}/decks/${encodeURIComponent("История/Даты")}`);
	expect(res.status).toBe(200);
	expect((await res.json()).path).toBe("История/Даты");
});

test("GET /decks/нет-такой → 404", async () => {
	const res = await fetch(`${base}/decks/${encodeURIComponent("Нет такой")}`);
	expect(res.status).toBe(404);
	expect(await res.json()).toEqual({ error: expect.any(String) });
});

test("POST regenerate вызывает колбэк с декодированным путём", async () => {
	const res = await fetch(`${base}/decks/${encodeURIComponent("История")}/regenerate`, {
		method: "POST",
	});
	expect(res.status).toBe(200);
	expect(await res.json()).toEqual({ ok: true });
	expect(calledWith).toEqual(["История"]);
});

test("POST regenerate для несуществующей колоды → 404, колбэк не вызывается", async () => {
	const res = await fetch(`${base}/decks/${encodeURIComponent("Нет такой")}/regenerate`, {
		method: "POST",
	});
	expect(res.status).toBe(404);
	expect(calledWith).toEqual([]);
});

test("неизвестный путь → 404", async () => {
	const res = await fetch(`${base}/unknown`);
	expect(res.status).toBe(404);
});

test("занятый порт → ошибка в обработчике, без uncaught exception", async () => {
	const port = (server.address() as AddressInfo).port;
	const spy = vi.spyOn(console, "error").mockImplementation(() => {});
	let second: Server | undefined;
	try {
		second = startServer({ port, store, regenerate: async () => {} });
		const err = await new Promise<NodeJS.ErrnoException>((resolve, reject) => {
			second!.once("error", resolve);
			setTimeout(() => reject(new Error("нет события error за 2с")), 2000);
		});
		expect(err.code).toBe("EADDRINUSE");
		expect(spy).toHaveBeenCalledWith(expect.stringContaining("EADDRINUSE"));
	} finally {
		spy.mockRestore();
		second?.close();
	}
});
