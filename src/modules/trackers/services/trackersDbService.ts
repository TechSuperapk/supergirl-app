/**
 * trackersDbService.ts
 *
 * All 6 trackers stored in Firestore (same cloud-synced pattern as journaling/fits).
 *
 * Collections:
 *   trackers_mood/{id}
 *   trackers_sleep/{id}
 *   trackers_habits/{id}
 *   trackers_habit_logs/{id}
 *   trackers_period/{id}
 *   trackers_health/{id}
 *   trackers_expenses/{id}
 *   trackers_milestones/{id}
 */
import {
  collection, doc, addDoc, getDocs, updateDoc,
  deleteDoc, query, where, orderBy, limit,
  setDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import {
  MoodEntry, SleepEntry, Habit, HabitLog,
  PeriodEntry, HealthEntry, ExpenseEntry, Milestone,
} from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────
const toIso = (ts: any): string => {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  return typeof ts === 'string' ? ts : new Date().toISOString();
};

const snapshotTo = <T>(snap: any, extra?: Partial<T>): T =>
  ({ id: snap.id, ...snap.data(), ...extra } as T);

// ── MOOD ──────────────────────────────────────────────────────────────────────
export async function fetchMoodEntries(userId: string, days = 90): Promise<MoodEntry[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const q = query(
    collection(db, 'trackers_mood'),
    where('userId', '==', userId),
    where('date', '>=', since.toISOString().split('T')[0]),
    orderBy('date', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => snapshotTo<MoodEntry>(d, { createdAt: toIso(d.data().createdAt) }));
}

export async function saveMoodEntry(entry: Omit<MoodEntry, 'id' | 'createdAt'>): Promise<MoodEntry> {
  // one entry per day — use userId_date as doc ID
  const docId = `${entry.userId}_${entry.date}`;
  await setDoc(doc(db, 'trackers_mood', docId), {
    ...entry,
    createdAt: serverTimestamp(),
  }, { merge: true });
  return { id: docId, ...entry, createdAt: new Date().toISOString() };
}

// ── SLEEP ─────────────────────────────────────────────────────────────────────
export async function fetchSleepEntries(userId: string, days = 30): Promise<SleepEntry[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const q = query(
    collection(db, 'trackers_sleep'),
    where('userId', '==', userId),
    where('date', '>=', since.toISOString().split('T')[0]),
    orderBy('date', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => snapshotTo<SleepEntry>(d, { createdAt: toIso(d.data().createdAt) }));
}

export async function saveSleepEntry(entry: Omit<SleepEntry, 'id' | 'createdAt'>): Promise<SleepEntry> {
  const docId = `${entry.userId}_${entry.date}`;
  await setDoc(doc(db, 'trackers_sleep', docId), {
    ...entry,
    createdAt: serverTimestamp(),
  }, { merge: true });
  return { id: docId, ...entry, createdAt: new Date().toISOString() };
}

// ── HABITS ────────────────────────────────────────────────────────────────────
export async function fetchHabits(userId: string): Promise<Habit[]> {
  const q = query(
    collection(db, 'trackers_habits'),
    where('userId', '==', userId),
    orderBy('createdAt', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => snapshotTo<Habit>(d, { createdAt: toIso(d.data().createdAt) }));
}

export async function createHabit(habit: Omit<Habit, 'id' | 'createdAt' | 'streak'>): Promise<Habit> {
  const ref = await addDoc(collection(db, 'trackers_habits'), {
    ...habit,
    streak:    0,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...habit, streak: 0, createdAt: new Date().toISOString() };
}

export async function updateHabitStreak(habitId: string, streak: number): Promise<void> {
  await updateDoc(doc(db, 'trackers_habits', habitId), { streak });
}

export async function deleteHabitById(habitId: string): Promise<void> {
  await deleteDoc(doc(db, 'trackers_habits', habitId));
}

export async function fetchHabitLogs(userId: string, days = 30): Promise<HabitLog[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const q = query(
    collection(db, 'trackers_habit_logs'),
    where('userId', '==', userId),
    where('date', '>=', since.toISOString().split('T')[0]),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => snapshotTo<HabitLog>(d));
}

export async function toggleHabitLogEntry(log: HabitLog): Promise<HabitLog> {
  const docId = `${log.userId}_${log.habitId}_${log.date}`;
  await setDoc(doc(db, 'trackers_habit_logs', docId), log, { merge: true });
  return { ...log, id: docId };
}

// ── PERIOD ────────────────────────────────────────────────────────────────────
export async function fetchPeriodEntries(userId: string): Promise<PeriodEntry[]> {
  const q = query(
    collection(db, 'trackers_period'),
    where('userId', '==', userId),
    orderBy('startDate', 'desc'),
    limit(24),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => snapshotTo<PeriodEntry>(d, { createdAt: toIso(d.data().createdAt) }));
}

export async function savePeriodEntry(entry: Omit<PeriodEntry, 'id' | 'createdAt'>): Promise<PeriodEntry> {
  const ref = await addDoc(collection(db, 'trackers_period'), {
    ...entry,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...entry, createdAt: new Date().toISOString() };
}

export async function updatePeriodEntry(id: string, updates: Partial<PeriodEntry>): Promise<void> {
  await updateDoc(doc(db, 'trackers_period', id), updates);
}

// ── HEALTH ────────────────────────────────────────────────────────────────────
export async function fetchHealthEntries(userId: string, days = 30): Promise<HealthEntry[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const q = query(
    collection(db, 'trackers_health'),
    where('userId', '==', userId),
    where('date', '>=', since.toISOString().split('T')[0]),
    orderBy('date', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => snapshotTo<HealthEntry>(d, { createdAt: toIso(d.data().createdAt) }));
}

export async function saveHealthEntry(entry: Omit<HealthEntry, 'id' | 'createdAt'>): Promise<HealthEntry> {
  const docId = `${entry.userId}_${entry.date}`;
  await setDoc(doc(db, 'trackers_health', docId), {
    ...entry,
    createdAt: serverTimestamp(),
  }, { merge: true });
  return { id: docId, ...entry, createdAt: new Date().toISOString() };
}

// ── EXPENSES ──────────────────────────────────────────────────────────────────
export async function fetchExpenseEntries(userId: string, days = 30): Promise<ExpenseEntry[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const q = query(
    collection(db, 'trackers_expenses'),
    where('userId', '==', userId),
    where('date', '>=', since.toISOString().split('T')[0]),
    orderBy('date', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => snapshotTo<ExpenseEntry>(d, { createdAt: toIso(d.data().createdAt) }));
}

export async function saveExpenseEntry(entry: Omit<ExpenseEntry, 'id' | 'createdAt'>): Promise<ExpenseEntry> {
  const ref = await addDoc(collection(db, 'trackers_expenses'), {
    ...entry,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...entry, createdAt: new Date().toISOString() };
}

export async function deleteExpenseById(id: string): Promise<void> {
  await deleteDoc(doc(db, 'trackers_expenses', id));
}

// ── MILESTONES ────────────────────────────────────────────────────────────────
export async function fetchMilestones(userId: string): Promise<Milestone[]> {
  const q = query(
    collection(db, 'trackers_milestones'),
    where('userId', '==', userId),
    orderBy('earnedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => snapshotTo<Milestone>(d));
}

export async function awardMilestone(milestone: Omit<Milestone, 'id'>): Promise<Milestone> {
  // Idempotent — same type can only be awarded once
  const docId = `${milestone.userId}_${milestone.type}`;
  await setDoc(doc(db, 'trackers_milestones', docId), milestone, { merge: true });
  return { id: docId, ...milestone };
}
