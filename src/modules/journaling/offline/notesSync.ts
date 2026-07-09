/**
 * notesSync — background media durability for Quick Notes, mirroring
 * journalSync's pattern for the Journal module.
 *
 * Quick Notes are stored locally only (AsyncStorage) — this file does NOT
 * add a Firestore sync for note text/content. What it does fix: photos and
 * voice clips are picked/recorded into a local cache URI (file://...), and
 * relying on that path forever is fragile — the OS can clear app caches,
 * and on some devices the picker's temp path doesn't survive an app
 * restart. Journal avoids this by uploading local media to Firebase
 * Storage in the background and swapping the URI for the permanent
 * download URL once the upload succeeds; this does the exact same thing
 * for notes' `media` (photos) and `audio` (voice) arrays.
 *
 * Runs every 30s and immediately on network reconnect. Any failure (no
 * network, upload error, corrupt note) is caught and simply retried next
 * cycle — it never throws past this module and never blocks the UI.
 */
import * as Network from 'expo-network';
import { loadNotes, saveNotes, QuickNoteRecord } from '../quickNotesStore';
import { uploadFileToFirebase } from '../../../services/storageService';

let uid: string | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let netSub: { remove: () => void } | null = null;
let running = false;

const isRemote = (u: string) => /^https?:\/\//i.test(u);
const hasLocalMedia = (n: QuickNoteRecord) =>
  (n.media ?? []).some(u => !isRemote(u)) || (n.audio ?? []).some(a => !isRemote(a.uri));

async function uploadNoteMedia(u: string, note: QuickNoteRecord): Promise<QuickNoteRecord> {
  const media: string[] = [];
  for (const uri of note.media ?? []) {
    if (!uri || isRemote(uri)) { if (uri) media.push(uri); continue; }
    try {
      const ext = uri.split('.').pop() || 'jpg';
      const path = `notes_media/${u}/${note.id}/media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      media.push(await uploadFileToFirebase(uri, path));
    } catch { media.push(uri); } // keep local URI, retry next cycle
  }

  const audio = await Promise.all((note.audio ?? []).map(async a => {
    if (!a?.uri || isRemote(a.uri)) return a;
    try {
      const ext = a.uri.split('.').pop() || 'm4a';
      const path = `notes_media/${u}/${note.id}/voice_${a.id}.${ext}`;
      return { ...a, uri: await uploadFileToFirebase(a.uri, path) };
    } catch { return a; } // keep local URI, retry next cycle
  }));

  return { ...note, media, audio };
}

async function isOnline(): Promise<boolean> {
  try { const s = await Network.getNetworkStateAsync(); return !!s.isConnected; }
  catch { return true; }
}

/** Flush once: upload any local media on any note, save back if anything changed. */
export async function flushNotesSync(): Promise<void> {
  if (running || !uid) return;
  if (!(await isOnline())) return;
  running = true;
  try {
    const notes = await loadNotes();
    let changed = false;
    const resolved: QuickNoteRecord[] = [];
    for (const n of notes) {
      if (!n || !hasLocalMedia(n)) { if (n) resolved.push(n); continue; }
      try {
        const updated = await uploadNoteMedia(uid, n);
        resolved.push(updated);
        changed = true;
      } catch {
        resolved.push(n); // keep as-is, retry next cycle
      }
    }
    if (changed) await saveNotes(resolved);
  } catch {
    // A single corrupt note or storage hiccup should never crash the app —
    // just skip this cycle and try again on the next one.
  } finally {
    running = false;
  }
}

export function triggerNotesFlush(): void { void flushNotesSync(); }

/** Start the periodic + network-triggered flusher for a user. */
export function startNotesSync(u: string): void {
  uid = u;
  stopNotesSync();
  timer = setInterval(() => { void flushNotesSync(); }, 30000);
  try {
    netSub = Network.addNetworkStateListener(st => { if (st.isConnected) void flushNotesSync(); });
  } catch { netSub = null; }
  void flushNotesSync();
}

export function stopNotesSync(): void {
  if (timer) { clearInterval(timer); timer = null; }
  if (netSub) { try { netSub.remove(); } catch {} netSub = null; }
  uid = null;
}
