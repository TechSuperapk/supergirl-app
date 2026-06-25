/**
 * journalStore (Zustand) — offline-first journal state.
 * Every mutation writes to the local DB FIRST (instant UI), then enqueues a
 * background sync job. The store is the single source the UI renders from.
 */
import { create } from 'zustand';
import { Journals, computeStatistics } from '../storage/localDb';
import { enqueue } from '../sync/syncQueueManager';
import { JournalEntry } from '../types';

export interface JournalInput {
  title?: string;
  content?: string;
  mood?: string;
  tags?: string[];
  images?: string[];
  videos?: string[];
  audio?: string[];
}

interface JournalState {
  userId: string | null;
  entries: JournalEntry[];
  trashed: JournalEntry[];
  setUser: (uid: string | null) => void;
  refresh: () => void;
  create: (input: JournalInput) => JournalEntry;
  update: (id: string, patch: Partial<JournalEntry>) => void;
  softDelete: (id: string) => void;
  restore: (id: string) => void;
  purgeExpired: () => void;
}

const genId = () => `j_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useJournalStore = create<JournalState>((set, get) => ({
  userId: null,
  entries: [],
  trashed: [],

  setUser: (uid) => { set({ userId: uid }); get().refresh(); },

  refresh: () => set({ entries: Journals.active(), trashed: Journals.trashed() }),

  create: (input) => {
    const now = Date.now();
    const entry: JournalEntry = {
      id: genId(),
      userId: get().userId ?? 'local',
      title: input.title ?? '',
      content: input.content ?? '',
      mood: input.mood ?? '',
      tags: input.tags ?? [],
      images: input.images ?? [],
      videos: input.videos ?? [],
      audio: input.audio ?? [],
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
      isDeleted: false,
      deletedAt: null,
    };
    Journals.upsert(entry);
    computeStatistics();
    get().refresh();
    enqueue('journal', entry.id, 'create');
    return entry;
  },

  update: (id, patch) => {
    const cur = Journals.get(id);
    if (!cur) return;
    const next: JournalEntry = { ...cur, ...patch, updatedAt: Date.now(), syncStatus: 'pending' };
    Journals.upsert(next);
    computeStatistics();
    get().refresh();
    enqueue('journal', id, 'update');
  },

  // Soft delete → Trash (kept 30 days), synced as an update.
  softDelete: (id) => {
    const cur = Journals.get(id);
    if (!cur) return;
    Journals.upsert({ ...cur, isDeleted: true, deletedAt: Date.now(), updatedAt: Date.now(), syncStatus: 'pending' });
    get().refresh();
    enqueue('journal', id, 'update');
  },

  restore: (id) => {
    const cur = Journals.get(id);
    if (!cur) return;
    Journals.upsert({ ...cur, isDeleted: false, deletedAt: null, updatedAt: Date.now(), syncStatus: 'pending' });
    get().refresh();
    enqueue('journal', id, 'update');
  },

  // Permanently remove trashed entries older than the retention window.
  purgeExpired: () => {
    const ids = Journals.purgeExpiredTrash();
    for (const id of ids) enqueue('journal', id, 'delete');
    if (ids.length) get().refresh();
  },
}));
