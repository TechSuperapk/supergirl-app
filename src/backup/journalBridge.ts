/**
 * journalBridge — translates between the app's real, rich JournalEntry
 * (src/modules/journaling/types.ts: contentBlocks, scribbles, theme,
 * category, privacy, etc.) and this backup module's own simplified
 * JournalEntry shape (title/content/mood/tags/images/videos/audio).
 *
 * Why this exists: journaling writes go through Mongo (journalDbService) as
 * the primary store, and this backup pipeline (local MMKV + a Firestore
 * mirror, synced by sync/syncQueueManager.ts) used to be entirely
 * disconnected from it — nothing ever called this module's Journals.upsert,
 * so "Back up now" / "Restore data" / multi-device Firestore sync on the
 * Backup Settings screen always operated on an empty local store. Rather
 * than rewrite localDb/firestoreBackupService/restoreService/TrashScreen
 * around the richer shape (a much bigger, riskier change touching the
 * whole backup pipeline), the full rich entry is embedded as JSON in the
 * `content` field. Every other backup field (title/mood/tags/images/audio)
 * is still populated from the real entry so the existing Trash/Backup
 * screens keep showing meaningful titles/snippets/stats without any changes
 * of their own — but a restore can recover the *exact* original entry
 * (scribbles, theme, category and all) via fromBackupEntry, not just a
 * lossy title/body/mood summary.
 */
import type { JournalEntry as RichEntry } from '../modules/journaling/types';
import type { JournalEntry as BackupEntry } from './types';

function toEpoch(iso: string | undefined): number {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : Date.now();
}

/** Rich app entry -> this module's storage/sync shape. */
export function toBackupEntry(uid: string, e: RichEntry): BackupEntry {
  return {
    id: e.id,
    userId: uid,
    title: e.title || '(untitled)',
    content: JSON.stringify(e), // full fidelity payload — see fromBackupEntry
    mood: e.mood ?? '',
    tags: [...new Set([...(e.tags ?? []), ...(e.detectedHashtags ?? [])])],
    images: e.mediaUrls ?? [],
    videos: [],
    audio: e.voiceNoteUrls ?? (e.voiceNoteUrl ? [e.voiceNoteUrl] : []),
    createdAt: toEpoch(e.createdAt),
    updatedAt: toEpoch(e.updatedAt),
    syncStatus: 'pending',
    isDeleted: false,
    deletedAt: null,
  };
}

/** Recovers the original rich entry from a backup record, if it was written
 *  by toBackupEntry (has the embedded JSON in `content`). Returns null for
 *  backup records that only ever had the plain simplified fields (e.g. an
 *  older snapshot from before this bridge existed), so callers can fall
 *  back to treating it as backup-only data. */
export function fromBackupEntry(b: BackupEntry): RichEntry | null {
  if (!b.content) return null;
  try {
    const parsed = JSON.parse(b.content);
    if (parsed && typeof parsed === 'object' && typeof parsed.id === 'string' && typeof parsed.body === 'string') {
      return parsed as RichEntry;
    }
  } catch {
    // Not JSON — a plain-text backup record, not one written by this app.
  }
  return null;
}
