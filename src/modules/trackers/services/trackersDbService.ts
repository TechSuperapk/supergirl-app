/**
 * trackersDbService.ts
 *
 * Now backed by the app's own API (MongoDB) via /api/data/trackers_* instead
 * of Firestore. Exported names/signatures are unchanged so screens don't need
 * edits. `userId` params are ignored — the backend scopes by the JWT.
 *
 * Collections: trackers_mood / sleep / habits / habit_logs / period / health /
 *              expenses / milestones
 */
import { listDocs, createDoc, patchDoc, removeDoc, upsertDoc } from '../../../services/dataApi';
import {
  MoodEntry, SleepEntry, Habit, HabitLog,
  PeriodEntry, HealthEntry, ExpenseEntry, Milestone,
} from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────
const sinceDate = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};
const descBy = (field: string) => (a: any, b: any) => String(b[field] ?? '').localeCompare(String(a[field] ?? ''));
const ascBy = (field: string) => (a: any, b: any) => String(a[field] ?? '').localeCompare(String(b[field] ?? ''));

// ── MOOD ──────────────────────────────────────────────────────────────────────
export async function fetchMoodEntries(_userId: string, days = 90): Promise<MoodEntry[]> {
  const since = sinceDate(days);
  const all = await listDocs<MoodEntry>('trackers_mood');
  return all.filter(e => ((e as any).date ?? '') >= since).sort(descBy('date'));
}
export async function saveMoodEntry(entry: Omit<MoodEntry, 'id' | 'createdAt'>): Promise<MoodEntry> {
  return upsertDoc<MoodEntry>('trackers_mood', { date: (entry as any).date }, entry);
}

// ── SLEEP ─────────────────────────────────────────────────────────────────────
export async function fetchSleepEntries(_userId: string, days = 30): Promise<SleepEntry[]> {
  const since = sinceDate(days);
  const all = await listDocs<SleepEntry>('trackers_sleep');
  return all.filter(e => ((e as any).date ?? '') >= since).sort(descBy('date'));
}
export async function saveSleepEntry(entry: Omit<SleepEntry, 'id' | 'createdAt'>): Promise<SleepEntry> {
  return upsertDoc<SleepEntry>('trackers_sleep', { date: (entry as any).date }, entry);
}

// ── HABITS ────────────────────────────────────────────────────────────────────
export async function fetchHabits(_userId: string): Promise<Habit[]> {
  const all = await listDocs<Habit>('trackers_habits');
  return all.sort(ascBy('createdAt'));
}
export async function createHabit(habit: Omit<Habit, 'id' | 'createdAt' | 'streak'>): Promise<Habit> {
  return createDoc<Habit>('trackers_habits', { ...habit, streak: 0 });
}
export async function updateHabitStreak(habitId: string, streak: number): Promise<void> {
  await patchDoc('trackers_habits', habitId, { streak });
}
export async function deleteHabitById(habitId: string): Promise<void> {
  await removeDoc('trackers_habits', habitId);
}

export async function fetchHabitLogs(_userId: string, days = 30): Promise<HabitLog[]> {
  const since = sinceDate(days);
  const all = await listDocs<HabitLog>('trackers_habit_logs');
  return all.filter(e => ((e as any).date ?? '') >= since);
}
export async function toggleHabitLogEntry(log: HabitLog): Promise<HabitLog> {
  return upsertDoc<HabitLog>('trackers_habit_logs', { habitId: log.habitId, date: (log as any).date }, log);
}

// ── PERIOD ────────────────────────────────────────────────────────────────────
export async function fetchPeriodEntries(_userId: string): Promise<PeriodEntry[]> {
  const all = await listDocs<PeriodEntry>('trackers_period');
  return all.sort(descBy('startDate')).slice(0, 24);
}
export async function savePeriodEntry(entry: Omit<PeriodEntry, 'id' | 'createdAt'>): Promise<PeriodEntry> {
  return createDoc<PeriodEntry>('trackers_period', entry);
}
export async function updatePeriodEntry(id: string, updates: Partial<PeriodEntry>): Promise<void> {
  await patchDoc('trackers_period', id, updates);
}

// ── HEALTH ────────────────────────────────────────────────────────────────────
export async function fetchHealthEntries(_userId: string, days = 30): Promise<HealthEntry[]> {
  const since = sinceDate(days);
  const all = await listDocs<HealthEntry>('trackers_health');
  return all.filter(e => ((e as any).date ?? '') >= since).sort(descBy('date'));
}
export async function saveHealthEntry(entry: Omit<HealthEntry, 'id' | 'createdAt'>): Promise<HealthEntry> {
  return upsertDoc<HealthEntry>('trackers_health', { date: (entry as any).date }, entry);
}

// ── EXPENSES ──────────────────────────────────────────────────────────────────
export async function fetchExpenseEntries(_userId: string, days = 30): Promise<ExpenseEntry[]> {
  const since = sinceDate(days);
  const all = await listDocs<ExpenseEntry>('trackers_expenses');
  return all.filter(e => ((e as any).date ?? '') >= since).sort(descBy('date'));
}
export async function saveExpenseEntry(entry: Omit<ExpenseEntry, 'id' | 'createdAt'>): Promise<ExpenseEntry> {
  return createDoc<ExpenseEntry>('trackers_expenses', entry);
}
export async function deleteExpenseById(id: string): Promise<void> {
  await removeDoc('trackers_expenses', id);
}

// ── MILESTONES ────────────────────────────────────────────────────────────────
export async function fetchMilestones(_userId: string): Promise<Milestone[]> {
  const all = await listDocs<Milestone>('trackers_milestones');
  return all.sort(descBy('earnedAt'));
}
export async function awardMilestone(milestone: Omit<Milestone, 'id'>): Promise<Milestone> {
  // Idempotent — same type only once per user.
  return upsertDoc<Milestone>('trackers_milestones', { type: (milestone as any).type }, milestone);
}
