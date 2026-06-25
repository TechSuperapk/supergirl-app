/**
 * backupService.ts — explicit backup & restore for journal entries.
 *
 * Two stores are kept so journals survive a logout/login (and offline):
 *   1. Local  — AsyncStorage, keyed by phone number (always available, even
 *      offline and across anonymous/test UIDs).
 *   2. Server — Firestore `journal_backups/{uid}` snapshot doc (owner-only).
 *
 * On re-login we read the best available backup and, if the live state is
 * empty, offer to restore it. Restored entries are re-saved to the server
 * under the current UID so the realtime subscription keeps them in sync.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { JournalEntry } from '../types';
import { saveJournalEntry } from './journalDbService';

const localKey = (phone: string) =>
  `superbae_backup_${(phone || 'guest').replace(/\D/g, '') || 'guest'}`;

const isRealUid = (uid?: string) => !!uid && !uid.startsWith('demo_user_') && uid !== 'guest';

export interface BackupInfo {
  entries: JournalEntry[];
  savedAt: string;
  count: number;
  source: 'local' | 'server';
}

/** Write the current entries to BOTH local storage and the server. */
export async function saveBackup(phone: string, uid: string, entries: JournalEntry[]) {
  const savedAt = new Date().toISOString();
  const payload = { entries, savedAt, count: entries.length };
  try {
    await AsyncStorage.setItem(localKey(phone), JSON.stringify(payload));
  } catch { /* ignore local write errors */ }
  try {
    if (isRealUid(uid)) {
      await setDoc(doc(db, 'journal_backups', uid), { ...payload, uid, phone }, { merge: true });
    }
  } catch { /* ignore server write errors (offline etc.) */ }
}

export async function getLocalBackup(phone: string): Promise<BackupInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(localKey(phone));
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!Array.isArray(p.entries) || p.entries.length === 0) return null;
    return { entries: p.entries, savedAt: p.savedAt, count: p.count ?? p.entries.length, source: 'local' };
  } catch { return null; }
}

export async function getServerBackup(uid: string): Promise<BackupInfo | null> {
  try {
    if (!isRealUid(uid)) return null;
    const snap = await getDoc(doc(db, 'journal_backups', uid));
    if (!snap.exists()) return null;
    const p = snap.data() as any;
    if (!Array.isArray(p.entries) || p.entries.length === 0) return null;
    return { entries: p.entries, savedAt: p.savedAt, count: p.count ?? p.entries.length, source: 'server' };
  } catch { return null; }
}

/** Best available backup: prefer the one with more entries; tie -> newer. */
export async function getBestBackup(phone: string, uid: string): Promise<BackupInfo | null> {
  const [local, server] = await Promise.all([getLocalBackup(phone), getServerBackup(uid)]);
  if (local && server) {
    if (server.count !== local.count) return server.count > local.count ? server : local;
    return server.savedAt >= local.savedAt ? server : local;
  }
  return local ?? server;
}

/** Re-save restored entries to the server under the current UID so they persist & sync. */
export async function pushRestoredToServer(uid: string, entries: JournalEntry[]) {
  if (!isRealUid(uid)) return;
  for (const e of entries) {
    try { await saveJournalEntry(uid, e); } catch { /* keep going */ }
  }
}
