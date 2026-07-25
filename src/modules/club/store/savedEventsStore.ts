/**
 * savedEventsStore — the user's "liked/saved" Hangouts events. A tiny zustand
 * store persisted to AsyncStorage (offline-friendly, per-device). The heart on
 * each event card toggles membership; the heart in the Hangouts header opens
 * the saved list.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'club_saved_events';

interface SavedEventsState {
  saved: Record<string, true>;
  toggle: (eventId: string) => void;
  hydrate: () => Promise<void>;
}

export const useSavedEvents = create<SavedEventsState>((set, get) => ({
  saved: {},
  toggle: (eventId) => {
    const next = { ...get().saved };
    if (next[eventId]) delete next[eventId];
    else next[eventId] = true;
    set({ saved: next });
    AsyncStorage.setItem(KEY, JSON.stringify(Object.keys(next))).catch(() => {});
  },
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        set({ saved: Object.fromEntries(ids.map(id => [id, true as const])) });
      }
    } catch { /* first run / corrupt cache — start empty */ }
  },
}));

// Hydrate once when the module first loads.
useSavedEvents.getState().hydrate();
