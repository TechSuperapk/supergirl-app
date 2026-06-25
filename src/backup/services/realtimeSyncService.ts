/**
 * realtimeSyncService — Firestore snapshot listeners for live multi-device sync.
 * Changes made on Device A appear on Device B: we merge into the local DB
 * (latest-update-wins) and notify subscribers so the UI refreshes instantly.
 */
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Journals, Reminders, Templates, Meta } from '../storage/localDb';
import { JournalEntry, Reminder, Template } from '../types';

type Listener = () => void;

let unsubs: Array<() => void> = [];
const subscribers = new Set<Listener>();

/** Subscribe to local-data-changed notifications (UI refresh hook). */
export function onDataChanged(fn: Listener): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
const notify = () => subscribers.forEach(fn => { try { fn(); } catch {} });

/** Start realtime listeners for a user. Call again on login; stop on logout. */
export function startRealtimeSync(uid: string): () => void {
  stopRealtimeSync();

  const jRef = query(collection(db, 'users', uid, 'journals'));
  unsubs.push(onSnapshot(jRef, (snap) => {
    const incoming: JournalEntry[] = snap.docs.map(d => d.data() as JournalEntry);
    Journals.merge(incoming);
    Meta.patch({ lastSyncAt: Date.now() });
    notify();
  }, () => { /* offline / permission errors are non-fatal */ }));

  const rRef = query(collection(db, 'users', uid, 'reminders'));
  unsubs.push(onSnapshot(rRef, (snap) => {
    const rs: Reminder[] = snap.docs.map(d => d.data() as Reminder);
    if (rs.length) Reminders.replaceAll(rs);
    notify();
  }, () => {}));

  const tRef = query(collection(db, 'users', uid, 'templates'));
  unsubs.push(onSnapshot(tRef, (snap) => {
    const ts: Template[] = snap.docs.map(d => d.data() as Template);
    if (ts.length) Templates.replaceAll(ts);
    notify();
  }, () => {}));

  return stopRealtimeSync;
}

export function stopRealtimeSync(): void {
  unsubs.forEach(u => { try { u(); } catch {} });
  unsubs = [];
}
