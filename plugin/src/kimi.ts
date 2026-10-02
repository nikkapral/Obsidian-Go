import type { PluginSettings } from "./settings";
import type { Card } from "./types";

export function parseCards(
	raw: string,
	note: { title: string; path: string },
): Card[] {
	const stripped = raw
		.trim()
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/\s*```$/, "");
	const parsed: unknown = JSON.parse(stripped);
	if (!Array.isArray(parsed)) {
		throw new Error("Ответ Kimi не является массивом");
	}
	return parsed
		.filter(
			(item): item is { statement: string; isTrue: boolean } =>
				typeof item === "object" &&
				item !== null &&
				typeof (item as { statement?: unknown }).statement === "string" &&
				typeof (item as { isTrue?: unknown }).isTrue === "boolean",
		)
		.map((item, index) => ({
			id: `${note.path}#${index}`,
			statement: item.statement,
			isTrue: item.isTrue,
			note: note.title,
			notePath: note.path,
		}));
}

interface ChatCompletionResponse {
	choices: { message: { content: string } }[];
}

export async function chatCompletion(
	settings: PluginSettings,
	prompt: string,
): Promise<string> {
	const response = await fetch(`${settings.baseUrl}/chat/completions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${settings.apiKey}`,
		},
		body: JSON.stringify({
			model: settings.model,
			messages: [{ role: "user", content: prompt }],
			temperature: 0.7,
		}),
	});
	if (response.status !== 200) {
		throw new Error(`Kimi API вернул HTTP ${response.status}`);
	}
	const data = (await response.json()) as ChatCompletionResponse;
	return data.choices[0].message.content;
}
