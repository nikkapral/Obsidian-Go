import { chatCompletion, parseCards } from "./kimi";
import type { PluginSettings } from "./settings";
import type { Card } from "./types";

const RETRY_PROMPT = "Верни только валидный JSON без пояснений.";

export function buildPrompt(note: { title: string; content: string }): string {
	return [
		`Составь 10–20 утверждений по заметке «${note.title}» на её языке.`,
		"Половина утверждений должны быть верными, половина — правдоподобными, но неверными.",
		"Верни JSON-массив [{statement, isTrue}] без пояснений.",
		"",
		note.content,
	].join("\n");
}

export async function generateForNote(
	settings: PluginSettings,
	note: { title: string; path: string; content: string },
	chat: typeof chatCompletion = chatCompletion,
): Promise<Card[]> {
	if (!note.content.trim()) {
		return [];
	}
	const prompt = buildPrompt(note);
	for (const current of [prompt, `${prompt}\n\n${RETRY_PROMPT}`]) {
		try {
			const raw = await chat(settings, current);
			return parseCards(raw, note);
		} catch (error) {
			if (current !== prompt) {
				console.warn(`Не удалось сгенерировать карточки для ${note.path}:`, error);
				return [];
			}
		}
	}
	return [];
}
