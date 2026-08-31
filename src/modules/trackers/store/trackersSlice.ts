import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LoadingState } from '../../../shared/types/common';
import {
  MoodEntry, SleepEntry, Habit, HabitLog,
  PeriodEntry, HealthEntry, ExpenseEntry, Milestone,
  IntimacyEntry, SymptomEntry, MedicationEntry, MeasurementEntry,
  WaterLogEntry, WaterSettings, BMIEntry, WeightGoalSettings, PeriodDayLog,
  MoodLog, FinanceCategory, FinanceAccount, FinanceBudget, MedicationDose,
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
  intimacy:    IntimacyEntry[];
  symptoms:    SymptomEntry[];
  medications: MedicationEntry[];
  measurements: MeasurementEntry[];
  waterLogs:    WaterLogEntry[];
  waterSettings: WaterSettings | null;
  bmiEntries:    BMIEntry[];
  weightGoal:    WeightGoalSettings | null;
  periodDayLogs: PeriodDayLog[];
  moodLogs:      MoodLog[];
  financeCategories: FinanceCategory[];
  financeAccounts:   FinanceAccount[];
  financeBudgets:    FinanceBudget[];
  medicationDoses:   MedicationDose[];
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
  intimacy:     [],
  symptoms:     [],
  medications:  [],
  measurements: [],
  waterLogs:     [],
  waterSettings: null,
  bmiEntries:    [],
  weightGoal:    null,
  periodDayLogs: [],
  moodLogs:      [],
  financeCategories: [],
  financeAccounts:   [],
  financeBudgets:    [],
  medicationDoses:   [],
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
    /**
     * One record per night. The server upserts on `date`, so a plain unshift
     * would leave an edited night showing twice locally until the next refresh.
     * Replace a same-id or same-date row in place, keeping newest-first order.
     */
    upsertSleepEntry(state, a: PayloadAction<SleepEntry>) {
      const i = state.sleep.findIndex(e => e.id === a.payload.id || e.date === a.payload.date);
      if (i >= 0) state.sleep[i] = a.payload;
      else {
        const at = state.sleep.findIndex(e => e.date < a.payload.date);
        if (at >= 0) state.sleep.splice(at, 0, a.payload);
        else state.sleep.push(a.payload);
      }
    },
    deleteSleepEntry(state, a: PayloadAction<string>)  { state.sleep = state.sleep.filter(e => e.id !== a.payload); },

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
    addPeriodEntry(state, a: PayloadAction<PeriodEntry>) {
      // Upsert: a re-save of the same cycle must replace it, not duplicate it.
      const i = state.period.findIndex(e => e.id === a.payload.id);
      if (i !== -1) state.period[i] = a.payload; else state.period.unshift(a.payload);
    },
    updatePeriodEntryLocal(state, a: PayloadAction<PeriodEntry>) {
      const i = state.period.findIndex(e => e.id === a.payload.id);
      if (i !== -1) state.period[i] = a.payload;
    },
    deletePeriodEntry(state, a: PayloadAction<string>) {
      state.period = state.period.filter(e => e.id !== a.payload);
    },

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

    // Medication doses
    setMedicationDoses(state, a: PayloadAction<MedicationDose[]>) { state.medicationDoses = a.payload; },
    upsertMedicationDose(state, a: PayloadAction<MedicationDose>) {
      const i = state.medicationDoses.findIndex(d => d.id === a.payload.id);
      if (i !== -1) state.medicationDoses[i] = a.payload;
      else state.medicationDoses.unshift(a.payload);
    },
    deleteMedicationDose(state, a: PayloadAction<string>) {
      state.medicationDoses = state.medicationDoses.filter(d => d.id !== a.payload);
    },

    // Finance categories
    setFinanceCategories(state, a: PayloadAction<FinanceCategory[]>) { state.financeCategories = a.payload; },
    upsertFinanceCategory(state, a: PayloadAction<FinanceCategory>) {
      const i = state.financeCategories.findIndex(c => c.id === a.payload.id);
      if (i !== -1) state.financeCategories[i] = a.payload;
      else state.financeCategories.push(a.payload);
    },
    deleteFinanceCategory(state, a: PayloadAction<string>) {
      state.financeCategories = state.financeCategories.filter(c => c.id !== a.payload);
    },

    // Finance accounts
    setFinanceAccounts(state, a: PayloadAction<FinanceAccount[]>) { state.financeAccounts = a.payload; },
    upsertFinanceAccount(state, a: PayloadAction<FinanceAccount>) {
      const i = state.financeAccounts.findIndex(x => x.id === a.payload.id);
      if (i !== -1) state.financeAccounts[i] = a.payload;
      else state.financeAccounts.push(a.payload);
    },
    deleteFinanceAccount(state, a: PayloadAction<string>) {
      state.financeAccounts = state.financeAccounts.filter(x => x.id !== a.payload);
    },

    // Finance budgets (§11)
    setFinanceBudgets(state, a: PayloadAction<FinanceBudget[]>) { state.financeBudgets = a.payload; },
    upsertFinanceBudget(state, a: PayloadAction<FinanceBudget>) {
      const i = state.financeBudgets.findIndex(x => x.id === a.payload.id);
      if (i !== -1) state.financeBudgets[i] = a.payload;
      else state.financeBudgets.push(a.payload);
    },
    deleteFinanceBudget(state, a: PayloadAction<string>) {
      state.financeBudgets = state.financeBudgets.filter(x => x.id !== a.payload);
    },

    // Mood logs (rich)
    setMoodLogs(state, a: PayloadAction<MoodLog[]>) { state.moodLogs = a.payload; },
    upsertMoodLog(state, a: PayloadAction<MoodLog>) {
      const i = state.moodLogs.findIndex(l => l.id === a.payload.id);
      if (i !== -1) state.moodLogs[i] = a.payload;
      else state.moodLogs.unshift(a.payload);
    },
    deleteMoodLog(state, a: PayloadAction<string>) {
      state.moodLogs = state.moodLogs.filter(l => l.id !== a.payload);
    },

    // Intimacy
    setIntimacy(state, a: PayloadAction<IntimacyEntry[]>)    { state.intimacy = a.payload; },
    addIntimacyEntry(state, a: PayloadAction<IntimacyEntry>) { state.intimacy.unshift(a.payload); },
    updateIntimacyEntry(state, a: PayloadAction<IntimacyEntry>) {
      const i = state.intimacy.findIndex(e => e.id === a.payload.id);
      if (i !== -1) state.intimacy[i] = a.payload;
    },
    deleteIntimacyEntry(state, a: PayloadAction<string>) {
      state.intimacy = state.intimacy.filter(e => e.id !== a.payload);
    },

    // Sickness — symptoms
    setSymptoms(state, a: PayloadAction<SymptomEntry[]>)    { state.symptoms = a.payload; },
    addSymptomEntry(state, a: PayloadAction<SymptomEntry>)  { state.symptoms.unshift(a.payload); },
    updateSymptomEntry(state, a: PayloadAction<SymptomEntry>) {
      const i = state.symptoms.findIndex(e => e.id === a.payload.id);
      if (i !== -1) state.symptoms[i] = a.payload;
    },
    deleteSymptomEntry(state, a: PayloadAction<string>) {
      state.symptoms = state.symptoms.filter(e => e.id !== a.payload);
    },

    // Sickness — medications
    setMedications(state, a: PayloadAction<MedicationEntry[]>)   { state.medications = a.payload; },
    addMedicationEntry(state, a: PayloadAction<MedicationEntry>) { state.medications.unshift(a.payload); },
    updateMedicationEntry(state, a: PayloadAction<MedicationEntry>) {
      const i = state.medications.findIndex(e => e.id === a.payload.id);
      if (i !== -1) state.medications[i] = a.payload;
    },
    deleteMedicationEntry(state, a: PayloadAction<string>) {
      state.medications = state.medications.filter(e => e.id !== a.payload);
    },

    // Measurements
    setMeasurements(state, a: PayloadAction<MeasurementEntry[]>)   { state.measurements = a.payload; },
    addMeasurementEntry(state, a: PayloadAction<MeasurementEntry>) { state.measurements.unshift(a.payload); },
    updateMeasurementEntry(state, a: PayloadAction<MeasurementEntry>) {
      const i = state.measurements.findIndex(e => e.id === a.payload.id);
      if (i !== -1) state.measurements[i] = a.payload;
    },
    deleteMeasurementEntry(state, a: PayloadAction<string>) {
      state.measurements = state.measurements.filter(e => e.id !== a.payload);
    },

    // Water
    setWaterLogs(state, a: PayloadAction<WaterLogEntry[]>)   { state.waterLogs = a.payload; },
    addWaterLog(state, a: PayloadAction<WaterLogEntry>)      { state.waterLogs.unshift(a.payload); },
    updateWaterLog(state, a: PayloadAction<WaterLogEntry>) {
      const i = state.waterLogs.findIndex(e => e.id === a.payload.id);
      if (i !== -1) state.waterLogs[i] = a.payload;
    },
    deleteWaterLog(state, a: PayloadAction<string>) {
      state.waterLogs = state.waterLogs.filter(e => e.id !== a.payload);
    },
    setWaterSettings(state, a: PayloadAction<WaterSettings | null>) { state.waterSettings = a.payload; },

    // BMI
    setBMIEntries(state, a: PayloadAction<BMIEntry[]>)   { state.bmiEntries = a.payload; },
    // Replace-or-prepend rather than a blind unshift: a save that resolves to
    // an id already in the list must update that row, not add a twin with the
    // same id (which makes every row select the same record).
    addBMIEntry(state, a: PayloadAction<BMIEntry>) {
      const i = state.bmiEntries.findIndex(e => e.id === a.payload.id);
      if (i !== -1) state.bmiEntries[i] = a.payload;
      else state.bmiEntries.unshift(a.payload);
    },
    updateBMIEntry(state, a: PayloadAction<BMIEntry>) {
      const i = state.bmiEntries.findIndex(e => e.id === a.payload.id);
      if (i !== -1) state.bmiEntries[i] = a.payload;
    },
    deleteBMIEntry(state, a: PayloadAction<string>) {
      state.bmiEntries = state.bmiEntries.filter(e => e.id !== a.payload);
    },
    setWeightGoal(state, a: PayloadAction<WeightGoalSettings | null>) { state.weightGoal = a.payload; },

    // Period day logs
    setPeriodDayLogs(state, a: PayloadAction<PeriodDayLog[]>)   { state.periodDayLogs = a.payload; },
    upsertPeriodDayLog(state, a: PayloadAction<PeriodDayLog>) {
      const i = state.periodDayLogs.findIndex(l => l.date === a.payload.date);
      if (i !== -1) state.periodDayLogs[i] = a.payload; else state.periodDayLogs.unshift(a.payload);
    },
    deletePeriodDayLog(state, a: PayloadAction<string>) {
      state.periodDayLogs = state.periodDayLogs.filter(l => l.id !== a.payload);
    },
  },
});

export const {
  setLoading, setError,
  setMood, addMoodEntry,
  setSleep, upsertSleepEntry, deleteSleepEntry,
  setHabits, addHabit, updateHabit, deleteHabit, setHabitLogs, toggleHabitLog,
  setPeriod, addPeriodEntry, updatePeriodEntryLocal, deletePeriodEntry,
  setHealth, addHealthEntry,
  setExpenses, addExpenseEntry, deleteExpenseEntry,
  setMilestones, earnMilestone,
  setMoodLogs, upsertMoodLog, deleteMoodLog,
  setMedicationDoses, upsertMedicationDose, deleteMedicationDose,
  setFinanceCategories, upsertFinanceCategory, deleteFinanceCategory,
  setFinanceAccounts, upsertFinanceAccount, deleteFinanceAccount,
  setFinanceBudgets, upsertFinanceBudget, deleteFinanceBudget,
  setIntimacy, addIntimacyEntry, updateIntimacyEntry, deleteIntimacyEntry,
  setSymptoms, addSymptomEntry, updateSymptomEntry, deleteSymptomEntry,
  setMedications, addMedicationEntry, updateMedicationEntry, deleteMedicationEntry,
  setMeasurements, addMeasurementEntry, updateMeasurementEntry, deleteMeasurementEntry,
  setWaterLogs, addWaterLog, updateWaterLog, deleteWaterLog, setWaterSettings,
  setBMIEntries, addBMIEntry, updateBMIEntry, deleteBMIEntry, setWeightGoal,
  setPeriodDayLogs, upsertPeriodDayLog, deletePeriodDayLog,
} = trackersSlice.actions;

export default trackersSlice.reducer;
