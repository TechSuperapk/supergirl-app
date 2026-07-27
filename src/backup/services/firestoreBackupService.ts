/**
 * firestoreBackupService — DISABLED.
 *
 * This was a secondary Firestore-based cloud backup. All app data now persists
 * to the app's own backend (MongoDB) + S3, so this redundant layer is stubbed
 * out (no Firebase dependency). The exported functions keep their signatures so
 * callers in the backup system compile and run as harmless no-ops.
 */
import {
  JournalEntry, AppSettings, Reminder, Template,
} from '../types';

export async function pushJournal(uid: string, entry: JournalEntry): Promise<JournalEntry> {
  return { ...entry, userId: uid, syncStatus: 'synced' } as JournalEntry;
}
export async function deleteJournalRemote(_uid: string, _id: string): Promise<void> { /* no-op */ }
export async function fetchJournals(_uid: string): Promise<JournalEntry[]> { return []; }

export async function pushSettings(_uid: string, _s: AppSettings): Promise<void> { /* no-op */ }
export async function fetchSettings(_uid: string): Promise<AppSettings[]> { return []; }

export async function pushReminder(_uid: string, _r: Reminder): Promise<void> { /* no-op */ }
export async function fetchReminders(_uid: string): Promise<Reminder[]> { return []; }

export async function pushTemplate(_uid: string, _t: Template): Promise<void> { /* no-op */ }
export async function fetchTemplates(_uid: string): Promise<Template[]> { return []; }

export async function backupSnapshot(_uid: string, _journals: JournalEntry[]): Promise<string> {
  return `backup_${Date.now()}`;
}
