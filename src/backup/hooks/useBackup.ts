/**
 * useBackup — React Query mutations for the Backup Settings screen:
 * Backup Now, Restore Data, Sync All, Retry Failed.
 */
import { useMutation } from '@tanstack/react-query';
import { backupSnapshot } from '../services/firestoreBackupService';
import { restoreAll, RestoreResult } from '../services/restoreService';
import { processQueue, retryFailed } from '../sync/syncQueueManager';
import { Journals, Meta } from '../storage/localDb';
import { useBackupStore } from '../store/backupStore';
import { useJournalStore } from '../store/journalStore';
import { fromBackupEntry } from '../journalBridge';
import { useOfflineJournal } from '../../modules/journaling/offline/useOfflineJournal';

export function useBackup(uid: string | null) {
  const refreshBackup   = useBackupStore(s => s.refresh);
  const setRestoring    = useBackupStore(s => s.setRestoring);
  const refreshJournals = useJournalStore(s => s.refresh);
  // Reused so a restore feeds recovered entries through the app's one real
  // write path (Redux + Mongo) instead of leaving them stranded in this
  // module's own local mirror — see the restore mutation below.
  const { saveEntry } = useOfflineJournal();

  const backupNow = useMutation<string, Error, void>({
    mutationFn: async () => {
      if (!uid) throw new Error('You must be signed in to back up.');
      const id = await backupSnapshot(uid, Journals.all());
      Meta.patch({ lastBackupAt: Date.now() });
      return id;
    },
    onSettled: refreshBackup,
  });

  const restore = useMutation<RestoreResult, Error, void>({
    mutationFn: async () => {
      if (!uid) throw new Error('You must be signed in to restore.');
      setRestoring(true);
      try {
        const result = await restoreAll(uid);
        // restoreAll() only refills this module's own local mirror (so the
        // Backup Settings screen's stats are correct). Recover any
        // full-fidelity entries journalBridge embedded and feed them
        // through the real write path too, so restoring on a fresh device
        // actually brings journals back into the app instead of just
        // populating this screen's own copy.
        for (const backupEntry of Journals.active()) {
          const rich = fromBackupEntry(backupEntry);
          if (rich) saveEntry(rich);
        }
        return result;
      } finally {
        setRestoring(false);
      }
    },
    onSettled: () => { refreshJournals(); refreshBackup(); },
  });

  const syncAll = useMutation<void, Error, void>({
    mutationFn: () => processQueue(),
    onSettled: refreshBackup,
  });

  const retry = useMutation<void, Error, void>({
    mutationFn: () => retryFailed(),
    onSettled: refreshBackup,
  });

  return { backupNow, restore, syncAll, retry };
}
