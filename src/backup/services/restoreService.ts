/**
 * restoreService — multi-device restore. Downloads everything from Firestore
 * and rebuilds the local MMKV database, then recomputes statistics.
 */
import {
  fetchJournals, fetchSettings, fetchReminders, fetchTemplates,
} from './firestoreBackupService';
import {
  Journals, Reminders, Templates, Settings, Meta, computeStatistics,
} from '../storage/localDb';
import { JournalEntry } from '../types';

export interface RestoreResult {
  journals: number;
  reminders: number;
  templates: number;
  settings: boolean;
  durationMs: number;
}

/**
 * Pull all cloud data for a user and write it into the local DB.
 * Existing local entries are merged with latest-update-wins so unsynced
 * local edits are never clobbered by older server copies.
 */
export async function restoreAll(uid: string): Promise<RestoreResult> {
  const start = Date.now();

  const [journals, settingsArr, reminders, templates] = await Promise.all([
    fetchJournals(uid),
    fetchSettings(uid),
    fetchReminders(uid),
    fetchTemplates(uid),
  ]);

  // Journals: merge (latest-update-wins) rather than blind overwrite.
  Journals.merge(journals.map(j => ({ ...j, syncStatus: 'synced' as const })));

  if (reminders.length) Reminders.replaceAll(reminders);
  if (templates.length) Templates.replaceAll(templates);
  if (settingsArr.length) Settings.save(settingsArr[0]);

  computeStatistics();
  Meta.patch({ lastRestoreAt: Date.now(), lastSyncAt: Date.now() });

  return {
    journals: journals.length,
    reminders: reminders.length,
    templates: templates.length,
    settings: settingsArr.length > 0,
    durationMs: Date.now() - start,
  };
}

/** Lightweight check used to decide whether to offer a restore after login. */
export async function hasCloudData(uid: string): Promise<{ count: number }> {
  const journals: JournalEntry[] = await fetchJournals(uid);
  return { count: journals.filter(j => !j.isDeleted).length };
}
