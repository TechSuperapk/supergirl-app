/**
 * richJournalStore — offline-first local store for the FULL JournalEntry shape
 * (body, mood, tags, media, stickers, scribbles, theme, privacy, drafts).
 *
 * This is the local source of truth. The UI (Redux) is hydrated from here on
 * launch, and every create/edit/delete is written here FIRST, then synced to
 * Firestore in the background by journalSync.
 *
 * Stored in MMKV as id->entry maps for O(1) upsert/lookup.
 */
import { readJSON, writeJSON } from '../../../backup/storage/mmkv';
import { JournalEntry } from '../types';

const K_ENTRIES = 'rich.journals';
const K_PENDING = 'rich.pending';

type IdMap<T> = Record<string, T>;
export type PendingAction = 'save' | 'delete';
export interface PendingItem { action: PendingAction; at: number; retries: number }

const getEntries = () => readJSON<IdMap<JournalEntry>>(K_ENTRIES, {});
const setEntries = (m: IdMap<JournalEntry>) => writeJSON(K_ENTRIES, m);
const getPending = () => readJSON<IdMap<PendingItem>>(K_PENDING, {});
const setPending = (m: IdMap<PendingItem>) => writeJSON(K_PENDING, m);

export const RichJournals = {
  all(): JournalEntry[] { return Object.values(getEntries()); },
  active(): JournalEntry[] {
    return this.all().filter(e => !e.isDraft).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  get(id: string): JournalEntry | undefined { return getEntries()[id]; },
  upsert(e: JournalEntry): void { const m = getEntries(); m[e.id] = e; setEntries(m); },
  remove(id: string): void { const m = getEntries(); delete m[id]; setEntries(m); },
  replaceAll(es: JournalEntry[]): void {
    const m: IdMap<JournalEntry> = {};
    for (const e of es) m[e.id] = e;
    setEntries(m);
  },
  /** Merge server entries in, keeping whichever copy was updated most recently. */
  mergeFromServer(server: JournalEntry[]): void {
    const m = getEntries();
    for (const s of server) {
      const cur = m[s.id];
      if (!cur || (cur.updatedAt ?? '') <= (s.updatedAt ?? '')) m[s.id] = s;
    }
    setEntries(m);
  },
};

export const Pending = {
  all(): IdMap<PendingItem> { return getPending(); },
  ids(): string[] { return Object.keys(getPending()); },
  count(): number { return Object.keys(getPending()).length; },
  set(id: string, action: PendingAction): void {
    const m = getPending();
    m[id] = { action, at: Date.now(), retries: m[id]?.retries ?? 0 };
    setPending(m);
  },
  bumpRetry(id: string): number {
    const m = getPending();
    if (m[id]) { m[id].retries += 1; setPending(m); return m[id].retries; }
    return 0;
  },
  remove(id: string): void { const m = getPending(); delete m[id]; setPending(m); },
};

/**
 * Reconcile a fresh server snapshot with local pending changes so that
 * offline-created/edited entries are NOT wiped by the realtime subscription,
 * and locally-deleted entries stay hidden until the delete syncs.
 */
export function mergeServerWithLocal(server: JournalEntry[]): JournalEntry[] {
  const pending = Pending.all();
  const byId = new Map<string, JournalEntry>(server.map(e => [e.id, e]));
  for (const id of Object.keys(pending)) {
    if (pending[id].action === 'delete') { byId.delete(id); continue; }
    const local = RichJournals.get(id);
    if (local) byId.set(id, local); // local pending edit/create wins until synced
  }
  // keep MMKV in step with the merged truth for entries the server confirmed
  RichJournals.mergeFromServer(server);
  return Array.from(byId.values());
}

/** Wipe all local journals + pending sync jobs (cloud data is untouched). */
export function clearLocalJournals(): void {
  RichJournals.replaceAll([]);
  for (const id of Pending.ids()) Pending.remove(id);
}
