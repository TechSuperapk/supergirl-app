/**
 * localDb — offline-first local database over MMKV.
 * Collections are stored as id->entity maps for O(1) upsert/lookup.
 * This is always the source of truth the UI reads from; the sync layer
 * mirrors it to Firebase in the background.
 */
import { Keys, readJSON, writeJSON } from './mmkv';
import {
  JournalEntry, SyncQueueItem, AppSettings, Reminder, Template,
  BackupMeta, Statistics, TRASH_RETENTION_MS,
} from '../types';

type Map<T> = Record<string, T>;

const getMap = <T>(key: string): Map<T> => readJSON<Map<T>>(key, {});
const setMap = <T>(key: string, m: Map<T>) => writeJSON(key, m);

/* ----------------------------- Journals ----------------------------- */

export const Journals = {
  all(): JournalEntry[] {
    return Object.values(getMap<JournalEntry>(Keys.journals));
  },
  active(): JournalEntry[] {
    return this.all().filter(j => !j.isDeleted).sort((a, b) => b.createdAt - a.createdAt);
  },
  trashed(): JournalEntry[] {
    return this.all().filter(j => j.isDeleted).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
  },
  get(id: string): JournalEntry | undefined {
    return getMap<JournalEntry>(Keys.journals)[id];
  },
  upsert(entry: JournalEntry): void {
    const m = getMap<JournalEntry>(Keys.journals);
    m[entry.id] = entry;
    setMap(Keys.journals, m);
  },
  /** Merge from server using latest-update-wins conflict resolution. */
  merge(incoming: JournalEntry[]): void {
    const m = getMap<JournalEntry>(Keys.journals);
    for (const inc of incoming) {
      const cur = m[inc.id];
      if (!cur || inc.updatedAt >= cur.updatedAt) m[inc.id] = { ...inc, syncStatus: 'synced' };
    }
    setMap(Keys.journals, m);
  },
  remove(id: string): void {
    const m = getMap<JournalEntry>(Keys.journals);
    delete m[id];
    setMap(Keys.journals, m);
  },
  replaceAll(entries: JournalEntry[]): void {
    const m: Map<JournalEntry> = {};
    for (const e of entries) m[e.id] = e;
    setMap(Keys.journals, m);
  },
  /** Permanently delete trashed entries past the retention window. */
  purgeExpiredTrash(now = Date.now()): string[] {
    const m = getMap<JournalEntry>(Keys.journals);
    const purged: string[] = [];
    for (const id of Object.keys(m)) {
      const j = m[id];
      if (j.isDeleted && j.deletedAt && now - j.deletedAt > TRASH_RETENTION_MS) {
        delete m[id];
        purged.push(id);
      }
    }
    if (purged.length) setMap(Keys.journals, m);
    return purged;
  },
};

/* --------------------------- Sync queue ----------------------------- */

export const Queue = {
  all(): SyncQueueItem[] {
    return Object.values(getMap<SyncQueueItem>(Keys.queue)).sort((a, b) => a.createdAt - b.createdAt);
  },
  pending(): SyncQueueItem[] {
    return this.all().filter(q => q.status === 'pending' || q.status === 'failed');
  },
  upsert(item: SyncQueueItem): void {
    const m = getMap<SyncQueueItem>(Keys.queue);
    m[item.id] = item;
    setMap(Keys.queue, m);
  },
  remove(id: string): void {
    const m = getMap<SyncQueueItem>(Keys.queue);
    delete m[id];
    setMap(Keys.queue, m);
  },
  count(): number {
    return this.pending().length;
  },
};

/* ------------------ Settings / Reminders / Templates ---------------- */

export const Settings = {
  get(): AppSettings | null {
    const m = getMap<AppSettings>(Keys.settings);
    const vals = Object.values(m);
    return vals[0] ?? null;
  },
  save(s: AppSettings): void { setMap(Keys.settings, { [s.id]: s }); },
};

export const Reminders = {
  all(): Reminder[] { return Object.values(getMap<Reminder>(Keys.reminders)); },
  upsert(r: Reminder): void { const m = getMap<Reminder>(Keys.reminders); m[r.id] = r; setMap(Keys.reminders, m); },
  replaceAll(rs: Reminder[]): void { const m: Map<Reminder> = {}; for (const r of rs) m[r.id] = r; setMap(Keys.reminders, m); },
};

export const Templates = {
  all(): Template[] { return Object.values(getMap<Template>(Keys.templates)); },
  upsert(t: Template): void { const m = getMap<Template>(Keys.templates); m[t.id] = t; setMap(Keys.templates, m); },
  replaceAll(ts: Template[]): void { const m: Map<Template> = {}; for (const t of ts) m[t.id] = t; setMap(Keys.templates, m); },
};

/* ----------------------------- Meta --------------------------------- */

export const Meta = {
  get(): BackupMeta {
    return readJSON<BackupMeta>(Keys.meta, { lastBackupAt: null, lastSyncAt: null, lastRestoreAt: null });
  },
  patch(p: Partial<BackupMeta>): BackupMeta {
    const next = { ...this.get(), ...p };
    writeJSON(Keys.meta, next);
    return next;
  },
};

/* -------------------------- Statistics ------------------------------ */

export function computeStatistics(now = Date.now()): Statistics {
  const active = Journals.active();
  const moods: Record<string, number> = {};
  const tags: Record<string, number> = {};
  for (const j of active) {
    if (j.mood) moods[j.mood] = (moods[j.mood] ?? 0) + 1;
    for (const t of j.tags ?? []) tags[t] = (tags[t] ?? 0) + 1;
  }
  const stats: Statistics = {
    totalEntries: active.length,
    totalPrivate: 0,
    moods,
    tags,
    computedAt: now,
  };
  writeJSON(Keys.stats, stats);
  return stats;
}
