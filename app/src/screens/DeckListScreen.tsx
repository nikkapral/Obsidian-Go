import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchDeck, fetchDecks } from '../api';
import { Card, DeckSummary } from '../types';

interface Props {
  baseUrl: string;
  onOpenDeck: (deck: DeckSummary, cards: Card[]) => void;
  onOpenSettings: () => void;
}

export default function DeckListScreen({ baseUrl, onOpenDeck, onOpenSettings }: Props) {
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingPath, setOpeningPath] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchDecks(baseUrl);
      setDecks(list);
    } catch {
      setError('Obsidian недоступен: проверьте IP и что Obsidian запущен');
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    load();
  }, [load]);

  const openDeck = async (deck: DeckSummary) => {
    if (deck.cardCount === 0 || openingPath) return;
    setOpeningPath(deck.path);
    try {
      const cards = await fetchDeck(baseUrl, deck.path);
      onOpenDeck(deck, cards);
    } catch {
      setError('Obsidian недоступен: проверьте IP и что Obsidian запущен');
    } finally {
      setOpeningPath(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={load}>
          <Text style={styles.buttonText}>Повторить</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={onOpenSettings}>
          <Text style={styles.linkText}>Настройки</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Колоды</Text>
        <TouchableOpacity onPress={onOpenSettings}>
          <Text style={styles.linkText}>Настройки</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={decks}
        keyExtractor={(item) => item.path}
        renderItem={({ item }) => {
          const empty = item.cardCount === 0;
          return (
            <TouchableOpacity
              style={[styles.deck, empty && styles.deckDisabled]}
              onPress={() => openDeck(item)}
              disabled={empty}
            >
              <View style={styles.deckInfo}>
                <Text style={styles.deckPath}>{item.path}</Text>
                <Text style={styles.deckMeta}>
                  {empty ? 'нет карточек' : `карточек: ${item.cardCount}`}
                  {item.stale ? ' · можно обновить' : ''}
                </Text>
              </View>
              {openingPath === item.path && <ActivityIndicator />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Колоды не найдены</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  deck: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
  },
  deckDisabled: {
    opacity: 0.5,
  },
  deckInfo: {
    flex: 1,
  },
  deckPath: {
    fontSize: 16,
    fontWeight: '500',
  },
  deckMeta: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  empty: {
    textAlign: 'center',
    color: '#666',
    marginTop: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#c0392b',
    textAlign: 'center',
    marginBottom: 16,
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
  linkButton: {
    marginTop: 16,
  },
  linkText: {
    color: '#2f6fed',
    fontSize: 15,
  },
});
