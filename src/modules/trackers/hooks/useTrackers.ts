import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector }         from 'react-redux';
import { RootState }                        from '../../../store';
import {
  setMood, addMoodEntry,
  setSleep, upsertSleepEntry, deleteSleepEntry,
  setHabits, addHabit, updateHabit, deleteHabit, setHabitLogs, toggleHabitLog,
  setPeriod, addPeriodEntry, updatePeriodEntryLocal, deletePeriodEntry,
  setHealth, addHealthEntry,
  setExpenses, addExpenseEntry, deleteExpenseEntry,
  setMilestones, earnMilestone,
  setIntimacy, addIntimacyEntry, updateIntimacyEntry, deleteIntimacyEntry,
  setSymptoms, addSymptomEntry, updateSymptomEntry, deleteSymptomEntry,
  setMedications, addMedicationEntry, updateMedicationEntry, deleteMedicationEntry,
  setMeasurements, addMeasurementEntry, updateMeasurementEntry, deleteMeasurementEntry,
  setWaterLogs, addWaterLog, updateWaterLog, deleteWaterLog, setWaterSettings,
  setBMIEntries, addBMIEntry, updateBMIEntry, deleteBMIEntry, setWeightGoal,
  setPeriodDayLogs, upsertPeriodDayLog, deletePeriodDayLog,
} from '../store/trackersSlice';
import {
  fetchMoodEntries, saveMoodEntry,
  fetchSleepEntries, saveSleepEntry, deleteSleepById,
  fetchHabits, createHabit, updateHabitStreak, deleteHabitById, fetchHabitLogs, toggleHabitLogEntry,
  fetchPeriodEntries, savePeriodEntry, updatePeriodEntry, deletePeriodEntryById,
  fetchPeriodDayLogs, savePeriodDayLog, deletePeriodDayLogById,
  fetchHealthEntries, saveHealthEntry,
  fetchExpenseEntries, saveExpenseEntry, deleteExpenseById,
  fetchMilestones, awardMilestone,
  fetchIntimacyEntries, saveIntimacyEntry, updateIntimacyDoc, deleteIntimacyById,
  fetchSymptomEntries, saveSymptomEntry, updateSymptomDoc, deleteSymptomById,
  fetchMedicationEntries, saveMedicationEntry, updateMedicationDoc, deleteMedicationById,
  fetchMeasurementEntries, saveMeasurementEntry, updateMeasurementDoc, deleteMeasurementById,
  fetchWaterLogs, saveWaterLog, updateWaterLogDoc, deleteWaterLogById, fetchWaterSettings, saveWaterSettings,
  fetchBMIEntries, saveBMIEntry, updateBMIDoc, deleteBMIById, fetchWeightGoal, saveWeightGoal,
} from '../services/trackersDbService';
import { generateWeeklyInsights, predictNextPeriod, checkMilestones } from '../services/aiInsightsService';
import { sleepDashboard } from '../utils/sleepAnalytics';
import * as P from '../utils/periodAnalytics';
import * as I from '../utils/intimacyAnalytics';
import * as Sick from '../utils/sicknessAnalytics';
import {
  goalFraction, goalPercentage, nextReminder, toISO as waterToISO,
  totalsByDate as waterTotalsByDate, waterDashboard,
} from '../utils/waterAnalytics';
import {
  MoodEntry, SleepEntry, Habit, HabitLog,
  PeriodEntry, HealthEntry, ExpenseEntry, MoodLevel, FlowLevel, ExpenseCategory,
  IntimacyEntry, IntimacyWho, ProtectionStatus, IntimacyFeeling, IntimacyMoodAfter, IntimacyPeriod,
  SymptomEntry, MedicationEntry, SicknessSeverity, SicknessFeeling,
  MedicationFoodTiming, MedicationStatus,
  MeasurementEntry, MeasurementField,
  WaterLogEntry, WaterPeriod, WaterReminderFrequency, WaterAchievement,
  BMIEntry, BMICategory, BMIPeriod, WeightGoalType, PeriodDayLog, PeriodMood, MEASUREMENT_FIELDS,
} from '../types';

const todayISO = () => new Date().toISOString().split('T')[0];

// ── Mood hook ─────────────────────────────────────────────────────────────────
export function useMoodTracker() {
  const dispatch = useDispatch();
  const user     = useSelector((s: RootState) => s.auth.user);
  const entries  = useSelector((s: RootState) => s.trackers.mood);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchMoodEntries(user.id)
      .then(es => dispatch(setMood(es)))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const logMood = async (
    mood: MoodLevel,
    emoji: string,
    energy: MoodLevel,
    notes?: string,
  ) => {
    if (!user) return;
    const date  = new Date().toISOString().split('T')[0];
    const entry = await saveMoodEntry({ userId: user.id, date, mood, emoji, energy, notes });
    dispatch(addMoodEntry(entry));
    return entry;
  };

  const todayEntry = entries.find(e => e.date === new Date().toISOString().split('T')[0]);
  const last7      = entries.slice(0, 7);
  const avgMood    = last7.length
    ? (last7.reduce((s, e) => s + e.mood, 0) / last7.length).toFixed(1)
    : null;

  return { entries, loading, logMood, todayEntry, avgMood };
}

// ── Sleep hook ────────────────────────────────────────────────────────────────
export function useSleepTracker() {
  const dispatch = useDispatch();
  const user     = useSelector((s: RootState) => s.auth.user);
  const entries  = useSelector((s: RootState) => s.trackers.sleep);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    // A full year plus change, because the History screen's Year tab rolls up
    // twelve months (§13.3) — the 30-day default would leave it near-empty.
    const es = await fetchSleepEntries(user.id, 400);
    dispatch(setSleep(es));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    // Swallow the failure into state — the screens render regardless, so a
    // slow/unreachable API can never leave them stuck on a spinner.
    load()
      .catch(() => { if (!cancelled) setError('Could not load sleep data. Pull to refresh.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try { await load(); }
    catch { setError('Could not load sleep data. Pull to refresh.'); }
    finally { setRefreshing(false); }
  }, [load]);

  const logSleep = async (
    date:     string,
    bedtime:  string,
    wakeTime: string,
    quality:  MoodLevel,
    notes?:   string,
  ) => {
    if (!user) return;
    const bedMs   = new Date(bedtime).getTime();
    const wakeMs  = new Date(wakeTime).getTime();
    const durMins = Math.round(Math.abs(wakeMs - bedMs) / 60000);
    const entry   = await saveSleepEntry({
      userId: user.id, date, bedtime, wakeTime, durationMins: durMins, quality, notes,
    });
    dispatch(upsertSleepEntry(entry));
    return entry;
  };

  /** The night already logged for a date, if any — drives §29 duplicate handling. */
  const entryForDate = (date: string) => entries.find(e => e.date === date) ?? null;

  const removeSleepEntry = async (id: string) => {
    await deleteSleepById(id);
    dispatch(deleteSleepEntry(id));
  };

  /**
   * Every figure comes from `sleepAnalytics` (§35) rather than being computed
   * here, so Sleep Home, Sleep History and any future consumer can't drift
   * apart on what "this week" or "a streak" means.
   */
  const dashboard = useMemo(() => sleepDashboard(entries), [entries]);

  const avgHours = dashboard.averageSleepMinutes
    ? (dashboard.averageSleepMinutes / 60).toFixed(1)
    : null;

  return {
    entries, loading, refreshing, refresh, error,
    logSleep, removeSleepEntry, entryForDate,
    avgHours, dashboard,
  };
}

// ── Habits hook ───────────────────────────────────────────────────────────────
export function useHabitTracker() {
  const dispatch  = useDispatch();
  const user      = useSelector((s: RootState) => s.auth.user);
  const allHabits = useSelector((s: RootState) => s.trackers.habits);
  const habitLogs = useSelector((s: RootState) => s.trackers.habitLogs);
  const [loading,  setLoading]  = useState(false);

  // Hide soft-deleted habits from active views (History reads the store directly).
  const habits = allHabits.filter(h => h.status !== 'deleted');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchHabits(user.id), fetchHabitLogs(user.id)])
      .then(([hs, ls]) => {
        dispatch(setHabits(hs));
        dispatch(setHabitLogs(ls));
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const addNewHabit = async (
    name: string, icon: string, color: string,
    frequency: Habit['frequency'] = 'daily',
  ) => {
    if (!user) return;
    const habit = await createHabit({ userId: user.id, name, icon, color, frequency });
    dispatch(addHabit(habit));
    return habit;
  };

  const removeHabit = async (habitId: string) => {
    await deleteHabitById(habitId);
    dispatch(deleteHabit(habitId));
  };

  const toggle = async (habitId: string, date: string) => {
    if (!user) return;
    const existing  = habitLogs.find(l => l.habitId === habitId && l.date === date);
    const completed = existing ? !existing.completed : true;
    const log: HabitLog = {
      id:        `${user.id}_${habitId}_${date}`,
      habitId,
      userId:    user.id,
      date,
      completed,
    };
    dispatch(toggleHabitLog(log));                       // optimistic
    await toggleHabitLogEntry(log);

    // Recalculate streak
    const allLogs   = [...habitLogs.filter(l => l.habitId !== habitId || l.date !== date), log];
    const streak    = computeStreak(habitId, allLogs);
    await updateHabitStreak(habitId, streak);
    dispatch(updateHabit({ ...habits.find(h => h.id === habitId)!, streak }));
  };

  const isCompleted = (habitId: string, date: string) =>
    habitLogs.some(l => l.habitId === habitId && l.date === date && l.completed);

  /** Current {progress, target, completed} for a habit on a date. */
  const getProgress = (habitId: string, date: string, target = 1) => {
    const l = habitLogs.find(x => x.habitId === habitId && x.date === date);
    const t = l?.target ?? target;
    const progress = l?.progress ?? (l?.completed ? t : 0);
    return { progress, target: t, completed: !!l?.completed };
  };

  /** Tap a habit → +1 toward its daily target. Completes at target, updates
   *  streak, and persists (optimistic). Returns the new state so the UI can
   *  fire a completion animation. */
  const logProgress = async (habitId: string, date: string, target = 1) => {
    if (!user) return { progress: 0, target, completed: false, justCompleted: false };
    const cur = getProgress(habitId, date, target);
    const wasCompleted = cur.completed;
    const progress = Math.min(target, cur.progress + 1);
    const completed = progress >= target;
    const log: HabitLog = {
      id: `${user.id}_${habitId}_${date}`,
      habitId, userId: user.id, date, progress, target, completed,
    };
    dispatch(toggleHabitLog(log));            // optimistic
    await toggleHabitLogEntry(log);

    const allLogs = [...habitLogs.filter(l => l.habitId !== habitId || l.date !== date), log];
    const streak  = computeStreak(habitId, allLogs);
    await updateHabitStreak(habitId, streak);
    const h = habits.find(x => x.id === habitId);
    if (h) dispatch(updateHabit({ ...h, streak }));

    return { progress, target, completed, justCompleted: completed && !wasCompleted };
  };

  /** Reset today's progress (undo). */
  const resetProgress = async (habitId: string, date: string) => {
    if (!user) return;
    const log: HabitLog = {
      id: `${user.id}_${habitId}_${date}`,
      habitId, userId: user.id, date, progress: 0, target: getProgress(habitId, date).target, completed: false,
    };
    dispatch(toggleHabitLog(log));
    await toggleHabitLogEntry(log);
    const h = habits.find(x => x.id === habitId);
    if (h) {
      const allLogs = [...habitLogs.filter(l => l.habitId !== habitId || l.date !== date), log];
      dispatch(updateHabit({ ...h, streak: computeStreak(habitId, allLogs) }));
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCompleted = habits.filter(h => isCompleted(h.id, todayStr)).length;

  return {
    habits, habitLogs, loading, addNewHabit, removeHabit,
    toggle, isCompleted, getProgress, logProgress, resetProgress, todayCompleted,
  };
}

function computeStreak(habitId: string, logs: HabitLog[]): number {
  const completed = logs
    .filter(l => l.habitId === habitId && l.completed)
    .map(l => l.date)
    .sort()
    .reverse();
  let streak = 0;
  const check = new Date();
  for (const date of completed) {
    const d = check.toISOString().split('T')[0];
    if (date === d) { streak++; check.setDate(check.getDate() - 1); }
    else break;
  }
  return streak;
}

// ── Period hook ───────────────────────────────────────────────────────────────
export function usePeriodTracker() {
  const dispatch  = useDispatch();
  const user      = useSelector((s: RootState) => s.auth.user);
  const entries   = useSelector((s: RootState) => s.trackers.period);
  const dayLogs   = useSelector((s: RootState) => s.trackers.periodDayLogs);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [es, ls] = await Promise.all([fetchPeriodEntries(user.id), fetchPeriodDayLogs(user.id)]);
    dispatch(setPeriod(es));
    dispatch(setPeriodDayLogs(ls));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    // Swallow the failure into state — screens render regardless, so a slow or
    // unreachable API can never leave them stuck on a spinner.
    load()
      .catch(() => { if (!cancelled) setError('Could not load cycle data. Pull to refresh.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try { await load(); }
    catch { setError('Could not load cycle data. Pull to refresh.'); }
    finally { setRefreshing(false); }
  }, [load]);

  const startPeriod = async (flow: FlowLevel, symptoms: string[], notes?: string) => {
    if (!user) return;
    const entry = await savePeriodEntry({
      userId: user.id,
      startDate: todayISO(),
      flow, symptoms, notes,
    });
    dispatch(addPeriodEntry(entry));
    return entry;
  };

  const endPeriod = async (entryId: string) => {
    const endDate = todayISO();
    await updatePeriodEntry(entryId, { endDate });
    dispatch(setPeriod(entries.map(e => e.id === entryId ? { ...e, endDate } : e)));
  };

  /**
   * Save one day's log.
   *
   * Deliberately does *not* start a cycle on its own. A period start date moves
   * every prediction on every screen, so it's an explicit decision the user
   * confirms ("Is this the start of your period?") rather than a side effect of
   * ticking a flow level. Ending a period is inferred, because trailing "no
   * flow" days are unambiguous.
   */
  const logToday = async (data: {
    date?: string; flow: FlowLevel; symptoms: string[]; mood?: PeriodMood;
    medicationTaken?: boolean; temperature?: number; temperatureUnit?: 'C' | 'F'; notes?: string;
  }) => {
    if (!user) return;
    const date = data.date ?? todayISO();
    const entry = await savePeriodDayLog({ userId: user.id, ...data, date });
    dispatch(upsertPeriodDayLog(entry));

    const active = entries.find(e => !e.endDate);
    if (data.flow === 'none' && active && date > active.startDate) {
      const yesterday = new Date(date + 'T00:00:00'); yesterday.setDate(yesterday.getDate() - 1);
      const yISO = yesterday.toISOString().split('T')[0];
      const yLog = dayLogs.find(l => l.date === yISO);
      if (!yLog || yLog.flow === 'none') await endPeriod(active.id);
    }
    return entry;
  };

  /**
   * Mark `date` as the first day of a new cycle. Everything downstream — cycle
   * day, phase, ovulation, fertile window, next-period estimate, calendar,
   * insights — is derived from the entry list, so recording it here is enough
   * to update every screen at once.
   */
  const setCycleStart = async (date: string, flow: FlowLevel = 'medium', symptoms: string[] = []) => {
    if (!user) return;
    const created = await savePeriodEntry({ userId: user.id, startDate: date, flow, symptoms });
    dispatch(addPeriodEntry(created));
    return created;
  };

  /** Edit an existing cycle's dates, configuration, symptoms or notes (§3.4). */
  const updateCycle = async (id: string, updates: {
    startDate?: string; endDate?: string | null;
    cycleLength?: number; periodLength?: number;
    symptoms?: string[]; notes?: string;
  }) => {
    const patch: Partial<PeriodEntry> = {};
    if (updates.startDate) patch.startDate = updates.startDate;
    if ('endDate' in updates) patch.endDate = updates.endDate ?? undefined;
    if (updates.cycleLength != null) patch.cycleLength = updates.cycleLength;
    if (updates.periodLength != null) patch.periodLength = updates.periodLength;
    if (updates.symptoms) patch.symptoms = updates.symptoms;
    if ('notes' in updates) patch.notes = updates.notes;
    await updatePeriodEntry(id, patch);
    const existing = entries.find(e => e.id === id);
    if (existing) dispatch(updatePeriodEntryLocal({ ...existing, ...patch }));
  };

  /** Delete a cycle. Day logs are kept — they're separate records. */
  const removeCycle = async (id: string) => {
    await deletePeriodEntryById(id);
    dispatch(deletePeriodEntry(id));
  };

  /**
   * Reset the active cycle's configuration (§3.4).
   *
   * Clears the user-set cycle and period lengths so predictions fall back to
   * measured history, and keeps the cycle record and every daily log. That's
   * the spec's recommended behaviour, and the safer default: someone reaching
   * for "reset" wants their settings undone, not months of health records
   * destroyed. Deleting the cycle itself is a separate, explicit action.
   */
  const resetCycle = async (id: string) => {
    const patch: Partial<PeriodEntry> = { cycleLength: undefined, periodLength: undefined };
    await updatePeriodEntry(id, patch);
    const existing = entries.find(e => e.id === id);
    if (existing) {
      const next = { ...existing };
      delete next.cycleLength;
      delete next.periodLength;
      dispatch(updatePeriodEntryLocal(next));
    }
  };

  const removeDayLog = async (id: string) => {
    await deletePeriodDayLogById(id);
    dispatch(deletePeriodDayLog(id));
  };

  // ── Derived cycle figures ──
  // All of it from `periodAnalytics` (§14 step 3), so the calculations are
  // covered by tests and every screen reads the same numbers.
  const prediction = P.predict(entries);
  const activePeriod = entries.find(e => !e.endDate);

  const sortedEntries = P.sortCycles(entries);
  const lastStart = sortedEntries[0]?.startDate ?? null;
  const today = P.todayISO();
  const currentCycleDay = P.cycleDayOn(entries, today);

  const avgPeriodLengthDays = P.averagePeriodLength(entries);
  const ovulationDate = P.ovulationDate(entries);
  const fertileWindow = P.fertileWindow(entries);
  const phase = activePeriod ? 'menstrual' as const : P.phaseOn(entries, today);

  const cycleLengths = P.measuredCycleLengths(entries);
  const cycleRegularityPct = P.cycleRegularity(entries);

  /**
   * Cycle-length trend, oldest → newest.
   *
   * Labelled with the month the cycle *began* rather than "C1, C2…" — a
   * sequence number tells you nothing about when a long cycle happened, which
   * is the whole point of looking at the trend. cycleLengths[i] is the gap
   * between sortedEntries[i] and sortedEntries[i+1] (newest-first), so the
   * cycle started at sortedEntries[i + 1].
   */
  const cycleHistory = P.cycleHistory(entries);
  const shortestCycle = P.shortestCycle(entries);
  const longestCycle = P.longestCycle(entries);
  const predictionAccuracyPct = P.predictionAccuracy(entries);

  const streak = P.loggingStreak(dayLogs);

  /**
   * Insight window (§3.3). Six months by default; the Insights screen can ask
   * for another range and everything below recomputes from it.
   */
  const [insightRange, setInsightRange] = useState<P.InsightRange>('6m');
  const rangeFrom = P.rangeStart(insightRange);
  const logsInRange = dayLogs.filter(l => l.date >= rangeFrom);
  const entriesInRange = entries.filter(e => e.startDate >= rangeFrom);

  /**
   * Symptom prevalence — days with the symptom over days tracked (§5).
   *
   * Only day logs feed this. A cycle entry's symptoms describe a whole period
   * rather than one day, so counting both double-counts anything recorded in
   * each and there'd be no honest denominator for the cycle-level ones.
   */
  const symptomInsights = P.symptomStats(logsInRange);
  const moodInsights = P.moodStats(logsInRange);

  /** Today's log, if one exists — drives the Log-vs-Edit CTA on the dashboard. */
  const todayLog = dayLogs.find(l => l.date === todayISO()) ?? null;
  /** Look up a specific day's log (calendar taps, day-detail screen). */
  const dayLogFor = (date: string) => dayLogs.find(l => l.date === date) ?? null;

  // ── Shared date helpers ──
  const shift = (dateISO: string, n: number) => {
    const d = new Date(dateISO + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  };

  /** Has the user recorded any cycle at all? Gates every statistic and estimate. */
  const hasHistory = entries.length > 0;

  /** The cycle currently running (or the most recent one) as a date range. */
  const currentCycle = sortedEntries[0] ?? null;
  const currentPeriodRange = currentCycle
    ? {
        start: currentCycle.startDate,
        end: currentCycle.endDate ?? null,
        days: currentCycle.endDate
          ? Math.round(
              (new Date(currentCycle.endDate + 'T00:00:00').getTime()
                - new Date(currentCycle.startDate + 'T00:00:00').getTime()) / 86400000) + 1
          : null,
      }
    : null;

  const avgCycleLength = cycleLengths.length
    ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
    : null;

  /**
   * Dates the *next* period is estimated to cover — start plus the average
   * period length. Rendered distinctly from logged days on the calendar so an
   * estimate is never mistaken for something the user recorded.
   */
  const predictedPeriodDays = P.predictedPeriodDays(entries);
  const loggedPeriodDays = P.loggedPeriodDays(entries);

  /** Which phase a given date falls in, for the calendar and day detail. */
  const phaseFor = (date: string) => P.phaseOn(entries, date);

  /** The configuration Edit Cycle shows, and what it's based on (§3.4). */
  const cycleConfig = {
    cycle: P.effectiveCycleLength(entries),
    period: P.effectivePeriodLength(entries),
  };

  const totalMoodLogs = moodInsights.reduce((sum, m) => sum + m.count, 0);

  return {
    entries, dayLogs, loading, refreshing, refresh, error,
    startPeriod, endPeriod, logToday, removeDayLog,
    setCycleStart, updateCycle, removeCycle, resetCycle,
    prediction, activePeriod, currentCycle, currentPeriodRange,
    currentCycleDay, phase, phaseFor, hasHistory, cycleConfig,
    avgPeriodLengthDays, avgCycleLength, ovulationDate, fertileWindow,
    predictedPeriodDays, loggedPeriodDays,
    cycleRegularityPct, cycleHistory, streak, symptomInsights,
    insightRange, setInsightRange,
    /** Count of *completed* cycles — cycleHistory may carry an extra
     *  in-progress point, so it isn't a safe stand-in for this. */
    measuredCycles: cycleLengths.length,
    entriesInRange,
    shortestCycle, longestCycle, predictionAccuracyPct,
    moodInsights, totalMoodLogs, todayLog, dayLogFor,
  };
}

// ── Health hook ───────────────────────────────────────────────────────────────
export function useHealthTracker() {
  const dispatch = useDispatch();
  const user     = useSelector((s: RootState) => s.auth.user);
  const entries  = useSelector((s: RootState) => s.trackers.health);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchHealthEntries(user.id)
      .then(es => dispatch(setHealth(es)))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const logHealth = async (data: Partial<Pick<HealthEntry, 'weight' | 'steps' | 'waterMl' | 'calories' | 'notes'>>) => {
    if (!user) return;
    const date  = new Date().toISOString().split('T')[0];
    const entry = await saveHealthEntry({ userId: user.id, date, ...data });
    dispatch(addHealthEntry(entry));
    return entry;
  };

  const todayEntry = entries.find(e => e.date === new Date().toISOString().split('T')[0]);
  const avgSteps   = entries.slice(0, 7).filter(e => e.steps).length
    ? Math.round(entries.slice(0, 7).filter(e => e.steps).reduce((s, e) => s + (e.steps ?? 0), 0) /
        entries.slice(0, 7).filter(e => e.steps).length)
    : null;

  return { entries, loading, logHealth, todayEntry, avgSteps };
}

// ── Expense hook ──────────────────────────────────────────────────────────────
export function useExpenseTracker() {
  const dispatch  = useDispatch();
  const user      = useSelector((s: RootState) => s.auth.user);
  const expenses  = useSelector((s: RootState) => s.trackers.expenses);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchExpenseEntries(user.id)
      .then(es => dispatch(setExpenses(es)))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const addExpense = async (
    amount: number,
    category: ExpenseCategory,
    note?: string,
    date?: string,
  ) => {
    if (!user) return;
    const entry = await saveExpenseEntry({
      userId:   user.id,
      date:     date ?? new Date().toISOString().split('T')[0],
      amount,
      currency: 'INR',
      category,
      note,
    });
    dispatch(addExpenseEntry(entry));
    return entry;
  };

  const removeExpense = async (id: string) => {
    await deleteExpenseById(id);
    dispatch(deleteExpenseEntry(id));
  };

  // Aggregations
  const totalMonth = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = expenses.reduce((acc: Record<string, number>, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { expenses, loading, addExpense, removeExpense, totalMonth, byCategory, topCategory };
}

// ── Milestones hook ───────────────────────────────────────────────────────────
export function useMilestones() {
  const dispatch    = useDispatch();
  const user        = useSelector((s: RootState) => s.auth.user);
  const milestones  = useSelector((s: RootState) => s.trackers.milestones);
  const habitLogs   = useSelector((s: RootState) => s.trackers.habitLogs);
  const habits      = useSelector((s: RootState) => s.trackers.habits);
  const mood        = useSelector((s: RootState) => s.trackers.mood);
  const sleep       = useSelector((s: RootState) => s.trackers.sleep);

  useEffect(() => {
    if (!user) return;
    fetchMilestones(user.id).then(ms => dispatch(setMilestones(ms)));
  }, [user?.id]);

  const checkAndAward = useCallback(async () => {
    if (!user) return;
    const existingTypes = milestones.map(m => m.type);
    const newOnes       = checkMilestones(habitLogs, habits, mood, sleep, existingTypes);
    for (const m of newOnes) {
      const awarded = await awardMilestone({
        userId: user.id, ...m, earnedAt: new Date().toISOString(),
      });
      dispatch(earnMilestone(awarded));
    }
    return newOnes;
  }, [user?.id, milestones, habitLogs, habits, mood, sleep]);

  return { milestones, checkAndAward };
}

// ── Insights hook ─────────────────────────────────────────────────────────────
export function useInsights() {
  const mood     = useSelector((s: RootState) => s.trackers.mood);
  const sleep    = useSelector((s: RootState) => s.trackers.sleep);
  const habits   = useSelector((s: RootState) => s.trackers.habits);
  const logs     = useSelector((s: RootState) => s.trackers.habitLogs);
  const expenses = useSelector((s: RootState) => s.trackers.expenses);

  const [insights, setInsights] = useState<string[]>([]);
  const [loading,  setLoading]  = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const results = await generateWeeklyInsights({ mood, sleep, habits, logs, expenses });
      setInsights(results);
    } finally {
      setLoading(false);
    }
  };

  return { insights, loading, generate };
}

// ── Intimacy hook ─────────────────────────────────────────────────────────────
export function useIntimacyTracker() {
  const dispatch = useDispatch();
  const user     = useSelector((s: RootState) => s.auth.user);
  const entries  = useSelector((s: RootState) => s.trackers.intimacy);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const es = await fetchIntimacyEntries(user.id);
    dispatch(setIntimacy(es));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    // Swallow the failure into state: the screens render regardless, so a
    // slow/unreachable API must never leave them stuck on a spinner.
    load()
      .catch(() => { if (!cancelled) setError('Could not load entries. Pull to refresh.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try { await load(); }
    catch { setError('Could not load entries. Pull to refresh.'); }
    finally { setRefreshing(false); }
  }, [load]);

  const logEntry = async (data: {
    date: string; time: string; who: IntimacyWho; protection?: ProtectionStatus;
    feeling?: IntimacyFeeling; moodAfter?: IntimacyMoodAfter; notes?: string;
  }) => {
    if (!user) return;
    const entry = await saveIntimacyEntry({ userId: user.id, ...data });
    dispatch(addIntimacyEntry(entry));
    return entry;
  };

  const editEntry = async (id: string, updates: Partial<IntimacyEntry>) => {
    await updateIntimacyDoc(id, updates);
    const existing = entries.find(e => e.id === id);
    if (existing) dispatch(updateIntimacyEntry({ ...existing, ...updates }));
  };

  const removeEntry = async (id: string) => {
    await deleteIntimacyById(id);
    dispatch(deleteIntimacyEntry(id));
  };

  // ── Derived stats ──
  // From `intimacyAnalytics` (§17 step 8), so the denominators are covered by
  // tests and Home, History and Insights can't disagree.
  const sorted = useMemo(() => I.sortEntries(entries), [entries]);

  const monthStats = useMemo(() => I.statsFor(entries, 'month'), [entries]);
  const overview = monthStats.overview;
  const moodAfterCounts = monthStats.mood.counts;
  const mostCommonFeeling = monthStats.feelings.top ?? undefined;

  /** Newest event by date *and* time, not merely by date (§3.2). */
  const lastEntry = sorted[0] ?? null;

  const monthlyFrequency = useMemo(() => I.monthlyFrequency(entries, 6), [entries]);

  /** All entries on a date — a day can hold several (§8, §14). */
  const entriesOn = (date: string) => I.entriesOn(entries, date);
  /** Dates carrying at least one entry, for calendar markers — never note content. */
  const markedDates = useMemo(() => I.markedDates(entries), [entries]);
  /** Month groups for History, newest first (§7). */
  const monthGroups = useMemo(() => I.groupByMonth(entries), [entries]);

  /** Stats for an arbitrary range — the Insights and History period filters. */
  const statsFor = (period: IntimacyPeriod) => {
    const st = I.statsFor(entries, period);
    return {
      entries: st.entries,
      overview: st.overview,
      protection: st.protection,
      moodAfterCounts: st.mood.counts,
      moodTotal: st.mood.total,
      moodRows: st.mood.rows,
      mostCommonFeeling: st.feelings.top ?? undefined,
      /** Null when no feeling was recorded — distinct from a genuine 0%. */
      mostCommonFeelingPct: st.feelings.topPct,
      feelingTotal: st.feelings.total,
    };
  };

  return {
    entries: sorted, loading, refreshing, refresh, error,
    logEntry, editEntry, removeEntry,
    overview, lastEntry, moodAfterCounts, monthlyFrequency, mostCommonFeeling,
    entriesOn, markedDates, monthGroups,
    statsFor,
  };
}

// ── Sickness hook (symptoms + medications) ────────────────────────────────────
export function useSicknessTracker() {
  const dispatch    = useDispatch();
  const user        = useSelector((s: RootState) => s.auth.user);
  const symptoms     = useSelector((s: RootState) => s.trackers.symptoms);
  const medications  = useSelector((s: RootState) => s.trackers.medications);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [ss, ms] = await Promise.all([fetchSymptomEntries(user.id), fetchMedicationEntries(user.id)]);
    dispatch(setSymptoms(ss));
    dispatch(setMedications(ms));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .catch(() => { if (!cancelled) setError('Could not load your health log. Pull to refresh.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try { await load(); }
    catch { setError('Could not load your health log. Pull to refresh.'); }
    finally { setRefreshing(false); }
  }, [load]);

  const logSymptom = async (data: {
    date: string; time?: string; feeling?: SicknessFeeling; symptom: string;
    severity: SicknessSeverity; temperature?: number; temperatureUnit?: 'C' | 'F';
    attachmentUrl?: string; notes?: string;
  }) => {
    if (!user) return;
    const entry = await saveSymptomEntry({ userId: user.id, resolved: false, ...data });
    dispatch(addSymptomEntry(entry));
    return entry;
  };

  const editSymptom = async (id: string, updates: Partial<SymptomEntry>) => {
    await updateSymptomDoc(id, updates);
    const existing = symptoms.find(e => e.id === id);
    if (existing) dispatch(updateSymptomEntry({ ...existing, ...updates }));
  };

  const removeSymptom = async (id: string) => {
    await deleteSymptomById(id);
    dispatch(deleteSymptomEntry(id));
  };

  /** Marking resolved stamps the date so recovery time can be measured. */
  const resolveSymptom = async (id: string) =>
    editSymptom(id, { resolved: true, resolvedAt: new Date().toISOString().split('T')[0] });
  const reopenSymptom = async (id: string) =>
    editSymptom(id, { resolved: false, resolvedAt: undefined });

  const logMedication = async (data: {
    date: string; time: string; medication: string; dosage?: string; frequency?: string;
    foodTiming?: MedicationFoodTiming; purpose?: string; status: MedicationStatus;
    sideEffects?: string[]; reminderEnabled?: boolean; reminderRepeat?: string;
    attachmentUrl?: string; notes?: string;
  }) => {
    if (!user) return;
    const entry = await saveMedicationEntry({ userId: user.id, ...data });
    dispatch(addMedicationEntry(entry));
    return entry;
  };

  const editMedication = async (id: string, updates: Partial<MedicationEntry>) => {
    await updateMedicationDoc(id, updates);
    const existing = medications.find(e => e.id === id);
    if (existing) dispatch(updateMedicationEntry({ ...existing, ...updates }));
  };

  const removeMedication = async (id: string) => {
    await deleteMedicationById(id);
    dispatch(deleteMedicationEntry(id));
  };

  const setMedicationStatus = async (id: string, status: MedicationStatus) => editMedication(id, { status });

  /** Paused medications stop appearing as due but keep their history. */
  const pauseMedication  = async (id: string) => editMedication(id, { paused: true });
  const resumeMedication = async (id: string) => editMedication(id, { paused: false });

  // ── Derived stats ──
  // From `sicknessAnalytics` (§32), so Dashboard, History, Recent Entries and
  // Timeline can't disagree about what's active, due or recent.
  const activeSymptoms = Sick.activeSymptoms(symptoms);
  /** Excludes paused courses and ones whose end date has passed (§5.4). */
  const dueMedications = Sick.dueMedications(medications);
  const upcomingDose = Sick.upcomingDose(medications);
  const timeline = Sick.timeline(symptoms, medications);

  /** Latest feeling recorded today, or null when none (§5.2). */
  const feelingToday = Sick.feelingForToday(symptoms);

  const adherenceStats = Sick.adherence(medications);
  const takenCount   = adherenceStats.taken;
  const skippedCount = adherenceStats.skipped;
  const missedCount  = adherenceStats.missed;
  const adherencePct = adherenceStats.pct;

  // Symptom frequency (name -> count), last 30 days
  const since30 = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })();
  const recentSymptoms = symptoms.filter(s => s.date >= since30);
  const symptomFrequency: Record<string, number> = {};
  recentSymptoms.forEach(s => { symptomFrequency[s.symptom] = (symptomFrequency[s.symptom] ?? 0) + 1; });
  const topSymptoms = Object.entries(symptomFrequency).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return {
    symptoms, medications, loading, refreshing, refresh, error,
    logSymptom, editSymptom, removeSymptom, resolveSymptom,
    logMedication, editMedication, removeMedication, setMedicationStatus,
    pauseMedication, resumeMedication, reopenSymptom,
    activeSymptoms, dueMedications, upcomingDose, timeline, feelingToday,
    symptomById: (id: string) => symptoms.find(s => s.id === id) ?? null,
    medicationById: (id: string) => medications.find(m => m.id === id) ?? null,
    adherencePct, takenCount, skippedCount, missedCount, topSymptoms,
  };
}

// ── Measurement hook ──────────────────────────────────────────────────────────
export function useMeasurementTracker() {
  const dispatch = useDispatch();
  const user     = useSelector((s: RootState) => s.auth.user);
  const entries  = useSelector((s: RootState) => s.trackers.measurements);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const es = await fetchMeasurementEntries(user.id);
    dispatch(setMeasurements(es));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .catch(() => { if (!cancelled) setError('Could not load measurements. Pull to refresh.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try { await load(); }
    catch { setError('Could not load measurements. Pull to refresh.'); }
    finally { setRefreshing(false); }
  }, [load]);

  const logMeasurement = async (data: Omit<MeasurementEntry, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const entry = await saveMeasurementEntry({ userId: user.id, ...data });
    dispatch(addMeasurementEntry(entry));
    return entry;
  };

  const editMeasurement = async (id: string, updates: Partial<MeasurementEntry>) => {
    await updateMeasurementDoc(id, updates);
    const existing = entries.find(e => e.id === id);
    if (existing) dispatch(updateMeasurementEntry({ ...existing, ...updates }));
  };

  const removeMeasurement = async (id: string) => {
    await deleteMeasurementById(id);
    dispatch(deleteMeasurementEntry(id));
  };

  // Sorted newest-first (fetch already sorts, but be defensive after local mutations)
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const latest   = sorted[0] ?? null;
  const previous = sorted[1] ?? null;

  const deltaFor = (field: MeasurementField): number | null => {
    if (!latest?.[field] || !previous?.[field]) return null;
    return Math.round(((latest[field] as number) - (previous[field] as number)) * 10) / 10;
  };

  const seriesFor = (field: MeasurementField, limit = 10) =>
    sorted
      .filter(e => e[field] != null)
      .slice(0, limit)
      .reverse()
      .map(e => ({ date: e.date, value: e[field] as number }));

  const statsFor = (field: MeasurementField) => {
    // Oldest → newest, so totalChange reads "how much has this moved since the first log".
    const chrono = [...entries]
      .filter(e => e[field] != null)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (!chrono.length) return null;
    const vals = chrono.map(e => e[field] as number);
    return {
      highest: Math.max(...vals),
      lowest:  Math.min(...vals),
      totalChange: Math.round((vals[vals.length - 1] - vals[0]) * 10) / 10,
      highestDate: chrono[vals.indexOf(Math.max(...vals))].date,
      lowestDate:  chrono[vals.indexOf(Math.min(...vals))].date,
    };
  };

  /** Newest entry on or before a date — backs the week/month comparisons. */
  const entryOnOrBefore = (dateISO: string) => sorted.find(e => e.date <= dateISO) ?? null;

  const shiftDays = (n: number) => {
    const d = new Date(); d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  /**
   * Compare the latest entry against a baseline. Returns per-field absolute and
   * percentage change, plus a direction so the UI can colour it consistently.
   */
  const compareWith = (baseline: MeasurementEntry | null) => {
    if (!latest || !baseline || baseline.id === latest.id) return null;
    const rows = MEASUREMENT_FIELDS.map(f => {
      const now = latest[f.key] as number | undefined;
      const then = baseline[f.key] as number | undefined;
      if (now == null || then == null) {
        return { field: f.key, label: f.label, unit: f.unit, now: now ?? null, then: then ?? null, diff: null, pct: null, dir: 'none' as const };
      }
      const diff = Math.round((now - then) * 10) / 10;
      const pct = then !== 0 ? Math.round((diff / then) * 1000) / 10 : null;
      return {
        field: f.key, label: f.label, unit: f.unit, now, then, diff, pct,
        dir: diff < 0 ? ('down' as const) : diff > 0 ? ('up' as const) : ('none' as const),
      };
    });
    return { baseline, rows };
  };

  const comparisons = {
    previous: compareWith(previous),
    lastWeek: compareWith(entryOnOrBefore(shiftDays(7))),
    lastMonth: compareWith(entryOnOrBefore(shiftDays(30))),
  };
  /** Compare against whatever date the user picks. */
  const compareWithDate = (dateISO: string) => compareWith(entryOnOrBefore(dateISO));

  const entriesIn = (period: 'week' | 'month' | 'year' | 'all') => {
    if (period === 'all') return sorted;
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const start = shiftDays(days);
    return sorted.filter(e => e.date >= start);
  };

  /** Weight analytics + per-field movement, for the analytics cards. */
  const analytics = (() => {
    const weightStats = statsFor('weightKg');
    const weightVals = entries.filter(e => e.weightKg != null).map(e => e.weightKg as number);
    const avgWeight = weightVals.length
      ? Math.round((weightVals.reduce((a, b) => a + b, 0) / weightVals.length) * 10) / 10
      : null;

    const fieldChanges = MEASUREMENT_FIELDS.map(f => {
      const st = statsFor(f.key);
      return { field: f.key, label: f.label, unit: f.unit, totalChange: st?.totalChange ?? null };
    });

    // Weekly/monthly rate of weight change across the whole logged span.
    const chrono = [...entries].filter(e => e.weightKg != null).sort((a, b) => a.date.localeCompare(b.date));
    let avgWeeklyKg: number | null = null;
    let avgMonthlyKg: number | null = null;
    if (chrono.length >= 2) {
      const first = chrono[0], last = chrono[chrono.length - 1];
      const days = Math.max(1, Math.round(
        (new Date(last.date + 'T00:00:00').getTime() - new Date(first.date + 'T00:00:00').getTime()) / 86400000,
      ));
      const total = (last.weightKg as number) - (first.weightKg as number);
      avgWeeklyKg = Math.round((total / days) * 7 * 100) / 100;
      avgMonthlyKg = Math.round((total / days) * 30 * 100) / 100;
    }

    return {
      totalMeasurements: entries.length,
      highestWeight: weightStats?.highest ?? null,
      highestWeightDate: weightStats?.highestDate ?? null,
      lowestWeight: weightStats?.lowest ?? null,
      lowestWeightDate: weightStats?.lowestDate ?? null,
      averageWeight: avgWeight,
      totalWeightChange: weightStats?.totalChange ?? null,
      fieldChanges,
      avgWeeklyKg, avgMonthlyKg,
    };
  })();

  return {
    entries: sorted, loading, refreshing, refresh, error,
    logMeasurement, editMeasurement, removeMeasurement,
    latest, previous, deltaFor, seriesFor, statsFor,
    entryById: (id: string) => entries.find(e => e.id === id) ?? null,
    entryOnOrBefore, comparisons, compareWithDate, entriesIn, analytics,
  };
}

// ── Water hook ────────────────────────────────────────────────────────────────
const DEFAULT_WATER_GOAL_ML = 2500;

export function useWaterTracker() {
  const dispatch = useDispatch();
  const user     = useSelector((s: RootState) => s.auth.user);
  const logs     = useSelector((s: RootState) => s.trackers.waterLogs);
  const settings = useSelector((s: RootState) => s.trackers.waterSettings);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [ls, st] = await Promise.all([fetchWaterLogs(user.id), fetchWaterSettings(user.id)]);
    dispatch(setWaterLogs(ls));
    dispatch(setWaterSettings(st));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .catch(() => { if (!cancelled) setError('Could not load water logs. Pull to refresh.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try { await load(); }
    catch { setError('Could not load water logs. Pull to refresh.'); }
    finally { setRefreshing(false); }
  }, [load]);

  const goalMl = settings?.dailyGoalMl ?? DEFAULT_WATER_GOAL_ML;

  const logWater = async (
    amountMl: number, date = waterToISO(new Date()), time?: string, notes?: string,
  ) => {
    if (!user) return;
    const now = new Date();
    const hhmm = time ?? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const entry = await saveWaterLog({ userId: user.id, date, time: hhmm, amountMl, notes });
    dispatch(addWaterLog(entry));
    return entry;
  };

  const editLog = async (id: string, updates: Partial<WaterLogEntry>) => {
    const patch = { ...updates, updatedAt: new Date().toISOString() };
    await updateWaterLogDoc(id, patch);
    const existing = logs.find(l => l.id === id);
    if (existing) dispatch(updateWaterLog({ ...existing, ...patch }));
  };

  const removeLog = async (id: string) => {
    await deleteWaterLogById(id);
    dispatch(deleteWaterLog(id));
  };

  const setGoal = async (
    dailyGoalMl: number,
    reminderEnabled?: boolean,
    reminderTime?: string,
    reminderFrequency?: WaterReminderFrequency,
  ) => {
    if (!user) return;
    const saved = await saveWaterSettings({
      userId: user.id, dailyGoalMl, reminderEnabled, reminderTime, reminderFrequency,
    });
    dispatch(setWaterSettings(saved));
    return saved;
  };

  // ── Derived ──
  // All of it from `waterAnalytics` (§27, §37), so Home and History can't
  // disagree about a total, a percentage or where a week starts.
  const byDate = waterTotalsByDate(logs);

  const today = waterToISO(new Date());
  const dashboard = waterDashboard(logs, goalMl, settings, new Date());
  const todayTotalMl = dashboard.consumedMl;
  /** 0–1 for the progress arc. Use `todayPctValue` for the number on screen. */
  const todayPct = dashboard.fraction;
  /** Uncapped percentage — an over-goal day must read 107%, not 100% (§16). */
  const todayPctValue = dashboard.percentage;
  const todayLogsList = dashboard.todayLogs;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = waterToISO(d);
    return { label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1), date: ds, value: Math.round(((byDate[ds] ?? 0) / 1000) * 10) / 10 };
  });

  const streak = dashboard.streak;

  /** Longest run of consecutive goal-hitting days, ever. */
  const longestStreak = (() => {
    const met = Object.keys(byDate).filter(d => (byDate[d] ?? 0) >= goalMl && goalMl > 0).sort();
    let best = 0, run = 0;
    let prev: Date | null = null;
    for (const d of met) {
      const cur = new Date(d + 'T00:00:00');
      if (prev && Math.round((cur.getTime() - prev.getTime()) / 86400000) === 1) run++;
      else run = 1;
      best = Math.max(best, run);
      prev = cur;
    }
    return best;
  })();

  const startOfPeriod = (period: WaterPeriod) => {
    if (period === 'all') return '0000-01-01';
    const d = new Date();
    if (period === 'week') d.setDate(d.getDate() - 6);
    else if (period === 'month') d.setDate(d.getDate() - 29);
    else d.setFullYear(d.getFullYear() - 1);
    return waterToISO(d);
  };

  const logsFor = (dateISO: string) =>
    logs.filter(l => l.date === dateISO).sort((a, b) => b.time.localeCompare(a.time));

  /** All analytics for a range. Recomputes automatically as logs change. */
  const statsFor = (period: WaterPeriod) => {
    const start = startOfPeriod(period);
    const days = Object.keys(byDate).filter(d => d >= start).sort();
    const totals = days.map(d => byDate[d]);
    const daysMet = days.filter(d => byDate[d] >= goalMl && goalMl > 0).length;

    const bestDate = days.reduce<string | null>((best, d) => (
      best == null || byDate[d] > byDate[best] ? d : best
    ), null);
    const worstDate = days.reduce<string | null>((worst, d) => (
      worst == null || byDate[d] < byDate[worst] ? d : worst
    ), null);

    const totalMl = totals.reduce((a, b) => a + b, 0);
    const avgMl = days.length ? Math.round(totalMl / days.length) : 0;

    return {
      days,
      dayCount: days.length,
      totalMl,
      averageMl: avgMl,
      averagePctOfGoal: goalMl ? Math.round((avgMl / goalMl) * 100) : 0,
      highestMl: bestDate ? byDate[bestDate] : null,
      highestDate: bestDate,
      lowestMl: worstDate ? byDate[worstDate] : null,
      lowestDate: worstDate,
      daysMet,
      goalCompletionRate: days.length ? Math.round((daysMet / days.length) * 100) : 0,
      // Oldest → newest chart series, in litres.
      chart: days.map(d => ({
        label: d.slice(8),
        date: d,
        value: Math.round((byDate[d] / 1000) * 10) / 10,
        met: byDate[d] >= goalMl && goalMl > 0,
      })),
    };
  };

  const weeklyAverageMl = statsFor('week').averageMl;
  const monthlyAverageMl = statsFor('month').averageMl;

  /**
   * Personalised hydration observations. Only surfaces a line when there's
   * enough data to support it, so we never state something we can't back up.
   */
  const smartInsights = (() => {
    const out: string[] = [];
    const remaining = Math.max(0, goalMl - todayTotalMl);
    if (remaining > 0) out.push(`You're ${remaining} ml away from today's goal.`);
    else if (todayTotalMl > 0) out.push("You've hit today's goal — nicely done.");

    const wk = statsFor('week');
    if (wk.dayCount >= 3) out.push(`You reached your goal ${wk.daysMet} ${wk.daysMet === 1 ? 'day' : 'days'} this week.`);

    // Time-of-day split needs a reasonable sample before it means anything.
    if (logs.length >= 10) {
      const buckets = { morning: 0, afternoon: 0, evening: 0 };
      logs.forEach(l => {
        const h = Number(l.time.split(':')[0]);
        if (h < 12) buckets.morning += l.amountMl;
        else if (h < 18) buckets.afternoon += l.amountMl;
        else buckets.evening += l.amountMl;
      });
      const lowest = (Object.keys(buckets) as (keyof typeof buckets)[])
        .sort((a, b) => buckets[a] - buckets[b])[0];
      out.push(`You usually drink least during the ${lowest}.`);
    }

    // Weekend vs weekday, again only with enough days logged.
    const allDays = Object.keys(byDate);
    if (allDays.length >= 7) {
      let weekendSum = 0, weekendN = 0, weekdaySum = 0, weekdayN = 0;
      allDays.forEach(d => {
        const wd = new Date(d + 'T00:00:00').getDay();
        if (wd === 0 || wd === 6) { weekendSum += byDate[d]; weekendN++; }
        else { weekdaySum += byDate[d]; weekdayN++; }
      });
      if (weekendN && weekdayN) {
        const we = weekendSum / weekendN, wd = weekdaySum / weekdayN;
        if (Math.abs(we - wd) > goalMl * 0.1) {
          out.push(we > wd ? 'Your intake is higher on weekends.' : 'Your intake is higher on weekdays.');
        }
      }
    }
    return out;
  })();

  /** Milestone badges. Unlocked state is derived, never stored. */
  const achievements: WaterAchievement[] = (() => {
    const totalDaysMet = Object.keys(byDate).filter(d => byDate[d] >= goalMl && goalMl > 0).length;
    const wk = statsFor('week');
    return [
      { key: 'first',      emoji: '💧', label: 'First Water Log',    detail: 'Log your first glass',        unlocked: logs.length > 0 },
      { key: 'streak7',    emoji: '🔥', label: '7-Day Streak',        detail: '7 goal days in a row',        unlocked: longestStreak >= 7 },
      { key: 'streak30',   emoji: '🏅', label: '30-Day Streak',       detail: '30 goal days in a row',       unlocked: longestStreak >= 30 },
      { key: 'met10',      emoji: '🎯', label: 'Goal Achieved 10×',   detail: 'Hit your goal 10 times',      unlocked: totalDaysMet >= 10 },
      { key: 'perfectWk',  emoji: '⭐', label: 'Perfect Week',        detail: 'Goal met all 7 days',         unlocked: wk.dayCount >= 7 && wk.daysMet >= 7 },
      { key: 'champion',   emoji: '🏆', label: 'Hydration Champion',  detail: 'Hit your goal 50 times',      unlocked: totalDaysMet >= 50 },
    ];
  })();

  return {
    logs, settings, loading, refreshing, refresh, error,
    logWater, editLog, removeLog, setGoal,
    goalMl, todayTotalMl, todayPct, todayPctValue, todayLogsList, last7, streak, byDate,
    dashboard,
    remainingMl: dashboard.remainingMl,
    goalState: dashboard.state,
    nextReminderAt: dashboard.next,
    goalMet: goalMl > 0 && todayTotalMl >= goalMl,
    longestStreak, statsFor, logsFor, weeklyAverageMl, monthlyAverageMl,
    smartInsights, achievements,
    logById: (id: string) => logs.find(l => l.id === id) ?? null,
  };
}

// ── BMI hook ──────────────────────────────────────────────────────────────────
function bmiCategoryFor(bmi: number): BMICategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25)   return 'normal';
  if (bmi < 30)   return 'overweight';
  if (bmi < 35)   return 'obese';
  return 'severely_obese';
}
export function computeBMI(heightCm: number, weightKg: number): { bmi: number; category: BMICategory } {
  const heightM = heightCm / 100;
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  return { bmi, category: bmiCategoryFor(bmi) };
}
/** Weight range (kg) for a "Normal" BMI (18.5–24.9) at the given height. */
export function idealWeightRangeFor(heightCm: number): { min: number; max: number } {
  const heightM = heightCm / 100;
  return {
    min: Math.round(18.5 * heightM * heightM * 10) / 10,
    max: Math.round(24.9 * heightM * heightM * 10) / 10,
  };
}

export function useBMITracker() {
  const dispatch = useDispatch();
  const user     = useSelector((s: RootState) => s.auth.user);
  const entries  = useSelector((s: RootState) => s.trackers.bmiEntries);
  const weightGoal = useSelector((s: RootState) => s.trackers.weightGoal);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [es, wg] = await Promise.all([fetchBMIEntries(user.id), fetchWeightGoal(user.id)]);
    dispatch(setBMIEntries(es));
    dispatch(setWeightGoal(wg));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    // Screens render regardless, so a slow/unreachable API can't strand them.
    load()
      .catch(() => { if (!cancelled) setError('Could not load BMI data. Pull to refresh.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try { await load(); }
    catch { setError('Could not load BMI data. Pull to refresh.'); }
    finally { setRefreshing(false); }
  }, [load]);

  /**
   * Save a measurement. Body-composition fields are optional throughout (§3):
   * BMI comes from height and weight alone, so a save with all of them blank
   * is the normal case, not a degraded one.
   */
  const logBMI = async (data: {
    date: string; time?: string; heightCm: number; weightKg: number; notes?: string;
    bodyFatPct?: number; muscleMassKg?: number; visceralFat?: number;
    bodyWaterPct?: number; boneMassKg?: number;
  }) => {
    if (!user) return;
    const { bmi, category } = computeBMI(data.heightCm, data.weightKg);
    const entry = await saveBMIEntry({ userId: user.id, ...data, bmi, category });
    dispatch(addBMIEntry(entry));
    return entry;
  };

  const editBMI = async (id: string, updates: Partial<Pick<BMIEntry,
    'heightCm' | 'weightKg' | 'date' | 'time' | 'notes'
    | 'bodyFatPct' | 'muscleMassKg' | 'visceralFat' | 'bodyWaterPct' | 'boneMassKg'>>) => {
    const existing = entries.find(e => e.id === id);
    if (!existing) return;
    const heightCm = updates.heightCm ?? existing.heightCm;
    const weightKg = updates.weightKg ?? existing.weightKg;
    const { bmi, category } = computeBMI(heightCm, weightKg);
    const full = { ...updates, bmi, category };
    await updateBMIDoc(id, full);
    dispatch(updateBMIEntry({ ...existing, ...full }));
  };

  const removeBMI = async (id: string) => {
    await deleteBMIById(id);
    dispatch(deleteBMIEntry(id));
  };

  /** Set the goal weight, its type and an optional target date (§4). */
  const setGoal = async (
    targetWeightKg: number, goalType?: WeightGoalType, targetDate?: string,
  ) => {
    if (!user) return;
    const saved = await saveWeightGoal({ targetWeightKg, goalType, targetDate });
    dispatch(setWeightGoal(saved));
    return saved;
  };

  /** Save the dob/sex needed for body-composition estimates. */
  const setBodyProfile = async (dob: string, sex: 'female' | 'male') => {
    if (!user) return;
    const saved = await saveWeightGoal({ dob, sex });
    dispatch(setWeightGoal(saved));
    return saved;
  };

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const latest   = sorted[0] ?? null;
  const previous = sorted[1] ?? null;
  const oldest   = sorted[sorted.length - 1] ?? null;

  const deltaWeight = latest && previous ? Math.round((latest.weightKg - previous.weightKg) * 10) / 10 : null;
  const deltaHeight = latest && previous ? Math.round((latest.heightCm - previous.heightCm) * 10) / 10 : null;
  const idealWeightRange = latest ? idealWeightRangeFor(latest.heightCm) : null;

  // Progress toward the weight goal, measured from the first-ever log to now.
  let goalProgressPct: number | null = null;
  if (weightGoal && latest && oldest && oldest.weightKg !== weightGoal.targetWeightKg) {
    const total = oldest.weightKg - weightGoal.targetWeightKg;   // positive if losing weight
    const done  = oldest.weightKg - latest.weightKg;
    goalProgressPct = total !== 0 ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : 100;
  }

  // ── Week-over-week weight change (design's "vs last week") ──
  const weekAgoISO = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })();
  const lastWeekEntry = sorted.find(e => e.date <= weekAgoISO) ?? oldest;
  const weeklyWeightDelta = latest && lastWeekEntry && lastWeekEntry.id !== latest.id
    ? Math.round((latest.weightKg - lastWeekEntry.weightKg) * 10) / 10
    : null;

  /** Remaining weight to the goal, and whether it's been reached. */
  const goalRemainingKg = weightGoal && latest
    ? Math.round((latest.weightKg - weightGoal.targetWeightKg) * 10) / 10
    : null;
  const goalAchieved = goalProgressPct != null && goalProgressPct >= 100;

  const entriesIn = (period: BMIPeriod) => {
    if (period === 'all') return sorted;
    const d = new Date();
    if (period === '7d') d.setDate(d.getDate() - 6);
    else if (period === '30d') d.setDate(d.getDate() - 29);
    else if (period === '3m') d.setMonth(d.getMonth() - 3);
    else if (period === '6m') d.setMonth(d.getMonth() - 6);
    else if (period === '1y') d.setFullYear(d.getFullYear() - 1);
    const start = d.toISOString().split('T')[0];
    return sorted.filter(e => e.date >= start);
  };

  /** Analytics + chart series for a range. Recomputes as entries change. */
  const statsFor = (period: BMIPeriod) => {
    const scoped = entriesIn(period);
    const bmis = scoped.map(e => e.bmi);
    const weights = scoped.map(e => e.weightKg);
    const chrono = [...scoped].sort((a, b) => a.date.localeCompare(b.date));
    const avg = (xs: number[]) => xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;

    const first = chrono[0] ?? null;
    const last  = chrono[chrono.length - 1] ?? null;

    return {
      entries: scoped,
      total: scoped.length,
      currentBmi:  last ? Math.round(last.bmi * 10) / 10 : null,
      highestBmi:  bmis.length ? Math.round(Math.max(...bmis) * 10) / 10 : null,
      lowestBmi:   bmis.length ? Math.round(Math.min(...bmis) * 10) / 10 : null,
      averageBmi:  avg(bmis),
      averageWeight: avg(weights),
      // Negative = lost weight over the range.
      weightChange: first && last && first.id !== last.id
        ? Math.round((last.weightKg - first.weightKg) * 10) / 10
        : null,
      weightSeries: chrono.map(e => ({ label: e.date.slice(5), value: Math.round(e.weightKg * 10) / 10 })),
      bmiSeries:    chrono.map(e => ({ label: e.date.slice(5), value: Math.round(e.bmi * 10) / 10 })),
    };
  };

  return {
    entries: sorted, loading, refreshing, refresh, error,
    logBMI, editBMI, removeBMI, setGoal, setBodyProfile,
    latest, previous, deltaWeight, deltaHeight, idealWeightRange,
    weightGoal, goalProgressPct, goalRemainingKg, goalAchieved,
    weeklyWeightDelta, entriesIn, statsFor,
    entryById: (id: string) => entries.find(e => e.id === id) ?? null,
  };
}
