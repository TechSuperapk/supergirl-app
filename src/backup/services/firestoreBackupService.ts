/**
 * firestoreBackupService — reads/writes the per-user cloud backup.
 *
 * Firestore layout:
 *   users/{uid}/journals/{journalId}
 *   users/{uid}/settings/{settingId}
 *   users/{uid}/reminders/{reminderId}
 *   users/{uid}/templates/{templateId}
 *   users/{uid}/backups/{backupId}   (point-in-time snapshot metadata)
 */
import {
  doc, setDoc, deleteDoc, getDocs, collection, writeBatch,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadMany } from './storageUploadService';
import {
  JournalEntry, AppSettings, Reminder, Template,
} from '../types';

const col = (uid: string, name: string) => collection(db, 'users', uid, name);
const ref = (uid: string, name: string, id: string) => doc(db, 'users', uid, name, id);

/* ---------------------------- Journals ------------------------------ */

/** Upload a journal's media, then write the entry (URLs only) to Firestore. */
export async function pushJournal(uid: string, entry: JournalEntry): Promise<JournalEntry> {
  const [images, videos, audio] = await Promise.all([
    uploadMany(uid, 'images', entry.id, entry.images),
    uploadMany(uid, 'videos', entry.id, entry.videos),
    uploadMany(uid, 'audio',  entry.id, entry.audio),
  ]);
  const synced: JournalEntry = { ...entry, images, videos, audio, userId: uid, syncStatus: 'synced' };
  await setDoc(ref(uid, 'journals', entry.id), synced, { merge: true });
  return synced;
}

export async function deleteJournalRemote(uid: string, id: string): Promise<void> {
  await deleteDoc(ref(uid, 'journals', id));
}

export async function fetchJournals(uid: string): Promise<JournalEntry[]> {
  const snap = await getDocs(col(uid, 'journals'));
  return snap.docs.map(d => d.data() as JournalEntry);
}

/* ------------------ Settings / Reminders / Templates ---------------- */

export async function pushSettings(uid: string, s: AppSettings): Promise<void> {
  await setDoc(ref(uid, 'settings', s.id), { ...s, userId: uid }, { merge: true });
}
export async function fetchSettings(uid: string): Promise<AppSettings[]> {
  const snap = await getDocs(col(uid, 'settings'));
  return snap.docs.map(d => d.data() as AppSettings);
}

export async function pushReminder(uid: string, r: Reminder): Promise<void> {
  await setDoc(ref(uid, 'reminders', r.id), { ...r, userId: uid }, { merge: true });
}
export async function fetchReminders(uid: string): Promise<Reminder[]> {
  const snap = await getDocs(col(uid, 'reminders'));
  return snap.docs.map(d => d.data() as Reminder);
}

export async function pushTemplate(uid: string, t: Template): Promise<void> {
  await setDoc(ref(uid, 'templates', t.id), { ...t, userId: uid }, { merge: true });
}
export async function fetchTemplates(uid: string): Promise<Template[]> {
  const snap = await getDocs(col(uid, 'templates'));
  return snap.docs.map(d => d.data() as Template);
}

/* --------------------- Full snapshot backup ------------------------- */

/** Write a point-in-time backup record + bulk-push all journals in batches. */
export async function backupSnapshot(uid: string, journals: JournalEntry[]): Promise<string> {
  const backupId = `backup_${Date.now()}`;
  await setDoc(ref(uid, 'backups', backupId), {
    id: backupId, uid, count: journals.length, createdAt: Date.now(),
  });
  // Firestore batches are capped at 500 ops.
  for (let i = 0; i < journals.length; i += 450) {
    const batch = writeBatch(db);
    for (const j of journals.slice(i, i + 450)) {
      batch.set(ref(uid, 'journals', j.id), { ...j, userId: uid }, { merge: true });
    }
    await batch.commit();
  }
  return backupId;
}
