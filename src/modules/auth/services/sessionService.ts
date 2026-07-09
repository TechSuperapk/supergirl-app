// Persists the backend session JWT + the profile returned by /api/auth/verify.
// SecureStore (not MMKV/AsyncStorage) because this is a credential, not app
// data — keeps it out of the plain-file offline caches.
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'sg_session_jwt';

export async function saveSessionToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getSessionToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearSessionToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
