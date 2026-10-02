import { Card, DeckSummary } from './types';

async function getJson(url: string): Promise<any> {
	let res: Response;
	try {
		res = await fetch(url);
	} catch {
		throw new Error('Obsidian недоступен');
	}
	if (!res.ok) {
		throw new Error(`Ошибка сервера: ${res.status}`);
	}
	return res.json();
}

export async function fetchDecks(baseUrl: string): Promise<DeckSummary[]> {
	return getJson(`${baseUrl}/decks`);
}

export async function fetchDeck(baseUrl: string, path: string): Promise<Card[]> {
	const deck = await getJson(`${baseUrl}/decks/${encodeURIComponent(path)}`);
	return deck.cards;
}
