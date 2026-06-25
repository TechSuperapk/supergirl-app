import {
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { JournalEntry } from '../types';

/**
 * Saves or updates a journal entry in Firestore.
 */
export async function saveJournalEntry(userId: string, entry: JournalEntry) {
  const ref = doc(db, 'journal_entries', entry.id);
  await setDoc(ref, {
    ...entry,
    userId,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Deletes a journal entry from Firestore.
 */
export async function deleteJournalEntry(entryId: string) {
  const ref = doc(db, 'journal_entries', entryId);
  await deleteDoc(ref);
}

/**
 * Updates specific fields of a journal entry in Firestore.
 */
export async function updateJournalEntryFields(entryId: string, fields: Partial<JournalEntry>) {
  const ref = doc(db, 'journal_entries', entryId);
  await updateDoc(ref, fields);
}

/**
 * Subscribes to real-time updates for a user's journal entries.
 */
export function subscribeToJournalEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (error: any) => void
) {
  const q = query(
    collection(db, 'journal_entries'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((d) => {
        entries.push(d.data() as JournalEntry);
      });
      // Sort client-side so we don't require a composite Firestore index.
      entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      onUpdate(entries);
    },
    (error) => {
      console.error('Firestore real-time subscription error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * One-time fetch of all of a user's journal entries (for manual restore).
 */
export async function fetchJournalEntriesOnce(userId: string): Promise<JournalEntry[]> {
  const q = query(collection(db, 'journal_entries'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const entries: JournalEntry[] = [];
  snap.forEach((d) => entries.push(d.data() as JournalEntry));
  entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return entries;
}

/**
 * Vault (private journal) PIN + security questions — per-user, owner-only doc.
 */
export interface VaultData { pin?: string; q1?: string; a1?: string; q2?: string; a2?: string; }

export async function saveVaultData(userId: string, data: VaultData) {
  const ref = doc(db, 'vaults', userId);
  await setDoc(ref, { ...data, userId, updatedAt: new Date().toISOString() }, { merge: true });
}

export function subscribeToVault(userId: string, onUpdate: (data: VaultData | null) => void) {
  const ref = doc(db, 'vaults', userId);
  return onSnapshot(ref, (snap) => onUpdate(snap.exists() ? (snap.data() as VaultData) : null));
}

/**
 * In-progress drafts — same realtime pattern as entries, in their own collection.
 */
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
