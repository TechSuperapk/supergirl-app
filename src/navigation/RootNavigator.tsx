import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { RootState } from '../store';
import { setOnboardingSeen, loginSuccess, logout } from '../modules/auth/store/authSlice';
import { loadEntries, loadVault, loadDrafts, updateEntry } from '../modules/journaling/store/journalSlice';
import { getUserProfileFromFirestore } from '../modules/auth/services/userService';
import { subscribeToJournalEntries, subscribeToVault, subscribeToDrafts } from '../modules/journaling/services/journalDbService';
import { saveBackup, getBestBackup, pushRestoredToServer } from '../modules/journaling/services/backupService';
import { initBackupSystem, teardownBackupSystem } from '../backup';
import { startJournalSync, stopJournalSync } from '../modules/journaling/offline/journalSync';
import { startNotesSync, stopNotesSync } from '../modules/journaling/offline/notesSync';
import { mergeServerWithLocal, RichJournals } from '../modules/journaling/offline/richJournalStore';
import { SplashScreen }       from '../modules/auth/screens/SplashScreen';
import { OnboardingScreen }   from '../modules/auth/screens/OnboardingScreen';
import { LoginScreen }        from '../modules/auth/screens/LoginScreen';
import { ProfileSetupScreen } from '../modules/auth/screens/ProfileSetupScreen';
import { MainAppNavigator }   from './MainAppNavigator';

type Phase = 'splash'|'onboarding'|'login'|'profile'|'app';

export function RootNavigator() {
  const dispatch     = useDispatch();
  const isLoggedIn   = useSelector((s: RootState) => s.auth.isLoggedIn);
  const hasOnboarded = useSelector((s: RootState) => s.auth.hasSeenOnboarding);
  const user         = useSelector((s: RootState) => s.auth.user);
  const entries      = useSelector((s: RootState) => s.journal.entries);
  const [phase, setPhase] = useState<Phase>('splash');

  const entriesRef  = useRef(entries); entriesRef.current = entries;
  const promptedRef = useRef<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fu) => {
      if (fu) {
        let p: any = null;
        try { p = await getUserProfileFromFirestore(fu.uid); } catch {}
        dispatch(loginSuccess({
          id: fu.uid, name: p?.name ?? fu.displayName ?? '',
          phone: fu.phoneNumber ?? p?.phone ?? '',
          countryCode: p?.countryCode ?? '+91', avatarUrl: p?.avatarUrl,
          bio: p?.bio, createdAt: p?.createdAt ?? new Date().toISOString(), isVerified: true,
        }));
      } else {
        if (user && !user.id.startsWith('demo_user_')) { dispatch(logout()); dispatch(loadEntries([])); }
      }
    });
    return () => unsub();
  }, [dispatch, user]);

  // Offline-first journals: hydrate from the local store instantly, then start
  // the background sync. The realtime subscription merges server data with any
  // pending local changes so offline edits are never lost.
  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;
    const local = RichJournals.active();
    if (local.length) dispatch(loadEntries(mergeServerWithLocal(local)));
    startJournalSync(user.id, (e) => dispatch(updateEntry(e)));
    return () => stopJournalSync();
  }, [isLoggedIn, user?.id, dispatch]);

  // Quick Notes: same background-upload durability for photos/voice clips
  // as Journal, without adding a Firestore sync for the notes themselves
  // (they remain local-only, same as before).
  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;
    startNotesSync(user.id);
    return () => stopNotesSync();
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;
    const unsub = subscribeToJournalEntries(user.id, (e) => dispatch(loadEntries(mergeServerWithLocal(e))));
    return () => unsub();
  }, [isLoggedIn, user?.id, dispatch]);

  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;
    const unsub = subscribeToDrafts(user.id, (d) => dispatch(loadDrafts(d)));
    return () => unsub();
  }, [isLoggedIn, user?.id, dispatch]);

  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;
    const unsub = subscribeToVault(user.id, (v) => { if (v) dispatch(loadVault(v)); });
    return () => unsub();
  }, [isLoggedIn, user?.id, dispatch]);

  // Offline-first backup system: start the MMKV store, sync queue, and realtime
  // listeners on login; tear them down on logout.
  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;
    initBackupSystem(user.id);
    return () => teardownBackupSystem();
  }, [isLoggedIn, user?.id]);

  // Auto-backup: debounce-save entries to local + server whenever they change.
  useEffect(() => {
    if (!isLoggedIn || !user?.id || entries.length === 0) return;
    const t = setTimeout(() => { saveBackup(user.phone ?? '', user.id, entries); }, 1200);
    return () => clearTimeout(t);
  }, [entries, isLoggedIn, user?.id, user?.phone]);

  // After login: if nothing synced and a backup exists, offer to restore it.
  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;
    if (promptedRef.current === user.id) return;
    promptedRef.current = user.id;
    const uid = user.id;
    const phone = user.phone ?? '';
    const t = setTimeout(async () => {
      if (entriesRef.current.length > 0) return; // realtime sync already restored
      const backup = await getBestBackup(phone, uid);
      if (!backup || backup.count === 0) return;
      const when = (() => { try { return new Date(backup.savedAt).toLocaleDateString(); } catch { return ''; } })();
      Alert.alert(
        'Restore your journals?',
        `Found a backup with ${backup.count} saved ${backup.count === 1 ? 'journal' : 'journals'}${when ? ` from ${when}` : ''}. Restore them now?`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Restore', onPress: async () => {
              dispatch(loadEntries(backup.entries));
              await pushRestoredToServer(uid, backup.entries);
            } },
        ],
      );
    }, 2500);
    return () => clearTimeout(t);
  }, [isLoggedIn, user?.id, user?.phone, dispatch]);

  // When the user logs out, return to the onboarding/login + OTP screen.
  useEffect(() => {
    if (!isLoggedIn) {
      promptedRef.current = null;
      setPhase(prev => (prev === 'app' || prev === 'profile') ? 'onboarding' : prev);
    }
  }, [isLoggedIn]);

  const next = (): Phase => {
    if (isLoggedIn) return user?.name ? 'app' : 'profile';
    return 'onboarding';
  };

  if (phase === 'splash')     return <SplashScreen onDone={() => setPhase(next())} />;
  if (phase === 'onboarding') return <OnboardingScreen onDone={() => { dispatch(setOnboardingSeen()); setPhase(next()); }} />;
  if (phase === 'login')      return <LoginScreen onLogin={() => setPhase('profile')} />;
  if (phase === 'profile')    return <ProfileSetupScreen onDone={() => setPhase('app')} />;
  return <MainAppNavigator />;
}
