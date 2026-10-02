import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../types';

interface Props {
  score: number;
  total: number;
  mistakes: Card[];
  onBackToDecks: () => void;
}

export default function ResultScreen({ score, total, mistakes, onBackToDecks }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Результат</Text>
      <Text style={styles.score}>
        {score} / {total}
      </Text>
      <Text style={styles.subtitle}>
        {mistakes.length === 0 ? 'Ошибок нет!' : 'Ошибки:'}
      </Text>
      <FlatList
        style={styles.list}
        data={mistakes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.mistake}>
            <Text style={styles.statement}>{item.statement}</Text>
            <Text style={styles.answer}>
              На самом деле: {item.isTrue ? 'верно' : 'неверно'}
            </Text>
            <Text style={styles.note}>Источник: {item.note}</Text>
          </View>
        )}
      />
      <TouchableOpacity style={styles.button} onPress={onBackToDecks}>
        <Text style={styles.buttonText}>К колодам</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
  score: {
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  mistake: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statement: {
    fontSize: 15,
  },
  answer: {
    fontSize: 14,
    color: '#2f6fed',
    marginTop: 4,
  },
  note: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#2f6fed',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
