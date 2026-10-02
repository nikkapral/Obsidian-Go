/**
 * @jest-environment node
 */
import { createSession, answer, isFinished, results } from '../session';
import { Card } from '../types';

const CARD_TRUE: Card = { id: 'a.md#0', statement: 's', isTrue: true, note: 'N', notePath: 'a.md' };
const CARD_FALSE: Card = { id: 'a.md#1', statement: 's2', isTrue: false, note: 'N', notePath: 'a.md' };

test('правильный свайп засчитывается', () => {
	const s = createSession([CARD_TRUE]); // isTrue: true
	const { correct } = answer(s, 'right');
	expect(correct).toBe(true);
});

test('неверный свайп → ошибка попадает в mistakes', () => {
	const s = createSession([CARD_TRUE]);
	const { correct, session } = answer(s, 'left');
	expect(correct).toBe(false);
	expect(results(session).mistakes).toEqual([CARD_TRUE]);
});

test('score и total после сессии из 2 карточек', () => {
	let s = createSession([CARD_TRUE, CARD_FALSE]);
	// после перемешивания берём текущую карточку и свайпаем верно для первой, неверно для второй
	const first = s.queue[s.index];
	s = answer(s, first.isTrue ? 'right' : 'left').session;
	const second = s.queue[s.index];
	s = answer(s, second.isTrue ? 'left' : 'right').session;
	expect(results(s)).toEqual({ score: 1, total: 2, mistakes: [second] });
	expect(isFinished(s)).toBe(true);
});

test('пустая колода сразу завершена', () => {
	expect(isFinished(createSession([]))).toBe(true);
});
