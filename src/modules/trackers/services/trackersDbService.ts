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
  IntimacyEntry, SymptomEntry, MedicationEntry, MeasurementEntry,
  WaterLogEntry, WaterSettings, BMIEntry, WeightGoalSettings, PeriodDayLog,
  MoodLog, FinanceCategory, FinanceAccount, FinanceBudget, MedicationDose,
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
export async function deleteSleepById(id: string): Promise<void> {
  await removeDoc('trackers_sleep', id);
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
/** Patch any subset of a habit's fields (used by the Add-Habit builder,
 *  pause/resume, soft-delete/restore). */
export async function updateHabitDoc(habitId: string, updates: Partial<Habit>): Promise<void> {
  await patchDoc('trackers_habits', habitId, updates);
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
export async function deletePeriodEntryById(id: string): Promise<void> {
  await removeDoc('trackers_period', id);
}

// ── PERIOD DAY LOGS ("Log Today") ─────────────────────────────────────────────
export async function fetchPeriodDayLogs(_userId: string, days = 180): Promise<PeriodDayLog[]> {
  const since = sinceDate(days);
  const all = await listDocs<PeriodDayLog>('trackers_period_day_logs');
  return all.filter(e => ((e as any).date ?? '') >= since).sort(descBy('date'));
}
export async function savePeriodDayLog(entry: Omit<PeriodDayLog, 'id' | 'createdAt'>): Promise<PeriodDayLog> {
  return upsertDoc<PeriodDayLog>('trackers_period_day_logs', { date: (entry as any).date }, entry);
}
export async function deletePeriodDayLogById(id: string): Promise<void> {
  await removeDoc('trackers_period_day_logs', id);
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

// ── MEDICATION DOSES ──────────────────────────────────────────────────────────
export async function fetchMedicationDoses(_userId: string, days = 365): Promise<MedicationDose[]> {
  const since = sinceDate(days);
  const all = await listDocs<MedicationDose>('trackers_medication_doses');
  return all.filter(d => ((d as any).date ?? '') >= since).sort(descBy('date'));
}
/** Upsert by medication + date so re-marking a day updates rather than duplicates. */
export async function saveMedicationDose(
  dose: Omit<MedicationDose, 'id' | 'createdAt'>,
): Promise<MedicationDose> {
  const { medicationId, date, ...rest } = dose;
  return upsertDoc<MedicationDose>(
    'trackers_medication_doses',
    { medicationId, date },
    rest,
  );
}
export async function deleteMedicationDoseById(id: string): Promise<void> {
  await removeDoc('trackers_medication_doses', id);
}

// ── FINANCE CATEGORIES ────────────────────────────────────────────────────────
export async function fetchFinanceCategories(_userId: string): Promise<FinanceCategory[]> {
  const all = await listDocs<FinanceCategory>('trackers_finance_categories');
  return all.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}
export async function saveFinanceCategory(cat: Omit<FinanceCategory, 'id' | 'createdAt'>): Promise<FinanceCategory> {
  return createDoc<FinanceCategory>('trackers_finance_categories', cat);
}
export async function updateFinanceCategoryDoc(id: string, updates: Partial<FinanceCategory>): Promise<void> {
  await patchDoc('trackers_finance_categories', id, updates);
}
export async function deleteFinanceCategoryById(id: string): Promise<void> {
  await removeDoc('trackers_finance_categories', id);
}

// ── FINANCE ACCOUNTS ──────────────────────────────────────────────────────────
export async function fetchFinanceAccounts(_userId: string): Promise<FinanceAccount[]> {
  return listDocs<FinanceAccount>('trackers_finance_accounts');
}
export async function saveFinanceAccount(acc: Omit<FinanceAccount, 'id' | 'createdAt'>): Promise<FinanceAccount> {
  return createDoc<FinanceAccount>('trackers_finance_accounts', acc);
}
export async function updateFinanceAccountDoc(id: string, updates: Partial<FinanceAccount>): Promise<void> {
  await patchDoc('trackers_finance_accounts', id, updates);
}
export async function deleteFinanceAccountById(id: string): Promise<void> {
  await removeDoc('trackers_finance_accounts', id);
}

// ── FINANCE BUDGETS ───────────────────────────────────────────────────────────
export async function fetchFinanceBudgets(_userId: string): Promise<FinanceBudget[]> {
  return listDocs<FinanceBudget>('trackers_finance_budgets');
}
export async function saveFinanceBudget(b: Omit<FinanceBudget, 'id' | 'createdAt'>): Promise<FinanceBudget> {
  return createDoc<FinanceBudget>('trackers_finance_budgets', b);
}
export async function updateFinanceBudgetDoc(id: string, updates: Partial<FinanceBudget>): Promise<void> {
  await patchDoc('trackers_finance_budgets', id, updates);
}
export async function deleteFinanceBudgetById(id: string): Promise<void> {
  await removeDoc('trackers_finance_budgets', id);
}

// ── MOOD LOGS (rich) ──────────────────────────────────────────────────────────
export async function fetchMoodLogs(_userId: string, days = 730): Promise<MoodLog[]> {
  const since = sinceDate(days);
  const all = await listDocs<MoodLog>('trackers_mood_logs');
  return all.filter(l => ((l as any).date ?? '') >= since).sort(descBy('date'));
}
/** Upsert by date — one mood log per day, so re-saving edits instead of duplicating. */
export async function saveMoodLog(log: Omit<MoodLog, 'id' | 'createdAt'>): Promise<MoodLog> {
  const { date, ...rest } = log;
  return upsertDoc<MoodLog>('trackers_mood_logs', { date }, rest);
}
export async function updateMoodLogDoc(id: string, updates: Partial<MoodLog>): Promise<void> {
  await patchDoc('trackers_mood_logs', id, updates);
}
export async function deleteMoodLogById(id: string): Promise<void> {
  await removeDoc('trackers_mood_logs', id);
}

// ── INTIMACY ──────────────────────────────────────────────────────────────────
export async function fetchIntimacyEntries(_userId: string, days = 365): Promise<IntimacyEntry[]> {
  const since = sinceDate(days);
  const all = await listDocs<IntimacyEntry>('trackers_intimacy');
  return all.filter(e => ((e as any).date ?? '') >= since).sort(descBy('date'));
}
export async function saveIntimacyEntry(entry: Omit<IntimacyEntry, 'id' | 'createdAt'>): Promise<IntimacyEntry> {
  return createDoc<IntimacyEntry>('trackers_intimacy', entry);
}
export async function updateIntimacyDoc(id: string, updates: Partial<IntimacyEntry>): Promise<void> {
  await patchDoc('trackers_intimacy', id, updates);
}
export async function deleteIntimacyById(id: string): Promise<void> {
  await removeDoc('trackers_intimacy', id);
}

// ── SICKNESS — SYMPTOMS ───────────────────────────────────────────────────────
export async function fetchSymptomEntries(_userId: string, days = 180): Promise<SymptomEntry[]> {
  const since = sinceDate(days);
  const all = await listDocs<SymptomEntry>('trackers_sickness_symptoms');
  return all.filter(e => ((e as any).date ?? '') >= since).sort(descBy('date'));
}
export async function saveSymptomEntry(entry: Omit<SymptomEntry, 'id' | 'createdAt'>): Promise<SymptomEntry> {
  return createDoc<SymptomEntry>('trackers_sickness_symptoms', entry);
}
export async function updateSymptomDoc(id: string, updates: Partial<SymptomEntry>): Promise<void> {
  await patchDoc('trackers_sickness_symptoms', id, updates);
}
export async function deleteSymptomById(id: string): Promise<void> {
  await removeDoc('trackers_sickness_symptoms', id);
}

// ── SICKNESS — MEDICATIONS ────────────────────────────────────────────────────
export async function fetchMedicationEntries(_userId: string, days = 180): Promise<MedicationEntry[]> {
  const since = sinceDate(days);
  const all = await listDocs<MedicationEntry>('trackers_sickness_medications');
  return all.filter(e => ((e as any).date ?? '') >= since).sort(descBy('date'));
}
export async function saveMedicationEntry(entry: Omit<MedicationEntry, 'id' | 'createdAt'>): Promise<MedicationEntry> {
  return createDoc<MedicationEntry>('trackers_sickness_medications', entry);
}
export async function updateMedicationDoc(id: string, updates: Partial<MedicationEntry>): Promise<void> {
  await patchDoc('trackers_sickness_medications', id, updates);
}
export async function deleteMedicationById(id: string): Promise<void> {
  await removeDoc('trackers_sickness_medications', id);
}

// ── MEASUREMENTS ──────────────────────────────────────────────────────────────
export async function fetchMeasurementEntries(_userId: string): Promise<MeasurementEntry[]> {
  const all = await listDocs<MeasurementEntry>('trackers_measurements');
  return all.sort(descBy('date'));
}
export async function saveMeasurementEntry(entry: Omit<MeasurementEntry, 'id' | 'createdAt'>): Promise<MeasurementEntry> {
  return upsertDoc<MeasurementEntry>('trackers_measurements', { date: (entry as any).date }, entry);
}
export async function updateMeasurementDoc(id: string, updates: Partial<MeasurementEntry>): Promise<void> {
  await patchDoc('trackers_measurements', id, updates);
}
export async function deleteMeasurementById(id: string): Promise<void> {
  await removeDoc('trackers_measurements', id);
}

// ── WATER ─────────────────────────────────────────────────────────────────────
export async function fetchWaterLogs(_userId: string, days = 60): Promise<WaterLogEntry[]> {
  const since = sinceDate(days);
  const all = await listDocs<WaterLogEntry>('trackers_water_logs');
  return all.filter(e => ((e as any).date ?? '') >= since).sort(descBy('date'));
}
export async function saveWaterLog(entry: Omit<WaterLogEntry, 'id' | 'createdAt'>): Promise<WaterLogEntry> {
  return createDoc<WaterLogEntry>('trackers_water_logs', entry);
}
export async function updateWaterLogDoc(id: string, updates: Partial<WaterLogEntry>): Promise<void> {
  await patchDoc('trackers_water_logs', id, updates);
}
export async function deleteWaterLogById(id: string): Promise<void> {
  await removeDoc('trackers_water_logs', id);
}

export async function fetchWaterSettings(_userId: string): Promise<WaterSettings | null> {
  const all = await listDocs<WaterSettings>('trackers_water_settings');
  return all[0] ?? null;
}
export async function saveWaterSettings(settings: Omit<WaterSettings, 'id' | 'updatedAt'>): Promise<WaterSettings> {
  return upsertDoc<WaterSettings>('trackers_water_settings', { kind: 'goal' }, { ...settings, updatedAt: new Date().toISOString() });
}

// ── BMI ───────────────────────────────────────────────────────────────────────
export async function fetchBMIEntries(_userId: string): Promise<BMIEntry[]> {
  const all = await listDocs<BMIEntry>('trackers_bmi');
  return all.sort(descBy('date'));
}
/**
 * Each measurement is its own record.
 *
 * This used to upsert on `{ date }`, which silently capped you at one weigh-in
 * per day: a second measurement returned the *same* document id, so the list
 * showed duplicate rows that all pointed at one record. Editing an existing
 * record goes through updateBMIDoc, so nothing needs the upsert behaviour.
 */
export async function saveBMIEntry(entry: Omit<BMIEntry, 'id' | 'createdAt'>): Promise<BMIEntry> {
  return createDoc<BMIEntry>('trackers_bmi', entry);
}
export async function updateBMIDoc(id: string, updates: Partial<BMIEntry>): Promise<void> {
  await patchDoc('trackers_bmi', id, updates);
}
export async function deleteBMIById(id: string): Promise<void> {
  await removeDoc('trackers_bmi', id);
}

export async function fetchWeightGoal(_userId: string): Promise<WeightGoalSettings | null> {
  const all = await listDocs<WeightGoalSettings>('trackers_weight_goal');
  return all[0] ?? null;
}
/**
 * Upserts the single goal/profile doc. Only the fields passed in are written,
 * so setting a goal doesn't clobber dob/sex and vice versa.
 */
export async function saveWeightGoal(
  patch: Partial<Pick<WeightGoalSettings,
    'targetWeightKg' | 'goalType' | 'targetDate' | 'dob' | 'sex'>>,
): Promise<WeightGoalSettings> {
  return upsertDoc<WeightGoalSettings>(
    'trackers_weight_goal',
    { kind: 'goal' },
    { ...patch, updatedAt: new Date().toISOString() },
  );
}
