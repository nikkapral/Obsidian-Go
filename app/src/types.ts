export interface Card {
	id: string;
	statement: string;
	isTrue: boolean;
	note: string;
	notePath: string;
}

export interface DeckSummary {
	path: string;
	cardCount: number;
	stale: boolean;
}
