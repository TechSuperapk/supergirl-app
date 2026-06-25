/**
 * Local key-value storage engine.
 *
 * NOTE: originally MMKV, but MMKV is a native module that does NOT run in
 * Expo Go. To keep the app runnable in Expo Go AND in native builds, this is
 * backed by AsyncStorage via a synchronous in-memory cache:
 *   - reads/writes are synchronous against the in-memory map (the API our
 *     stores rely on),
 *   - writes are debounce-persisted to AsyncStorage in the background,
 *   - call hydrateStorage() once at startup to load the cache from disk.
 *
 * The public surface (storage.getString/set/delete/clearAll, readJSON,
 * writeJSON, Keys) is unchanged, so no other file needs to change.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERSIST_KEY = 'superbae_kv_v1';
const cache: Record<string, string> = {};
let hydrated = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    AsyncStorage.setItem(PERSIST_KEY, JSON.stringify(cache)).catch(() => {});
  }, 300);
}

/** Load the persisted cache from AsyncStorage. Call once before reading data. */
export async function hydrateStorage(): Promise<void> {
  if (hydrated) return;
  try {
    const raw = await AsyncStorage.getItem(PERSIST_KEY);
    if (raw) Object.assign(cache, JSON.parse(raw));
  } catch {
    /* ignore corrupt cache */
  }
  hydrated = true;
}

export const storage = {
  getString(key: string): string | undefined { return cache[key]; },
  set(key: string, value: string): void { cache[key] = value; schedulePersist(); },
  delete(key: string): void { delete cache[key]; schedulePersist(); },
  clearAll(): void {
    for (const k of Object.keys(cache)) delete cache[k];
    schedulePersist();
  },
};

export const Keys = {
  journals:  'db.journals',
  queue:     'db.syncQueue',
  settings:  'db.settings',
  reminders: 'db.reminders',
  templates: 'db.templates',
  meta:      'db.meta',
  stats:     'db.stats',
} as const;

/** Read & parse a JSON value, or return the fallback. */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = storage.getString(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Serialize & write a JSON value. */
export function writeJSON(key: string, value: unknown): void {
  try {
    storage.set(key, JSON.stringify(value));
  } catch {
    /* non-fatal for the UI */
  }
}

export function clearAll(): void {
  storage.clearAll();
}
