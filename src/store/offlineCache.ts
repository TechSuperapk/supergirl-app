/**
 * offlineCache.ts — lightweight local backup for offline access.
 *
 * - attachAutoSave: debounce-persists the auth user + journal entries to
 *   AsyncStorage whenever the store changes.
 * - hydrateFromCache: on app launch, restores the cached user + entries so the
 *   app shows data instantly while offline. When the device is online, the
 *   Firestore real-time subscriptions overwrite this cache (server wins),
 *   which is our conflict-resolution policy.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginSuccess } from '../modules/auth/store/authSlice';
import { loadEntries } from '../modules/journaling/store/journalSlice';

const KEY = 'superbae_cache_v1';
let timer: ReturnType<typeof setTimeout> | null = null;

export function attachAutoSave(store: any) {
  store.subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const st = store.getState();
        const payload = JSON.stringify({
          user: st.auth?.user ?? null,
          entries: st.journal?.entries ?? [],
          savedAt: Date.now(),
        });
        await AsyncStorage.setItem(KEY, payload);
      } catch {
        /* ignore cache write errors */
      }
    }, 800);
  });
}

export async function hydrateFromCache(store: any) {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return;
    const { user, entries } = JSON.parse(raw);
    const st = store.getState();
    // Only auto-restore a REAL Firebase sign-in. Test/demo logins (test OTP)
    // are not restored, so Splash -> Onboarding -> OTP shows on every launch.
    const isReal = user && user.id && !String(user.id).startsWith('demo_user_');
    if (isReal && !st.auth?.isLoggedIn) {
      store.dispatch(loginSuccess(user));
      if (Array.isArray(entries) && entries.length && !(st.journal?.entries?.length)) {
        store.dispatch(loadEntries(entries));
      }
    }
  } catch {
    /* ignore cache read errors */
  }
}
