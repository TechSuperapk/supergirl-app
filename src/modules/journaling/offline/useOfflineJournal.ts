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

export function useOfflineJournal() {
  const dispatch = useDispatch();
  const entries = useSelector((s: RootState) => s.journal.entries);

  /** Create or update an entry. `isNew` is auto-detected if omitted. */
  const saveEntry = useCallback((entry: JournalEntry, isNew?: boolean) => {
    const exists = entries.some(e => e.id === entry.id);
    const treatAsNew = isNew ?? !exists;
    RichJournals.upsert(entry);
    Pending.set(entry.id, 'save');
    dispatch(treatAsNew ? addEntry(entry) : updateEntry(entry));
    triggerFlush();
  }, [dispatch, entries]);

  const removeEntry = useCallback((id: string) => {
    RichJournals.remove(id);
    Pending.set(id, 'delete');
    dispatch(deleteEntry(id));
    triggerFlush();
  }, [dispatch]);

  return { saveEntry, removeEntry };
}
