/**
 * @jest-environment node
 */
import { fetchDecks, fetchDeck } from '../api';

test('fetchDecks маппит ответ', async () => {
	global.fetch = async () => ({ ok: true, json: async () => [{ path: 'История', cardCount: 2, stale: false }] }) as any;
	expect(await fetchDecks('http://192.168.1.5:27124')).toEqual([{ path: 'История', cardCount: 2, stale: false }]);
});

test('fetchDeck кодирует кириллический путь', async () => {
	let url = '';
	global.fetch = async (u: any) => { url = u; return { ok: true, json: async () => ({ cards: [] }) } as any; };
	await fetchDeck('http://x', 'История');
	expect(url).toBe('http://x/decks/%D0%98%D1%81%D1%82%D0%BE%D1%80%D0%B8%D1%8F');
});

test('сетевая ошибка → "Obsidian недоступен"', async () => {
	global.fetch = async () => { throw new TypeError('network'); };
	await expect(fetchDecks('http://x')).rejects.toThrow('Obsidian недоступен');
});
