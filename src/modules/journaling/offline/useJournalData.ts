/**
 * useJournalData — manual data controls for the Backup screen:
 *   - clearLocalData(): wipe the local journals + pending queue (cloud untouched)
 *   - restoreFromCloud(): re-download all journals from Firestore into local + UI
 *
 * "Clear then restore" gives a clean way to reset the device and pull a fresh
 * copy of everything back from the cloud.
 */
import { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { loadEntries } from '../store/journalSlice';
import { clearLocalJournals, RichJournals } from './richJournalStore';
import { fetchJournalEntriesOnce } from '../services/journalDbService';

export function useJournalData() {
  const dispatch = useDispatch();
  const uid = useSelector((s: RootState) => s.auth.user?.id ?? null);
  const [clearing, setClearing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const clearLocalData = useCallback(async () => {
    setClearing(true);
    try {
      clearLocalJournals();
      dispatch(loadEntries([]));
    } finally {
      setClearing(false);
    }
  }, [dispatch]);

  const restoreFromCloud = useCallback(async (): Promise<number> => {
    if (!uid) throw new Error('You must be signed in to restore.');
    setRestoring(true);
    try {
      const entries = await fetchJournalEntriesOnce(uid);
      RichJournals.replaceAll(entries);
      dispatch(loadEntries(entries));
      return entries.length;
    } finally {
      setRestoring(false);
    }
  }, [uid, dispatch]);

  return { clearLocalData, restoreFromCloud, clearing, restoring, uid };
}
