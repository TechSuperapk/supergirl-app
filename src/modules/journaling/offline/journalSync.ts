/**
 * journalSync — background sync for the offline-first rich journal store.
 *
 * Flushes pending create/edit/delete jobs to Firestore: uploads any local
 * media to Storage (swapping file URIs for download URLs), writes the entry,
 * and clears the job. Runs every 30s and immediately on network reconnect.
 * Failed jobs stay queued and retry next cycle.
 */
import * as Network from 'expo-network';
import { RichJournals, Pending } from './richJournalStore';
import { saveJournalEntry, deleteJournalEntry } from '../services/journalDbService';
import { uploadFileToFirebase } from '../../../services/storageService';
import { JournalEntry } from '../types';

let uid: string | null = null;
let onSyncedRef: ((e: JournalEntry) => void) | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let netSub: { remove: () => void } | null = null;
let running = false;

const listeners = new Set<(pending: number) => void>();
export function subscribeJournalSync(fn: (pending: number) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const emit = () => listeners.forEach(fn => { try { fn(Pending.count()); } catch {} });

export function pendingCount(): number { return Pending.count(); }

const isRemote = (u: string) => /^https?:\/\//i.test(u);
const hasLocalMedia = (e: JournalEntry) =>
  (e.mediaUrls ?? []).some(u => !isRemote(u)) || (!!e.voiceNoteUrl && !isRemote(e.voiceNoteUrl));

async function uploadEntryMedia(u: string, entry: JournalEntry): Promise<JournalEntry> {
  const mediaUrls: string[] = [];
  for (const uri of entry.mediaUrls ?? []) {
    if (isRemote(uri)) { mediaUrls.push(uri); continue; }
    try {
      const ext = uri.split('.').pop() || 'jpg';
      const path = `journal_media/${u}/${entry.id}/media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      mediaUrls.push(await uploadFileToFirebase(uri, path));
    } catch { mediaUrls.push(uri); } // keep local URI, retry next cycle
  }
  let voiceNoteUrl = entry.voiceNoteUrl;
  if (voiceNoteUrl && !isRemote(voiceNoteUrl)) {
    try {
      const ext = voiceNoteUrl.split('.').pop() || 'm4a';
      const path = `journal_media/${u}/${entry.id}/voice_${Date.now()}.${ext}`;
      voiceNoteUrl = await uploadFileToFirebase(voiceNoteUrl, path);
    } catch { /* keep local URI */ }
  }
  return { ...entry, mediaUrls, voiceNoteUrl };
}

async function isOnline(): Promise<boolean> {
  try { const s = await Network.getNetworkStateAsync(); return !!s.isConnected; }
  catch { return true; }
}

/** Flush all pending jobs once. Guarded against re-entry. */
export async function flush(): Promise<void> {
  if (running || !uid) return;
  if (!(await isOnline())) return;
  running = true;
  try {
    for (const id of Pending.ids()) {
      const job = Pending.all()[id];
      if (!job) continue;
      try {
        if (job.action === 'delete') {
          await deleteJournalEntry(id);
          Pending.remove(id);
          continue;
        }
        const entry = RichJournals.get(id);
        if (!entry) { Pending.remove(id); continue; }
        const needsUpload = hasLocalMedia(entry);
        const resolved = needsUpload ? await uploadEntryMedia(uid, entry) : entry;
        await saveJournalEntry(uid, resolved);
        if (needsUpload) {
          RichJournals.upsert(resolved);
          onSyncedRef?.(resolved); // swap local media URIs -> remote URLs in the UI
        }
        Pending.remove(id);
      } catch {
        Pending.bumpRetry(id); // leave queued; retried next cycle
      }
    }
  } finally {
    running = false;
    emit();
  }
}

export function triggerFlush(): void { void flush(); }

/** Start the periodic + network-triggered flusher for a user. */
export function startJournalSync(u: string, onSynced: (e: JournalEntry) => void): void {
  uid = u;
  onSyncedRef = onSynced;
  stopJournalSync();
  timer = setInterval(() => { void flush(); }, 30000);
  try {
    netSub = Network.addNetworkStateListener(st => { if (st.isConnected) void flush(); });
  } catch { netSub = null; }
  void flush();
}

export function stopJournalSync(): void {
  if (timer) { clearInterval(timer); timer = null; }
  if (netSub) { try { netSub.remove(); } catch {} netSub = null; }
}
