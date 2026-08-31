export type MoodLevel = 1 | 2 | 3 | 4 | 5;
export type FlowLevel = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';
export type ExpenseCategory =
  | 'food' | 'shopping' | 'transport' | 'health'
  | 'entertainment' | 'beauty' | 'education' | 'other';

export interface MoodEntry {
  id:        string;
  userId:    string;
  date:      string;          // YYYY-MM-DD
  mood:      MoodLevel;
  emoji:     string;
  notes?:    string;
  energy:    MoodLevel;
  createdAt: string;
}

// ── Mood tracker (rich log) ───────────────────────────────────────────────────
// The legacy MoodEntry above (mood 1–5 + energy) can't express the full mood
// flow, so richer logs live in their own collection. Old MoodEntry data is left
// untouched rather than migrated.
export type MoodKey =
  | 'amazing' | 'happy' | 'calm' | 'neutral'
  | 'sad' | 'anxious' | 'angry' | 'overwhelmed';

/** Shared 5-point scale used for both energy and stress. */
export type MoodScaleLevel = 'very_low' | 'low' | 'neutral' | 'high' | 'very_high';

export interface MoodLog {
  id:          string;
  userId:      string;
  date:        string;              // YYYY-MM-DD
  time:        string;              // HH:mm (24h) — "time logged"
  mood:        MoodKey;
  intensity:   number;              // 1–10
  influencers: string[];            // free-form so custom entries persist
  activities:  string[];            // free-form so custom entries persist
  energy?:     MoodScaleLevel;
  stress?:     MoodScaleLevel;
  notes?:      string;              // up to NOTES_MAX chars
  createdAt:   string;
  updatedAt?:  string;
}

/** Range selector shared by the mood insights + history filters. */
export type MoodPeriod = '7d' | '30d' | '3m' | '1y' | 'all';

export const MOOD_META: Record<MoodKey, { label: string; emoji: string; color: string; score: number }> = {
  amazing:     { label: 'Amazing',     emoji: '🥳', color: '#F97316', score: 10 },
  happy:       { label: 'Happy',       emoji: '😊', color: '#22C55E', score: 8 },
  calm:        { label: 'Calm',        emoji: '😌', color: '#14B8A6', score: 7 },
  neutral:     { label: 'Neutral',     emoji: '😐', color: '#94A3B8', score: 5 },
  sad:         { label: 'Sad',         emoji: '😢', color: '#3B82F6', score: 3 },
  anxious:     { label: 'Anxious',     emoji: '😟', color: '#A855F7', score: 3 },
  angry:       { label: 'Angry',       emoji: '😠', color: '#EF4444', score: 2 },
  overwhelmed: { label: 'Overwhelmed', emoji: '🤯', color: '#DC2626', score: 2 },
};

/** Moods that count toward the "happy streak". */
export const POSITIVE_MOODS: MoodKey[] = ['amazing', 'happy', 'calm'];

export const MOOD_SCALE_META: Record<MoodScaleLevel, { label: string }> = {
  very_low: { label: 'Very Low' },
  low:      { label: 'Low' },
  neutral:  { label: 'Neutral' },
  high:     { label: 'High' },
  very_high:{ label: 'Very High' },
};

export const MOOD_INFLUENCERS = [
  { key: 'Work', emoji: '💼' }, { key: 'Family', emoji: '👨‍👩‍👧' },
  { key: 'Friends', emoji: '👥' }, { key: 'Relationship', emoji: '🖤' },
  { key: 'Exercise', emoji: '🏃' }, { key: 'Sleep', emoji: '🌙' },
  { key: 'Health', emoji: '❤️' }, { key: 'Travel', emoji: '✈️' },
  { key: 'Weather', emoji: '⛅' }, { key: 'Money', emoji: '💰' },
  { key: 'Self-care', emoji: '🧘' },
];

export const MOOD_ACTIVITIES = [
  { key: 'Exercise', emoji: '🏃' }, { key: 'Meditation', emoji: '🧘' },
  { key: 'Music', emoji: '🎵' }, { key: 'Reading', emoji: '📖' },
  { key: 'Shopping', emoji: '🛍️' }, { key: 'Gaming', emoji: '🎮' },
  { key: 'Cooking', emoji: '🍳' }, { key: 'Work', emoji: '💻' },
  { key: 'Study', emoji: '🎓' }, { key: 'Travel', emoji: '✈️' },
];

/** Mood score for a log — the mood's base score nudged by its intensity. */
export function moodScoreOf(log: Pick<MoodLog, 'mood' | 'intensity'>): number {
  const base = MOOD_META[log.mood].score;
  const positive = POSITIVE_MOODS.includes(log.mood);
  // Intensity amplifies whichever direction the mood already points in, so a
  // very intense "angry" scores lower and a very intense "happy" scores higher.
  const shift = ((log.intensity - 5.5) / 4.5) * 1.5;
  return Math.max(1, Math.min(10, Math.round((base + (positive ? shift : -shift)) * 10) / 10));
}

export interface SleepEntry {
  id:           string;
  userId:       string;
  date:         string;       // YYYY-MM-DD (night date)
  bedtime:      string;       // ISO datetime
  wakeTime:     string;       // ISO datetime
  durationMins: number;
  quality:      MoodLevel;
  notes?:       string;
  createdAt:    string;
}

// ── Habit builder ("Add Habit" / Goals) ───────────────────────────────────────
export type RepeatCycle = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

/**
 * Sentinels for the "Last day" / "Last week" choices. Negative so they can
 * never collide with a real date (1–31) or week number (1–4) in the same array.
 */
export const LAST_DAY = -1;
export const LAST_WEEK = -1;

export type CustomIntervalMode =
  | 'every'            // Every day / week / month / year
  | 'everyN'           // Every __ days / weeks / months / years
  | 'anytimeInCycle'   // Anytime in a __-day / week / month / year cycle
  | 'daysOnOff';       // __ days on, __ days off  (Day tab only)

export interface CustomInterval {
  unit:     'day' | 'weekly' | 'monthly' | 'yearly';
  mode:     CustomIntervalMode;
  n?:       number;
  daysOn?:  number;
  daysOff?: number;
}

export type HabitNotificationType = 'push' | 'sound_alarm';
export type ReminderOffset = 'none' | '5m' | '10m' | '15m' | '30m' | '1h' | '12h' | '1d';
export type HabitStatus = 'active' | 'paused' | 'deleted';

export interface Habit {
  id:          string;
  userId:      string;
  name:        string;
  icon:        string;        // emoji (legacy; optional in the builder)
  color:       string;
  frequency:   'daily' | 'weekly';   // legacy field kept for existing screens
  targetDays?: number[];      // 0=Sun, 1=Mon ... (for weekly)
  streak:      number;
  createdAt:   string;

  // ── Add-Habit builder fields (all optional for backward compatibility) ──
  hasTarget?:        boolean;
  targetAmount?:     number;
  targetUnit?:       string;             // "Liters", "km", "Times", ...

  repeatCycle?:      RepeatCycle;
  customInterval?:   CustomInterval;

  // ── Per-cycle repeat selection (all optional; absent = "Anytime") ──
  /** Daily preset: every day, Mon–Fri only, or Sat–Sun only. */
  repeatDailyPreset?: 'all' | 'weekdays' | 'weekends';
  /** Weekly: which days. 0 = Sunday … 6 = Saturday. */
  repeatWeekdays?:    number[];
  /**
   * Monthly by date. 1–31, plus LAST_DAY for "the last day of the month",
   * which is a different rule from 31 — it lands on the 28th in February.
   */
  repeatMonthDays?:   number[];
  /** Monthly by week. 1–4, plus LAST_WEEK for "the last week". */
  repeatMonthWeeks?:  number[];
  /** Yearly: which months. 0 = January … 11 = December. */
  repeatMonths?:      number[];

  timesMode?:        'once' | 'many';
  timesPerPeriod?:   number;             // 1 for once, N for many

  setTimeEnabled?:   boolean;
  times?:            string[];           // ["09:00","17:00"] HH:mm 24h

  notificationType?: HabitNotificationType;
  reminderOffset?:   ReminderOffset;

  startDate?:        string;             // YYYY-MM-DD
  endDate?:          string;             // YYYY-MM-DD

  isBadHabit?:       boolean;
  isPaused?:         boolean;
  status?:           HabitStatus;

  notifIds?:         string[];           // scheduled notification identifiers
  updatedAt?:        string;
}

export interface HabitLog {
  id:        string;
  habitId:   string;
  userId:    string;
  date:      string;          // YYYY-MM-DD
  completed: boolean;
  progress?: number;          // times done today (for N-per-day targets)
  target?:   number;          // target count for that day
}

export interface PeriodEntry {
  id:        string;
  userId:    string;
  startDate: string;
  endDate?:  string;
  flow:      FlowLevel;
  symptoms:  string[];
  notes?:    string;
  /**
   * User-set cycle configuration (Edit Cycle).
   *
   * Optional so every document already stored stays valid — an entry without
   * them simply falls back to the measured average, which is what the feature
   * did before these existed. Set on the most recent cycle, they override the
   * derived figure for predictions.
   */
  cycleLength?:  number;   // days between period starts
  periodLength?: number;   // days of bleeding
  createdAt: string;
}

/** Product-approved bounds for cycle configuration (§11 "very long/short input"). */
export const CYCLE_LENGTH_MIN = 15;
export const CYCLE_LENGTH_MAX = 60;
export const PERIOD_LENGTH_MIN = 1;
export const PERIOD_LENGTH_MAX = 15;

export type PeriodMood = 'happy' | 'calm' | 'neutral' | 'irritated' | 'sad';

/** One day's "Log Today" entry — flow/symptoms/mood/medication/temperature,
 *  decoupled from the cycle start/end boundary (`PeriodEntry`) so a full
 *  daily log can exist for every day of a cycle, not just its endpoints. */
export interface PeriodDayLog {
  id:               string;
  userId:           string;
  date:             string;      // YYYY-MM-DD
  flow:             FlowLevel;
  symptoms:         string[];
  mood?:            PeriodMood;
  medicationTaken?: boolean;
  temperature?:     number;
  temperatureUnit?: 'C' | 'F';
  notes?:           string;
  createdAt:        string;
  updatedAt?:       string;
}

export interface HealthEntry {
  id:          string;
  userId:      string;
  date:        string;
  weight?:     number;        // kg
  steps?:      number;
  waterMl?:    number;
  calories?:   number;
  notes?:      string;
  createdAt:   string;
}

export type TxnType = 'expense' | 'income';
export type PaymentType = 'cash' | 'card' | 'upi' | 'bank' | 'other';

export interface ExpenseEntry {
  id:            string;
  userId:        string;
  date:          string;          // YYYY-MM-DD
  time?:         string;          // HH:mm
  amount:        number;
  currency:      string;
  type?:         TxnType;         // default 'expense'
  category:      string;          // category id — matches FinanceCategory.key
  paymentType?:  PaymentType;
  account?:      string;          // account id — matches FinanceAccount.id
  attachmentUrl?: string;         // bill/receipt (image or pdf)
  note?:         string;
  tags?:         string[];
  location?:     string;
  /** Set on the two rows created by an account-to-account transfer. */
  transferId?:   string;
  createdAt:     string;
  updatedAt?:    string;
}

// ── Finance: user-editable categories ────────────────────────────────────────
/**
 * Categories were hardcoded constants; they're now records so users can add,
 * rename, recolour and hide them. `key` stays stable and is what transactions
 * store, so renaming a category never orphans its transactions.
 */
export interface FinanceCategory {
  id:        string;
  userId:    string;
  key:       string;              // stable slug referenced by ExpenseEntry.category
  label:     string;
  emoji:     string;
  color:     string;
  type:      TxnType;
  /** Hidden categories stay on old transactions but drop out of pickers. */
  hidden?:   boolean;
  /** Lower sorts first; lets users reorder. */
  order?:    number;
  createdAt: string;
  updatedAt?: string;
}

// ── Finance: accounts (cash / bank / wallet / card) ──────────────────────────
export type FinanceAccountKind = 'cash' | 'bank' | 'wallet' | 'card';

export interface FinanceAccount {
  id:            string;
  userId:        string;
  name:          string;
  kind:          FinanceAccountKind;
  emoji:         string;
  /** Balance before any tracked transaction — lets balances start from reality. */
  openingBalance: number;
  archived?:     boolean;
  createdAt:     string;
  updatedAt?:    string;
}

export const ACCOUNT_KIND_META: Record<FinanceAccountKind, { label: string; emoji: string }> = {
  cash:   { label: 'Cash',   emoji: '💵' },
  bank:   { label: 'Bank',   emoji: '🏦' },
  wallet: { label: 'Wallet', emoji: '📱' },
  card:   { label: 'Card',   emoji: '💳' },
};

// ── Finance: budgets (§11) ───────────────────────────────────────────────────

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';

/**
 * A spending limit, either overall or for one category.
 *
 * `categoryKey` absent means the budget covers everything — that's the §11
 * "monthly / overall budget". Present, it scopes to that category, matching
 * `ExpenseEntry.category` so renaming a category never orphans its budget.
 *
 * Only expense transactions count toward a budget; income is not spending.
 */
export interface FinanceBudget {
  id:           string;
  userId:       string;
  /** Undefined = overall budget. Otherwise a FinanceCategory.key. */
  categoryKey?: string;
  limit:        number;
  period:       BudgetPeriod;
  /**
   * Day the budget period rolls over — §14's "Budget Starting Date". 1–28 for
   * monthly (29–31 don't exist in every month), 0–6 for weekly where 0 is
   * Monday. Ignored for yearly, which starts on 1 January.
   */
  startDay?:    number;
  /** Warn at this share of the limit, 0–100. Defaults to 80. */
  alertThreshold?: number;
  /** Paused budgets stay on record but stop warning. */
  paused?:      boolean;
  createdAt:    string;
  updatedAt?:   string;
}

/** Product-approved bounds, used to catch a mistyped figure. */
export const BUDGET_LIMIT_MIN = 1;
export const BUDGET_LIMIT_MAX = 100_000_000;
export const BUDGET_ALERT_DEFAULT = 80;

export const BUDGET_PERIOD_META: Record<BudgetPeriod, { label: string; noun: string }> = {
  weekly:  { label: 'Weekly',  noun: 'week' },
  monthly: { label: 'Monthly', noun: 'month' },
  yearly:  { label: 'Yearly',  noun: 'year' },
};

/** Icon + colour choices offered when creating a category. */
export const CATEGORY_EMOJI_CHOICES = [
  '🍔', '🛒', '🚗', '⛽', '🛍️', '🎬', '🧾', '💊', '📚', '🏠',
  '🏦', '✈️', '🛡️', '🎁', '📈', '💼', '💰', '🏪', '📦', '☕',
];
export const CATEGORY_COLOR_CHOICES = [
  '#FF7043', '#AB47BC', '#42A5F5', '#26A69A', '#EC407A', '#F06292',
  '#5C6BC0', '#78909C', '#8D6E63', '#43A047', '#00897B', '#FFA726',
];

/** Seeded on first run so the tracker is usable immediately. */
export const DEFAULT_EXPENSE_CATEGORIES: Omit<FinanceCategory, 'id' | 'userId' | 'createdAt'>[] = [
  { key: 'food',          label: 'Food & Dining',    emoji: '🍔', color: '#FF7043', type: 'expense', order: 0 },
  { key: 'transport',     label: 'Transport',        emoji: '🚕', color: '#FFB300', type: 'expense', order: 1 },
  { key: 'entertainment', label: 'Entertainment',    emoji: '🎬', color: '#546E7A', type: 'expense', order: 2 },
  { key: 'bills',         label: 'Utilities',        emoji: '🏠', color: '#EF6C00', type: 'expense', order: 3 },
  { key: 'health',        label: 'Health & Fitness', emoji: '🏋️', color: '#26A69A', type: 'expense', order: 4 },
  { key: 'shopping',      label: 'Shopping',         emoji: '🛒', color: '#AB47BC', type: 'expense', order: 5 },
  { key: 'education',     label: 'Education',        emoji: '🎓', color: '#5C6BC0', type: 'expense', order: 6 },
  { key: 'other',         label: 'Others',           emoji: '📦', color: '#9AA0A6', type: 'expense', order: 7 },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<FinanceCategory, 'id' | 'userId' | 'createdAt'>[] = [
  { key: 'salary',     label: 'Salary',            emoji: '💼', color: '#43A047', type: 'income', order: 0 },
  { key: 'freelance',  label: 'Freelance',         emoji: '🚕', color: '#FFB300', type: 'income', order: 1 },
  { key: 'investment', label: 'Investments',       emoji: '📈', color: '#546E7A', type: 'income', order: 2 },
  { key: 'rental',     label: 'Rental Income',     emoji: '🏠', color: '#EF6C00', type: 'income', order: 3 },
  { key: 'gift',       label: 'Gifts & Donations', emoji: '🎁', color: '#26A69A', type: 'income', order: 4 },
  { key: 'bonus',      label: 'Bonuses',           emoji: '🎉', color: '#AB47BC', type: 'income', order: 5 },
  { key: 'interest',   label: 'Interest Income',   emoji: '🏦', color: '#5C6BC0', type: 'income', order: 6 },
  { key: 'other',      label: 'Others',            emoji: '💰', color: '#9AA0A6', type: 'income', order: 7 },
];

export interface Milestone {
  id:          string;
  userId:      string;
  type:        string;        // e.g. 'journal_7_day_streak'
  title:       string;
  description: string;
  emoji:       string;
  earnedAt:    string;
}

// ── Intimacy tracker ──────────────────────────────────────────────────────────
export type IntimacyWho          = 'partner' | 'self_love';
export type ProtectionStatus     = 'protected' | 'unprotected';
export type IntimacyFeeling      = 'loved' | 'happy' | 'relaxed' | 'passionate' | 'neutral' | 'disappointed';
export type IntimacyMoodAfter    = 'amazing' | 'good' | 'ok' | 'low';
/** Range selector used by the Intimacy History + Insights filters. */
export type IntimacyPeriod       = 'month' | 'year' | 'all';

export interface IntimacyEntry {
  id:          string;
  userId:      string;
  date:        string;              // YYYY-MM-DD
  time:        string;              // HH:mm (24h)
  who:         IntimacyWho;
  protection?: ProtectionStatus;    // only meaningful when who === 'partner'
  feeling?:    IntimacyFeeling;
  moodAfter?:  IntimacyMoodAfter;
  notes?:      string;
  createdAt:   string;
  updatedAt?:  string;
}

// ── Sickness tracker ──────────────────────────────────────────────────────────
export type SicknessSeverity = 'mild' | 'moderate' | 'severe';
export type SicknessFeeling  = 'bad' | 'nauseous' | 'queasy' | 'good';

export interface SymptomEntry {
  id:            string;
  userId:        string;
  date:          string;            // YYYY-MM-DD
  time?:         string;            // HH:mm
  feeling?:      SicknessFeeling;
  symptom:       string;            // e.g. "Fever", "Headache"
  severity:      SicknessSeverity;
  temperature?:  number;            // stored in the entry's unit
  temperatureUnit?: 'C' | 'F';
  /** How long it lasted, free text e.g. "2 hours", "all day". */
  duration?:     string;
  /** What the user thinks brought it on. */
  trigger?:      string;
  attachmentUrl?: string;
  notes?:        string;
  createdAt:     string;
  updatedAt?:    string;
  resolved?:     boolean;           // marks the symptom as no longer active
  resolvedAt?:   string;            // YYYY-MM-DD — backs recovery-time stats
}

export type MedicationFoodTiming = 'before_food' | 'after_food' | 'empty_stomach';
export type MedicationStatus     = 'taken' | 'skipped' | 'missed' | 'due';

/**
 * A medication the user is on. `date`/`time` describe the schedule's anchor and
 * daily reminder time — individual dose events live in MedicationDose, so
 * adherence can be measured per day without rewriting the schedule.
 */
export interface MedicationEntry {
  id:              string;
  userId:          string;
  date:            string;          // YYYY-MM-DD — legacy anchor / log date
  time:            string;          // HH:mm — the scheduled dose time
  medication:      string;
  dosage?:         string;          // "650 mg"
  frequency?:      string;          // "Once", "Daily", "As needed", ...
  foodTiming?:     MedicationFoodTiming;
  purpose?:        string;
  status:          MedicationStatus;
  sideEffects?:    string[];
  reminderEnabled?: boolean;
  reminderRepeat?: string;          // "Daily", "Alternate days", ...
  attachmentUrl?:  string;
  notes?:          string;
  /** Schedule window. startDate backs the "Started 20 Jul" line in the design. */
  startDate?:      string;          // YYYY-MM-DD
  endDate?:        string;          // YYYY-MM-DD, optional/open-ended
  /** Paused medications stay in history but stop appearing as due. */
  paused?:         boolean;
  createdAt:       string;
  updatedAt?:      string;
}

/**
 * One dose event for a medication on a given day. Kept separate so a single
 * medication can accumulate a taken/missed/skipped history without duplicating
 * its schedule, which is what adherence and the timeline are computed from.
 */
export interface MedicationDose {
  id:            string;
  userId:        string;
  medicationId:  string;
  medicationName: string;           // denormalised so history survives deletion
  date:          string;            // YYYY-MM-DD
  time:          string;            // HH:mm — scheduled time
  status:        MedicationStatus;
  takenAt?:      string;            // ISO timestamp when marked taken
  sideEffects?:  string[];
  notes?:        string;
  createdAt:     string;
  updatedAt?:    string;
}

/** Range selector shared by sickness history + insights. */
export type SicknessPeriod = 'today' | 'week' | 'month' | 'year' | 'all';

export const SIDE_EFFECT_OPTIONS = [
  'Nausea', 'Dizziness', 'Headache', 'Drowsiness',
  'Vomiting', 'Stomach Pain', 'Allergy', 'None', 'Other',
];

// ── Measurement tracker (body measurements, separate from BMI) ───────────────
export interface MeasurementEntry {
  id:              string;
  userId:          string;
  date:            string;          // YYYY-MM-DD
  time?:           string;
  weightKg?:       number;
  heightCm?:       number;
  bustCm?:         number;
  waistCm?:        number;
  hipCm?:          number;
  chestCm?:        number;
  thighLeftCm?:    number;
  thighRightCm?:   number;
  armLeftCm?:      number;
  armRightCm?:     number;
  notes?:          string;
  createdAt:       string;
  updatedAt?:      string;
}

export type MeasurementField =
  | 'weightKg' | 'heightCm' | 'bustCm' | 'chestCm' | 'waistCm' | 'hipCm'
  | 'thighLeftCm' | 'thighRightCm' | 'armLeftCm' | 'armRightCm';

// ── Water tracker (dedicated, separate from the legacy combined Health screen) ─
export interface WaterLogEntry {
  id:        string;
  userId:    string;
  date:      string;      // YYYY-MM-DD
  time:      string;      // HH:mm
  amountMl:  number;
  notes?:    string;      // up to 500 chars
  createdAt: string;
  updatedAt?: string;
}

/** How often the drink-water reminder repeats. */
export type WaterReminderFrequency = 'none' | 'daily' | 'weekdays' | 'weekends' | 'custom';

export interface WaterSettings {
  id?:                 string;
  userId:              string;
  dailyGoalMl:         number;
  reminderEnabled?:    boolean;
  reminderTime?:       string;   // HH:mm
  reminderFrequency?:  WaterReminderFrequency;
  updatedAt:           string;
}

/** Range selector for water history + analytics. */
export type WaterPeriod = 'week' | 'month' | 'year' | 'all';

/** Preset quick-add amounts (ml) offered on the log screen. */
export const WATER_QUICK_AMOUNTS = [100, 150, 200, 250, 300, 500, 750, 1000];

/** Preset daily goals (ml). */
export const WATER_GOAL_PRESETS = [1000, 1500, 2000, 2500, 3000, 3500];

export interface WaterAchievement {
  key:      string;
  label:    string;
  emoji:    string;
  detail:   string;
  unlocked: boolean;
}

// ── BMI tracker (dedicated, separate from body-measurements) ─────────────────
export type BMICategory = 'underweight' | 'normal' | 'overweight' | 'obese' | 'severely_obese';

export interface BMIEntry {
  id:        string;
  userId:    string;
  date:      string;      // YYYY-MM-DD
  time?:     string;      // HH:mm
  heightCm:  number;
  weightKg:  number;
  bmi:       number;
  category:  BMICategory;
  notes?:    string;
  /**
   * Optional body-composition readings, typed in by the user from a smart
   * scale or a body-comp scan.
   *
   * Every one is optional and none of them participates in the BMI
   * calculation: height + weight → BMI → save has to work with all of these
   * blank. They're stored on the measurement rather than separately because
   * they're taken at the same moment as the weight and only mean anything
   * alongside it.
   */
  bodyFatPct?:    number;   // %
  muscleMassKg?:  number;   // kg
  visceralFat?:   number;   // unitless scale rating
  bodyWaterPct?:  number;   // %
  boneMassKg?:    number;   // kg
  createdAt: string;
}

/** Plausible ranges, used to catch a mistyped digit rather than to judge. */
export const BODY_COMP_BOUNDS = {
  bodyFatPct:   { min: 1,   max: 70,  label: 'Body fat',    unit: '%'  },
  muscleMassKg: { min: 1,   max: 120, label: 'Muscle mass', unit: 'kg' },
  visceralFat:  { min: 1,   max: 60,  label: 'Visceral fat', unit: ''  },
  bodyWaterPct: { min: 20,  max: 80,  label: 'Body water',  unit: '%'  },
  boneMassKg:   { min: 0.5, max: 10,  label: 'Bone mass',   unit: 'kg' },
} as const;

export type BodyCompField = keyof typeof BODY_COMP_BOUNDS;

/** What the user is aiming for (§4). Independent of the BMI calculation. */
export type WeightGoalType = 'lose' | 'maintain' | 'gain';

export interface WeightGoalSettings {
  id?:            string;
  userId:         string;
  targetWeightKg: number;
  /** Optional — an older saved goal may predate this field. */
  goalType?:      WeightGoalType;
  /** Optional target date for reaching the goal weight. */
  targetDate?:    string;           // YYYY-MM-DD
  /**
   * Date of birth and sex live here rather than on User because they're only
   * needed for body-composition estimates. Without both, those metrics report
   * "needs profile" instead of guessing.
   */
  dob?:           string;           // YYYY-MM-DD
  sex?:           'female' | 'male';
  updatedAt:      string;
}

/** Range selector for BMI progress charts + analytics. */
export type BMIPeriod = '7d' | '30d' | '3m' | '6m' | '1y' | 'all';

export const MEASUREMENT_FIELDS: { key: MeasurementField; label: string; unit: string; emoji: string }[] = [
  { key: 'weightKg',     label: 'Weight',       unit: 'kg', emoji: '⚖️' },
  { key: 'bustCm',       label: 'Bust',         unit: 'cm', emoji: '📏' },
  { key: 'chestCm',      label: 'Chest',        unit: 'cm', emoji: '📏' },
  { key: 'waistCm',      label: 'Waist',        unit: 'cm', emoji: '📐' },
  { key: 'hipCm',        label: 'Hips',         unit: 'cm', emoji: '📏' },
  { key: 'heightCm',     label: 'Height',       unit: 'cm', emoji: '📏' },
  { key: 'thighLeftCm',  label: 'Thigh (Left)', unit: 'cm', emoji: '📏' },
  { key: 'thighRightCm', label: 'Thigh (Right)', unit: 'cm', emoji: '📏' },
  { key: 'armLeftCm',    label: 'Arm (Left)',   unit: 'cm', emoji: '📏' },
  { key: 'armRightCm',   label: 'Arm (Right)',  unit: 'cm', emoji: '📏' },
];
