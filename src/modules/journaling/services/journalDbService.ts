import { apiClient } from '../../../services/apiClient';
import { listDocs, upsertDoc, removeDoc } from '../../../services/dataApi';
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

// ── Vault (private-journal PIN) + Drafts — now on the backend (MongoDB) via
// the generic /api/data collections. Polling replaces the old Firestore
// onSnapshot listeners (same unsubscribe-fn contract). ──

// Fields hold hashes only (see utils/vaultCrypto.ts), never raw PIN/answers.
export interface VaultData { pinHash?: string; q1?: string; a1Hash?: string; q2?: string; a2Hash?: string; }

export async function saveVaultData(_userId: string, data: VaultData) {
  // One vault doc per user (backend scopes by JWT; empty match = the user's doc).
  await upsertDoc('vaults', {}, data);
}

export function subscribeToVault(
  _userId: string,
  onUpdate: (data: VaultData | null) => void,
  onError?: (error: any) => void,
  intervalMs = 20000,
) {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try { const list = await listDocs<VaultData>('vaults'); if (!stopped) onUpdate(list[0] ?? null); }
    catch (e) { if (!stopped) onError?.(e); }
  };
  void tick();
  const timer = setInterval(tick, intervalMs);
  return () => { stopped = true; clearInterval(timer); };
}

export async function saveDraftToFirestore(_userId: string, entry: JournalEntry) {
  await upsertDoc('journal_drafts', { clientKey: entry.id }, { ...entry, clientKey: entry.id });
}

export async function deleteDraftFromFirestore(draftId: string) {
  const list = await listDocs<any>('journal_drafts');
  const m = list.find(d => d.clientKey === draftId || d.id === draftId);
  if (m?.id) await removeDoc('journal_drafts', m.id);
}

export function subscribeToDrafts(
  _userId: string,
  onUpdate: (drafts: JournalEntry[]) => void,
  onError?: (error: any) => void,
  intervalMs = 20000,
) {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      const list = await listDocs<any>('journal_drafts');
      const drafts = list
        .map(d => ({ ...d, id: d.clientKey ?? d.id }))
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)) as JournalEntry[];
      if (!stopped) onUpdate(drafts);
    } catch (e) { if (!stopped) onError?.(e); }
  };
  void tick();
  const timer = setInterval(tick, intervalMs);
  return () => { stopped = true; clearInterval(timer); };
}
