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

export function useBackup(uid: string | null) {
  const refreshBackup   = useBackupStore(s => s.refresh);
  const setRestoring    = useBackupStore(s => s.setRestoring);
  const refreshJournals = useJournalStore(s => s.refresh);

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
        return await restoreAll(uid);
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
