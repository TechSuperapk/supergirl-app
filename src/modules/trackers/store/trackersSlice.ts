import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LoadingState } from '../../../shared/types/common';
import {
  MoodEntry, SleepEntry, Habit, HabitLog,
  PeriodEntry, HealthEntry, ExpenseEntry, Milestone,
} from '../types';

interface TrackersState {
  mood:      MoodEntry[];
  sleep:     SleepEntry[];
  habits:    Habit[];
  habitLogs: HabitLog[];
  period:    PeriodEntry[];
  health:    HealthEntry[];
  expenses:  ExpenseEntry[];
  milestones: Milestone[];
  loading:   LoadingState;
  error:     string | null;
}

const initialState: TrackersState = {
  mood:       [],
  sleep:      [],
  habits:     [],
  habitLogs:  [],
  period:     [],
  health:     [],
  expenses:   [],
  milestones: [],
  loading:    'idle',
  error:      null,
};

const trackersSlice = createSlice({
  name: 'trackers',
  initialState,
  reducers: {
    setLoading(state, a: PayloadAction<LoadingState>) { state.loading = a.payload; },
    setError(state, a: PayloadAction<string | null>)  { state.error = a.payload; },

    // Mood
    setMood(state, a: PayloadAction<MoodEntry[]>)      { state.mood = a.payload; },
    addMoodEntry(state, a: PayloadAction<MoodEntry>)   { state.mood.unshift(a.payload); },

    // Sleep
    setSleep(state, a: PayloadAction<SleepEntry[]>)    { state.sleep = a.payload; },
    addSleepEntry(state, a: PayloadAction<SleepEntry>) { state.sleep.unshift(a.payload); },

    // Habits
    setHabits(state, a: PayloadAction<Habit[]>)        { state.habits = a.payload; },
    addHabit(state, a: PayloadAction<Habit>)           { state.habits.push(a.payload); },
    updateHabit(state, a: PayloadAction<Habit>) {
      const i = state.habits.findIndex(h => h.id === a.payload.id);
      if (i !== -1) state.habits[i] = a.payload;
    },
    deleteHabit(state, a: PayloadAction<string>) {
      state.habits = state.habits.filter(h => h.id !== a.payload);
    },
    setHabitLogs(state, a: PayloadAction<HabitLog[]>)  { state.habitLogs = a.payload; },
    toggleHabitLog(state, a: PayloadAction<HabitLog>) {
      const i = state.habitLogs.findIndex(
        l => l.habitId === a.payload.habitId && l.date === a.payload.date,
      );
      if (i !== -1) state.habitLogs[i] = a.payload;
      else          state.habitLogs.push(a.payload);
    },

    // Period
    setPeriod(state, a: PayloadAction<PeriodEntry[]>)    { state.period = a.payload; },
    addPeriodEntry(state, a: PayloadAction<PeriodEntry>) { state.period.unshift(a.payload); },

    // Health
    setHealth(state, a: PayloadAction<HealthEntry[]>)    { state.health = a.payload; },
    addHealthEntry(state, a: PayloadAction<HealthEntry>) { state.health.unshift(a.payload); },

    // Expenses
    setExpenses(state, a: PayloadAction<ExpenseEntry[]>)    { state.expenses = a.payload; },
    addExpenseEntry(state, a: PayloadAction<ExpenseEntry>)  { state.expenses.unshift(a.payload); },
    deleteExpenseEntry(state, a: PayloadAction<string>) {
      state.expenses = state.expenses.filter(e => e.id !== a.payload);
    },

    // Milestones
    setMilestones(state, a: PayloadAction<Milestone[]>)  { state.milestones = a.payload; },
    earnMilestone(state, a: PayloadAction<Milestone>)    { state.milestones.push(a.payload); },
  },
});

export const {
  setLoading, setError,
  setMood, addMoodEntry,
  setSleep, addSleepEntry,
  setHabits, addHabit, updateHabit, deleteHabit, setHabitLogs, toggleHabitLog,
  setPeriod, addPeriodEntry,
  setHealth, addHealthEntry,
  setExpenses, addExpenseEntry, deleteExpenseEntry,
  setMilestones, earnMilestone,
} = trackersSlice.actions;

export default trackersSlice.reducer;
