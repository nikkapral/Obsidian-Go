import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { answer, createSession, results, Session, Swipe } from '../session';
import { Card } from '../types';

interface Props {
  cards: Card[];
  onDone: (r: { score: number; total: number; mistakes: Card[] }) => void;
  onExit: () => void;
}

export default function SessionScreen({ cards, onDone, onExit }: Props) {
  const [session, setSession] = useState<Session>(() => createSession(cards));
  const sessionRef = useRef(session);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const handleSwipe = (swipe: Swipe) => {
    const { correct, session: next } = answer(sessionRef.current, swipe);
    sessionRef.current = next;
    setSession(next);
    setLastCorrect(correct);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setLastCorrect(null), 350);
  };

  const progress = `${Math.min(session.index + 1, session.queue.length)} / ${session.queue.length}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onExit}>
          <Text style={styles.exitText}>Выйти</Text>
        </TouchableOpacity>
        <Text style={styles.progress}>{progress}</Text>
      </View>
      <View style={styles.swiperArea}>
        <Swiper<Card>
          cards={session.queue}
          renderCard={(card) => (
            <View style={styles.card}>
              <Text style={styles.statement}>{card.statement}</Text>
              <Text style={styles.hint}>→ верно / ← неверно</Text>
            </View>
          )}
          onSwipedRight={() => handleSwipe('right')}
          onSwipedLeft={() => handleSwipe('left')}
          onSwipedAll={() => onDone(results(sessionRef.current))}
          verticalSwipe={false}
          cardIndex={0}
          backgroundColor="transparent"
          stackSize={2}
        />
        {lastCorrect !== null && (
          <View
            pointerEvents="none"
            style={[
              styles.flash,
              { backgroundColor: lastCorrect ? 'rgba(46, 160, 67, 0.25)' : 'rgba(220, 53, 69, 0.25)' },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  exitText: {
    fontSize: 16,
    color: '#dc3545',
    fontWeight: '600',
  },
  progress: {
    fontSize: 16,
    color: '#555',
  },
  swiperArea: {
    flex: 1,
  },
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    flex: 0.7,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  statement: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    position: 'absolute',
    bottom: 16,
    fontSize: 14,
    color: '#888',
  },
});
