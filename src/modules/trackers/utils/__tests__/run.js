/**
 * Tracker analytics test runner.
 *
 *   node src/modules/trackers/utils/__tests__/run.js
 *
 * The four analytics modules are pure and date-injectable specifically so they
 * can be checked without a device, a store or a mocked clock. Each tracker spec
 * asks for this (Sleep §35, Water §37, Period §14 step 3, Intimacy §17 step 8).
 *
 * The modules import types from `../types`, which pulls in the whole app type
 * graph, so each one is compiled standalone against a local shim of just the
 * types it uses. That keeps the runner dependency-free — no jest, no ts-node,
 * only the TypeScript compiler already in node_modules.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const UTILS = path.resolve(__dirname, '..');
const ROOT = path.resolve(UTILS, '../../../..');
const TSC = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');

/** Type shims, so each module compiles without the rest of the app. */
const SHIMS = {
  sleepAnalytics: {
    from: "import { SleepEntry } from '../types';",
    to: `export interface SleepEntry { id: string; userId: string; date: string; bedtime: string;
      wakeTime: string; durationMins: number; quality: any; notes?: string; createdAt: string; }`,
  },
  waterAnalytics: {
    from: "import { WaterLogEntry, WaterPeriod, WaterReminderFrequency } from '../types';",
    to: `export interface WaterLogEntry { id: string; userId: string; date: string; time: string;
      amountMl: number; notes?: string; createdAt: string; updatedAt?: string; }
    export type WaterPeriod = 'week' | 'month' | 'year' | 'all';
    export type WaterReminderFrequency = 'none' | 'daily' | 'weekdays' | 'weekends' | 'custom';`,
  },
  periodAnalytics: {
    from: "import { PeriodEntry, PeriodDayLog, PeriodMood } from '../types';",
    to: `export type FlowLevel = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';
    export type PeriodMood = 'happy' | 'calm' | 'neutral' | 'irritated' | 'sad';
    export interface PeriodEntry { id: string; userId: string; startDate: string; endDate?: string;
      flow: FlowLevel; symptoms: string[]; notes?: string; cycleLength?: number;
      periodLength?: number; createdAt: string; }
    export interface PeriodDayLog { id: string; userId: string; date: string; flow: FlowLevel;
      symptoms: string[]; mood?: PeriodMood; medicationTaken?: boolean; temperature?: number;
      temperatureUnit?: 'C' | 'F'; notes?: string; createdAt: string; updatedAt?: string; }`,
  },
  // No app types at all — compiles as-is.
  bodyComposition: { from: null, to: null },
  measurementAnalytics: {
    from: "import { MeasurementEntry, MeasurementField, MEASUREMENT_FIELDS } from '../types';",
    to: `export interface MeasurementEntry { id: string; userId: string; date: string; time?: string;
      weightKg?: number; heightCm?: number; bustCm?: number; chestCm?: number; waistCm?: number;
      hipCm?: number; thighLeftCm?: number; thighRightCm?: number; armLeftCm?: number;
      armRightCm?: number; notes?: string; createdAt: string; updatedAt?: string; }
    export type MeasurementField = 'weightKg' | 'heightCm' | 'bustCm' | 'chestCm' | 'waistCm'
      | 'hipCm' | 'thighLeftCm' | 'thighRightCm' | 'armLeftCm' | 'armRightCm';
    export const MEASUREMENT_FIELDS: { key: MeasurementField; label: string; unit: string; emoji: string }[] = [
      { key: 'weightKg', label: 'Weight', unit: 'kg', emoji: '\u2696' },
      { key: 'bustCm', label: 'Bust', unit: 'cm', emoji: '\u{1F4CF}' },
      { key: 'chestCm', label: 'Chest', unit: 'cm', emoji: '\u{1F4CF}' },
      { key: 'waistCm', label: 'Waist', unit: 'cm', emoji: '\u{1F4D0}' },
      { key: 'hipCm', label: 'Hips', unit: 'cm', emoji: '\u{1F4CF}' },
      { key: 'heightCm', label: 'Height', unit: 'cm', emoji: '\u{1F4CF}' },
      { key: 'thighLeftCm', label: 'Thigh (Left)', unit: 'cm', emoji: '\u{1F4CF}' },
      { key: 'thighRightCm', label: 'Thigh (Right)', unit: 'cm', emoji: '\u{1F4CF}' },
      { key: 'armLeftCm', label: 'Arm (Left)', unit: 'cm', emoji: '\u{1F4CF}' },
      { key: 'armRightCm', label: 'Arm (Right)', unit: 'cm', emoji: '\u{1F4CF}' },
    ];`,
  },
  budgetAnalytics: {
    from: `import {
  ExpenseEntry, FinanceBudget, BudgetPeriod,
  BUDGET_ALERT_DEFAULT, BUDGET_LIMIT_MIN, BUDGET_LIMIT_MAX,
} from '../types';`,
    to: `export type TxnType = 'expense' | 'income';
    export type PaymentType = 'cash' | 'card' | 'upi' | 'bank' | 'other';
    export interface ExpenseEntry { id: string; userId: string; date: string; time?: string;
      amount: number; currency: string; type?: TxnType; category: string; paymentType?: PaymentType;
      account?: string; attachmentUrl?: string; note?: string; tags?: string[]; location?: string;
      transferId?: string; createdAt: string; updatedAt?: string; }
    export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';
    export interface FinanceBudget { id: string; userId: string; categoryKey?: string; limit: number;
      period: BudgetPeriod; startDay?: number; alertThreshold?: number; paused?: boolean;
      createdAt: string; updatedAt?: string; }
    export const BUDGET_LIMIT_MIN = 1;
    export const BUDGET_LIMIT_MAX = 100_000_000;
    export const BUDGET_ALERT_DEFAULT = 80;`,
  },
  sicknessAnalytics: {
    from: "import {\n  SymptomEntry, MedicationEntry, SicknessFeeling, MedicationStatus,\n} from '../types';",
    to: `export type SicknessSeverity = 'mild' | 'moderate' | 'severe';
    export type SicknessFeeling = 'bad' | 'nauseous' | 'queasy' | 'good';
    export type MedicationFoodTiming = 'before_food' | 'after_food' | 'empty_stomach';
    export type MedicationStatus = 'taken' | 'skipped' | 'missed' | 'due';
    export interface SymptomEntry { id: string; userId: string; date: string; time?: string;
      feeling?: SicknessFeeling; symptom: string; severity: SicknessSeverity; temperature?: number;
      temperatureUnit?: 'C' | 'F'; duration?: string; trigger?: string; attachmentUrl?: string;
      notes?: string; createdAt: string; updatedAt?: string; resolved?: boolean; resolvedAt?: string; }
    export interface MedicationEntry { id: string; userId: string; date: string; time: string;
      medication: string; dosage?: string; frequency?: string; foodTiming?: MedicationFoodTiming;
      purpose?: string; status: MedicationStatus; sideEffects?: string[]; reminderEnabled?: boolean;
      reminderRepeat?: string; attachmentUrl?: string; notes?: string; startDate?: string;
      endDate?: string; paused?: boolean; createdAt: string; updatedAt?: string; }`,
  },
  moodAnalytics: {
    from: "import { MoodLog, MoodKey, MoodPeriod, MOOD_META, moodScoreOf } from '../types';",
    to: `export type MoodKey = 'amazing' | 'happy' | 'calm' | 'neutral' | 'sad' | 'anxious' | 'angry' | 'overwhelmed';
    export type MoodScaleLevel = 'very_low' | 'low' | 'neutral' | 'high' | 'very_high';
    export type MoodPeriod = '7d' | '30d' | '3m' | '1y' | 'all';
    export interface MoodLog { id: string; userId: string; date: string; time: string; mood: MoodKey;
      intensity: number; influencers: string[]; activities: string[]; energy?: MoodScaleLevel;
      stress?: MoodScaleLevel; notes?: string; createdAt: string; updatedAt?: string; }
    export const MOOD_META: Record<MoodKey, { label: string; emoji: string; color: string; score: number }> = {
      amazing: { label: 'Amazing', emoji: '🥳', color: '#F97316', score: 10 },
      happy: { label: 'Happy', emoji: '😊', color: '#22C55E', score: 8 },
      calm: { label: 'Calm', emoji: '😌', color: '#14B8A6', score: 7 },
      neutral: { label: 'Neutral', emoji: '😐', color: '#94A3B8', score: 5 },
      sad: { label: 'Sad', emoji: '😢', color: '#3B82F6', score: 3 },
      anxious: { label: 'Anxious', emoji: '😟', color: '#A855F7', score: 3 },
      angry: { label: 'Angry', emoji: '😠', color: '#EF4444', score: 2 },
      overwhelmed: { label: 'Overwhelmed', emoji: '🤯', color: '#DC2626', score: 2 },
    };
    export const POSITIVE_MOODS: MoodKey[] = ['amazing', 'happy', 'calm'];
    export function moodScoreOf(log: Pick<MoodLog, 'mood' | 'intensity'>): number {
      const base = MOOD_META[log.mood].score;
      const positive = POSITIVE_MOODS.includes(log.mood);
      const shift = ((log.intensity - 5.5) / 4.5) * 1.5;
      return Math.max(1, Math.min(10, Math.round((base + (positive ? shift : -shift)) * 10) / 10));
    }`,
  },
  intimacyAnalytics: {
    from: "import {\n  IntimacyEntry, IntimacyFeeling, IntimacyMoodAfter, IntimacyPeriod,\n} from '../types';",
    to: `export type IntimacyWho = 'partner' | 'self_love';
    export type ProtectionStatus = 'protected' | 'unprotected';
    export type IntimacyFeeling = 'loved' | 'happy' | 'relaxed' | 'passionate' | 'neutral' | 'disappointed';
    export type IntimacyMoodAfter = 'amazing' | 'good' | 'ok' | 'low';
    export type IntimacyPeriod = 'month' | 'year' | 'all';
    export interface IntimacyEntry { id: string; userId: string; date: string; time: string;
      who: IntimacyWho; protection?: ProtectionStatus; feeling?: IntimacyFeeling;
      moodAfter?: IntimacyMoodAfter; notes?: string; createdAt: string; updatedAt?: string; }`,
  },
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tracker-tests-'));

function compile(name) {
  const src = fs.readFileSync(path.join(UTILS, `${name}.ts`), 'utf8');
  const shim = SHIMS[name];
  if (shim.from && !src.includes(shim.from)) {
    throw new Error(`${name}: import line changed — update the shim in run.js`);
  }
  fs.writeFileSync(
    path.join(tmp, `${name}.ts`),
    shim.from ? src.replace(shim.from, shim.to) : src,
  );
  execFileSync(TSC, [
    path.join(tmp, `${name}.ts`), '--outDir', path.join(tmp, 'out'),
    '--module', 'commonjs', '--target', 'es2020', '--strict', '--skipLibCheck', '--lib', 'es2020',
  ], { stdio: 'inherit' });
  return require(path.join(tmp, 'out', `${name}.js`));
}

// ── Tiny assertion harness ───────────────────────────────────────────────────
let pass = 0;
let fail = 0;
let suite = '';

const describe = (name) => { suite = name; console.log(`\n── ${name} ──`); };
const eq = (name, got, want) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) pass++;
  else { fail++; console.log(`  FAIL ${suite} › ${name}\n    got  ${g}\n    want ${w}`); }
};

const modules = {};
for (const name of Object.keys(SHIMS)) modules[name] = compile(name);

for (const file of [
  'sleep.test.js', 'water.test.js', 'period.test.js',
  'intimacy.test.js', 'bmi.test.js', 'mood.test.js', 'sickness.test.js',
  'budget.test.js', 'measurement.test.js',
]) {
  require(path.join(__dirname, file))({ ...modules, describe, eq });
}

fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\n${pass}/${pass + fail} assertions passed`);
process.exit(fail ? 1 : 0);
