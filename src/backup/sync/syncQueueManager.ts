/**
 * syncQueueManager — the heart of offline-first sync.
 *
 * - Every local create/update/delete enqueues a job.
 * - The processor runs every 30s, and immediately whenever the network
 *   reconnects.
 * - Jobs upload media + write Firestore, then mark the entity 'synced'.
 * - Failed jobs retry up to MAX_RETRIES with their status flipped to 'failed'
 *   so the UI can surface a "Retry failed uploads" action.
 *
 * Connectivity uses expo-network (already a dependency) — no extra native module.
 */
import * as Network from 'expo-network';
import { Queue, Journals, Reminders, Templates, Settings, Meta } from '../storage/localDb';
import {
  pushJournal, deleteJournalRemote, pushReminder, pushTemplate, pushSettings,
} from '../services/firestoreBackupService';
import {
  SyncQueueItem, SyncAction, EntityType, MAX_RETRIES, QUEUE_INTERVAL_MS,
} from '../types';

let timer: ReturnType<typeof setInterval> | null = null;
let netSub: { remove: () => void } | null = null;
let running = false;
let currentUid: string | null = null;

type SyncEvent = { processing: boolean; pending: number };
const listeners = new Set<(e: SyncEvent) => void>();
export function subscribeSyncEvents(fn: (e: SyncEvent) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const emit = (processing: boolean) =>
  listeners.forEach(fn => { try { fn({ processing, pending: Queue.count() }); } catch {} });

function newId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Add (or coalesce) a job for an entity. */
export function enqueue(entityType: EntityType, entityId: string, action: SyncAction): void {
  const existing = Queue.all().find(
    q => q.entityId === entityId && q.entityType === entityType &&
         (q.status === 'pending' || q.status === 'failed'),
  );
  const now = Date.now();
  if (existing) {
    existing.action = action === 'delete' ? 'delete' : existing.action;
    existing.status = 'pending';
    existing.updatedAt = now;
    Queue.upsert(existing);
  } else {
    const item: SyncQueueItem = {
      id: newId(), entityType, entityId, action,
      status: 'pending', retries: 0, createdAt: now, updatedAt: now,
    };
    Queue.upsert(item);
  }
  emit(false);
  void processQueue(); // fire-and-forget immediate attempt
}

async function isOnline(): Promise<boolean> {
  try {
    const s = await Network.getNetworkStateAsync();
    return !!s.isConnected;
  } catch {
    return true; // assume online; the write will fail & retry if not
  }
}

async function runJob(u: string, job: SyncQueueItem): Promise<void> {
  if (job.entityType === 'journal') {
    if (job.action === 'delete') {
      await deleteJournalRemote(u, job.entityId);
      return;
    }
    const entry = Journals.get(job.entityId);
    if (!entry) return;
    const synced = await pushJournal(u, entry);
    Journals.upsert(synced); // now holds remote media URLs + synced status
    return;
  }
  if (job.entityType === 'reminder') {
    const r = Reminders.all().find(x => x.id === job.entityId);
    if (r) await pushReminder(u, r);
    return;
  }
  if (job.entityType === 'template') {
    const t = Templates.all().find(x => x.id === job.entityId);
    if (t) await pushTemplate(u, t);
    return;
  }
  if (job.entityType === 'settings') {
    const s = Settings.get();
    if (s) await pushSettings(u, s);
  }
}

/** Process all pending/failed jobs once. Safe to call concurrently (guarded). */
export async function processQueue(): Promise<void> {
  if (running || !currentUid) return;
  const u = currentUid;
  if (!(await isOnline())) return;

  running = true;
  emit(true);
  try {
    for (const job of Queue.pending()) {
      job.status = 'processing';
      job.updatedAt = Date.now();
      Queue.upsert(job);

      if (job.entityType === 'journal' && job.action !== 'delete') {
        const e = Journals.get(job.entityId);
        if (e) Journals.upsert({ ...e, syncStatus: 'syncing' });
      }

      try {
        await runJob(u, job);
        Queue.remove(job.id);
      } catch (err: any) {
        job.retries += 1;
        job.status = 'failed';
        job.lastError = err?.message ?? String(err);
        job.updatedAt = Date.now();
        Queue.upsert(job);
        if (job.entityType === 'journal' && job.action !== 'delete') {
          const e = Journals.get(job.entityId);
          if (e) Journals.upsert({ ...e, syncStatus: 'failed' });
        }
      }
    }
    Meta.patch({ lastSyncAt: Date.now() });
    if (Queue.count() === 0) Meta.patch({ lastBackupAt: Date.now() });
  } finally {
    running = false;
    emit(false);
  }
}

/** Reset retry counters on failed jobs and process again. */
export async function retryFailed(): Promise<void> {
  for (const job of Queue.all().filter(q => q.status === 'failed')) {
    job.status = 'pending';
    job.retries = 0;
    job.updatedAt = Date.now();
    Queue.upsert(job);
  }
  await processQueue();
}

/** Start the periodic processor + network listener for a user. */
export function startQueueProcessor(u: string): void {
  currentUid = u;
  stopQueueProcessor();
  timer = setInterval(() => { void processQueue(); }, QUEUE_INTERVAL_MS);
  try {
    netSub = Network.addNetworkStateListener(state => {
      if (state.isConnected) void processQueue();
    });
  } catch {
    netSub = null; // listener API unavailable; the 30s timer still covers it
  }
  void processQueue();
}

export function stopQueueProcessor(): void {
  if (timer) { clearInterval(timer); timer = null; }
  if (netSub) { try { netSub.remove(); } catch {} netSub = null; }
}
