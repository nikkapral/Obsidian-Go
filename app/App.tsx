import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getBaseUrl } from './src/config';
import DeckListScreen from './src/screens/DeckListScreen';
import ResultScreen from './src/screens/ResultScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { Card } from './src/types';

type Screen = 'settings' | 'decks' | 'session' | 'result';

interface SessionResult {
  score: number;
  total: number;
  mistakes: Card[];
}

export default function App() {
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('settings');
  const [cards, setCards] = useState<Card[]>([]);
  const [result, setResult] = useState<SessionResult | null>(null);

  useEffect(() => {
    getBaseUrl().then((url) => {
      setBaseUrl(url);
      setScreen(url ? 'decks' : 'settings');
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  let content: React.ReactElement;
  switch (screen) {
    case 'settings':
      content = (
        <SettingsScreen
          onSaved={(url) => {
            setBaseUrl(url);
            setScreen('decks');
          }}
        />
      );
      break;
    case 'decks':
      content = (
        <DeckListScreen
          baseUrl={baseUrl!}
          onOpenDeck={(_, deckCards) => {
            setCards(deckCards);
            setScreen('session');
          }}
          onOpenSettings={() => setScreen('settings')}
        />
      );
      break;
    case 'session':
      // Заглушка до Task 10 (SessionScreen со свайпами)
      content = (
        <View style={styles.center}>
          <Text style={styles.placeholderTitle}>Сессия (скоро)</Text>
          <Text style={styles.placeholderText}>Карточек в колоде: {cards.length}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setResult({ score: cards.length, total: cards.length, mistakes: [] });
              setScreen('result');
            }}
          >
            <Text style={styles.buttonText}>Завершить (заглушка)</Text>
          </TouchableOpacity>
        </View>
      );
      break;
    case 'result':
      content = (
        <ResultScreen
          score={result?.score ?? 0}
          total={result?.total ?? 0}
          mistakes={result?.mistakes ?? []}
          onBackToDecks={() => setScreen('decks')}
        />
      );
      break;
  }

  return (
    <View style={styles.container}>
      {content}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2f6fed',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
