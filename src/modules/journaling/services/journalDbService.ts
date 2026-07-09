import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { apiClient } from '../../../services/apiClient';
import { JournalEntry } from '../types';

// ── Journal entries — now backed by the Express + MongoDB API ──────────────
// (Firebase Storage still holds the actual media files; only the entry
// records themselves moved off Firestore. `userId` param is kept for
// call-site compatibility — the backend derives the real owner from the
// session JWT attached by apiClient, so it's unused here.)

interface EntryResponse { entry: any }
interface EntryListResponse { entries: any[] }

/** Saves or updates a journal entry via the backend. POST /journal is an
 *  upsert server-side (matched by the entry's own id), so this is safe to
 *  retry from the offline sync queue without creating duplicates. */
export async function saveJournalEntry(_userId: string, entry: JournalEntry): Promise<void> {
  await apiClient.post<EntryResponse>('/journal', entry);
}

/** Deletes a journal entry via the backend (soft delete server-side). */
export async function deleteJournalEntry(entryId: string): Promise<void> {
  await apiClient.del(`/journal/${entryId}`);
}

/** Updates specific fields of a journal entry via the backend. */
export async function updateJournalEntryFields(entryId: string, fields: Partial<JournalEntry>): Promise<void> {
  await apiClient.patch<EntryResponse>(`/journal/${entryId}`, fields);
}

/** One-time fetch of all of the signed-in user's journal entries. */
export async function fetchJournalEntriesOnce(_userId: string): Promise<JournalEntry[]> {
  const res = await apiClient.get<EntryListResponse>('/journal?limit=200');
  const entries = res.entries as JournalEntry[];
  entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return entries;
}

/** No realtime push from the REST backend, so this polls instead of
 *  subscribing — same call-site contract (returns an unsubscribe fn) as the
 *  old Firestore onSnapshot listener it replaces. Picks up changes made from
 *  other devices, or ones this device's own offline queue just flushed. */
export function subscribeToJournalEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (error: any) => void,
  intervalMs = 20000,
) {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      const entries = await fetchJournalEntriesOnce(userId);
      if (!stopped) onUpdate(entries);
    } catch (error) {
      if (!stopped) onError?.(error);
    }
  };
  void tick();
  const timer = setInterval(tick, intervalMs);
  return () => { stopped = true; clearInterval(timer); };
}

// ── Vault (private-journal PIN) + Drafts — unchanged, still Firestore ──────
// Out of scope for the entries-CRUD migration: these aren't part of the
// "journal entries" API and touching the PIN/security-question flow isn't
// something to migrate opportunistically alongside it.

export interface VaultData { pin?: string; q1?: string; a1?: string; q2?: string; a2?: string; }

export async function saveVaultData(userId: string, data: VaultData) {
  const ref = doc(db, 'vaults', userId);
  await setDoc(ref, { ...data, userId, updatedAt: new Date().toISOString() }, { merge: true });
}

export function subscribeToVault(userId: string, onUpdate: (data: VaultData | null) => void) {
  const ref = doc(db, 'vaults', userId);
  return onSnapshot(ref, (snap) => onUpdate(snap.exists() ? (snap.data() as VaultData) : null));
}

export async function saveDraftToFirestore(userId: string, entry: JournalEntry) {
  const ref = doc(db, 'journal_drafts', entry.id);
  await setDoc(ref, { ...entry, userId, updatedAt: new Date().toISOString() });
}

export async function deleteDraftFromFirestore(draftId: string) {
  await deleteDoc(doc(db, 'journal_drafts', draftId));
}

export function subscribeToDrafts(
  userId: string,
  onUpdate: (drafts: JournalEntry[]) => void,
  onError?: (error: any) => void,
) {
  const q = query(collection(db, 'journal_drafts'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const drafts: JournalEntry[] = [];
    snapshot.forEach((d) => drafts.push(d.data() as JournalEntry));
    drafts.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    onUpdate(drafts);
  }, (error) => { if (onError) onError(error); });
}
