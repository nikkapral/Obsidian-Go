import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getBaseUrl, setBaseUrl } from '../config';

interface Props {
  onSaved: (baseUrl: string) => void;
}

export default function SettingsScreen({ onSaved }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBaseUrl().then((saved) => {
      if (saved) setValue(saved);
    });
  }, []);

  const save = async () => {
    const url = value.trim();
    if (!url) {
      setError('Введите адрес, например 192.168.1.5:27124');
      return;
    }
    setError(null);
    const normalized = /^https?:\/\//.test(url) ? url : `http://${url}`;
    await setBaseUrl(normalized);
    onSaved(normalized);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Настройки</Text>
      <Text style={styles.label}>Адрес Obsidian (host:port)</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder="192.168.1.5:27124"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Сохранить</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#c0392b',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2f6fed',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
