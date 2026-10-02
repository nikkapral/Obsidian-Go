import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Deck } from "./types";

const STORE_DIR = ".obsidian-check";
const STORE_FILE = "decks.json";

export class DeckStore {
	private decks = new Map<string, Deck>();
	private readonly file: string;

	constructor(private readonly vaultDir: string) {
		this.file = join(vaultDir, STORE_DIR, STORE_FILE);
	}

	async load(): Promise<void> {
		this.decks.clear();
		let raw: string;
		try {
			raw = await readFile(this.file, "utf8");
		} catch {
			return; // нет файла → пустое состояние
		}
		const data = JSON.parse(raw) as { decks?: Deck[] };
		for (const deck of data.decks ?? []) this.decks.set(deck.path, deck);
	}

	getDecks(): Deck[] {
		return [...this.decks.values()];
	}

	getDeck(path: string): Deck | undefined {
		return this.decks.get(path);
	}

	async saveDeck(deck: Deck): Promise<void> {
		this.decks.set(deck.path, deck);
		await mkdir(join(this.vaultDir, STORE_DIR), { recursive: true });
		const tmp = `${this.file}.tmp`;
		await writeFile(tmp, JSON.stringify({ decks: this.getDecks() }), "utf8");
		await rename(tmp, this.file);
	}

	async markStale(currentMtimes: Record<string, Record<string, number>>): Promise<void> {
		for (const [path, mtimes] of Object.entries(currentMtimes)) {
			const deck = this.decks.get(path);
			if (!deck) continue; // колоды нет в снапшоте — не трогаем
			const current = Object.keys(mtimes);
			const known = deck.notes;
			const sameSet =
				current.length === Object.keys(known).length && current.every((k) => k in known);
			const changed = !sameSet || current.some((k) => mtimes[k] !== known[k]);
			if (changed) deck.stale = true;
		}
	}
}
