import { Card } from './types';

export type Swipe = 'right' | 'left';

export interface Session {
	cards: Card[];
	queue: Card[];
	index: number;
	answers: boolean[];
}

export function createSession(cards: Card[]): Session {
	const queue = [...cards];
	for (let i = queue.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[queue[i], queue[j]] = [queue[j], queue[i]];
	}
	return { cards, queue, index: 0, answers: [] };
}

export function answer(session: Session, swipe: Swipe): { correct: boolean; session: Session } {
	const card = session.queue[session.index];
	const saidTrue = swipe === 'right';
	const correct = card.isTrue === saidTrue;
	return {
		correct,
		session: { ...session, index: session.index + 1, answers: [...session.answers, correct] },
	};
}

export function isFinished(session: Session): boolean {
	return session.index >= session.queue.length;
}

export function results(session: Session): { score: number; total: number; mistakes: Card[] } {
	const mistakes = session.queue.filter((_, i) => i < session.answers.length && !session.answers[i]);
	return { score: session.answers.filter(Boolean).length, total: session.queue.length, mistakes };
}
