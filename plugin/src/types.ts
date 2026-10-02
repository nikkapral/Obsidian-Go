export interface Card {
	id: string;
	statement: string;
	isTrue: boolean;
	note: string;
	notePath: string;
}

export interface Deck {
	path: string;
	generatedAt: number;
	stale: boolean;
	/** notePath → mtime */
	notes: Record<string, number>;
	cards: Card[];
}
