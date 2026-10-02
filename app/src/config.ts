import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'obsidian-check:baseUrl';

export async function getBaseUrl(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function setBaseUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(KEY, url);
}
