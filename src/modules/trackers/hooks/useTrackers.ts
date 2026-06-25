import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector }         from 'react-redux';
import { RootState }                        from '../../../store';
import {
  setMood, addMoodEntry,
  setSleep, addSleepEntry,
  setHabits, addHabit, updateHabit, deleteHabit, setHabitLogs, toggleHabitLog,
  setPeriod, addPeriodEntry,
  setHealth, addHealthEntry,
  setExpenses, addExpenseEntry, deleteExpenseEntry,
  setMilestones, earnMilestone,
} from '../store/trackersSlice';
import {
  fetchMoodEntries, saveMoodEntry,
  fetchSleepEntries, saveSleepEntry,
  fetchHabits, createHabit, updateHabitStreak, deleteHabitById, fetchHabitLogs, toggleHabitLogEntry,
  fetchPeriodEntries, savePeriodEntry, updatePeriodEntry,
  fetchHealthEntries, saveHealthEntry,
  fetchExpenseEntries, saveExpenseEntry, deleteExpenseById,
  fetchMilestones, awardMilestone,
} from '../services/trackersDbService';
import { generateWeeklyInsights, predictNextPeriod, checkMilestones } from '../services/aiInsightsService';
import {
  MoodEntry, SleepEntry, Habit, HabitLog,
  PeriodEntry, HealthEntry, ExpenseEntry, MoodLevel, FlowLevel, ExpenseCategory,
} from '../types';

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

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchSleepEntries(user.id)
      .then(es => dispatch(setSleep(es)))
      .finally(() => setLoading(false));
  }, [user?.id]);

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
    dispatch(addSleepEntry(entry));
    return entry;
  };

  const avgHours = entries.length
    ? (entries.slice(0, 7).reduce((s, e) => s + e.durationMins, 0) / Math.min(entries.length, 7) / 60).toFixed(1)
    : null;

  return { entries, loading, logSleep, avgHours };
}

// ── Habits hook ───────────────────────────────────────────────────────────────
export function useHabitTracker() {
  const dispatch  = useDispatch();
  const user      = useSelector((s: RootState) => s.auth.user);
  const habits    = useSelector((s: RootState) => s.trackers.habits);
  const habitLogs = useSelector((s: RootState) => s.trackers.habitLogs);
  const [loading,  setLoading]  = useState(false);

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

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCompleted = habits.filter(h => isCompleted(h.id, todayStr)).length;

  return { habits, habitLogs, loading, addNewHabit, removeHabit, toggle, isCompleted, todayCompleted };
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
  const dispatch = useDispatch();
  const user     = useSelector((s: RootState) => s.auth.user);
  const entries  = useSelector((s: RootState) => s.trackers.period);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchPeriodEntries(user.id)
      .then(es => dispatch(setPeriod(es)))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const startPeriod = async (flow: FlowLevel, symptoms: string[], notes?: string) => {
    if (!user) return;
    const entry = await savePeriodEntry({
      userId: user.id,
      startDate: new Date().toISOString().split('T')[0],
      flow, symptoms, notes,
    });
    dispatch(addPeriodEntry(entry));
    return entry;
  };

  const endPeriod = async (entryId: string) => {
    const endDate = new Date().toISOString().split('T')[0];
    await updatePeriodEntry(entryId, { endDate });
    dispatch(setPeriod(entries.map(e => e.id === entryId ? { ...e, endDate } : e)));
  };

  const prediction = predictNextPeriod(entries);
  const activePeriod = entries.find(e => !e.endDate);

  return { entries, loading, startPeriod, endPeriod, prediction, activePeriod };
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
