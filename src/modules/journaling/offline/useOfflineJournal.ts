/**
 * useOfflineJournal — the single write path for journal entries.
 *
 * Every create/edit/delete goes through here:
 *   1. write to the local MMKV store (durable, offline-first)
 *   2. update Redux immediately (instant UI)
 *   3. enqueue a sync job and kick the flusher
 *
 * Online, the job reaches Firestore in the background and the realtime
 * subscription reconciles. Offline, the entry is safe locally and syncs
 * automatically when the network returns.
 */
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { addEntry, updateEntry, deleteEntry } from '../store/journalSlice';
import { JournalEntry } from '../types';
import { RichJournals, Pending } from './richJournalStore';
import { triggerFlush } from './journalSync';
import { Journals as BackupJournals } from '../../../backup/storage/localDb';
import { enqueue as enqueueBackupSync } from '../../../backup/sync/syncQueueManager';
import { useJournalStore as useBackupJournalStore } from '../../../backup/store/journalStore';
import { toBackupEntry } from '../../../backup/journalBridge';

export function useOfflineJournal() {
  const dispatch = useDispatch();
  const entries = useSelector((s: RootState) => s.journal.entries);
  const uid = useSelector((s: RootState) => s.auth.user?.id);

  // Mirrors a write into the src/backup pipeline (local MMKV + its Firestore
  // sync queue) so the Backup Settings screen's "Back up now"/"Restore
  // data"/"Sync all" and multi-device Firestore sync reflect real entries
  // instead of always operating on an empty store — see journalBridge.ts.
  // Bypasses useJournalStore's create()/update() (they mint their own id via
  // genId(), which would break the 1:1 mapping to this entry's real id) and
  // writes the lower-level Journals/enqueue primitives directly instead,
  // then nudges the Zustand store to refresh so any mounted Backup/Trash
  // screens pick up the change immediately. Never blocks the real save.
  const mirrorToBackup = useCallback((entry: JournalEntry, deleted: boolean) => {
    if (!uid) return;
    try {
      const cur = BackupJournals.get(entry.id);
      const backupEntry = toBackupEntry(uid, entry);
      BackupJournals.upsert({
        ...backupEntry,
        isDeleted: deleted || (cur?.isDeleted ?? false),
        deletedAt: deleted ? Date.now() : (cur?.deletedAt ?? null),
      });
      enqueueBackupSync('journal', entry.id, 'update');
      useBackupJournalStore.getState().refresh();
    } catch (e) {
      console.warn('Backup mirror failed (non-fatal):', e);
    }
  }, [uid]);

  /** Create or update an entry. `isNew` is auto-detected if omitted. */
  const saveEntry = useCallback((entry: JournalEntry, isNew?: boolean) => {
    const exists = entries.some(e => e.id === entry.id);
    const treatAsNew = isNew ?? !exists;
    RichJournals.upsert(entry);
    Pending.set(entry.id, 'save');
    dispatch(treatAsNew ? addEntry(entry) : updateEntry(entry));
    triggerFlush();
    mirrorToBackup(entry, false);
  }, [dispatch, entries, mirrorToBackup]);

  const removeEntry = useCallback((id: string) => {
    const entry = RichJournals.get(id) ?? entries.find(e => e.id === id);
    RichJournals.remove(id);
    Pending.set(id, 'delete');
    dispatch(deleteEntry(id));
    triggerFlush();
    // Soft-delete on the backup side (into its own Trash), matching how
    // useJournalStore.softDelete already models deletes there.
    if (entry) mirrorToBackup(entry, true);
  }, [dispatch, entries, mirrorToBackup]);

  return { saveEntry, removeEntry };
}
