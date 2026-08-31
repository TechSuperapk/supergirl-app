/**
 * periodAnalytics — the cycle calculations from spec §5, as pure functions.
 *
 * §14 step 3 asks for these to be testable in isolation, and they need to be:
 * a wrong cycle-day boundary or a mis-derived phase is invisible in the UI but
 * changes what the feature tells someone about their body.
 *
 * Nothing here fabricates data. Every function that can't answer honestly
 * returns `null` so the screen can show a "not enough data" state (§3.3),
 * rather than a plausible-looking number with nothing behind it.
 */
import { PeriodEntry, PeriodDayLog, PeriodMood } from '../types';

// ── Dates ────────────────────────────────────────────────────────────────────

/**
 * Local calendar date. `toISOString()` shifts to UTC first, which moves the
 * date across midnight for most of the world — and a cycle day that is off by
 * one is wrong on every screen at once.
 */
export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const todayISO = (ref: Date = new Date()) => toISO(ref);

export const parseISO = (dateISO: string) => new Date(dateISO + 'T00:00:00');

export function addDays(dateISO: string, n: number): string {
  const d = parseISO(dateISO);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Whole days from `a` to `b`; negative when `b` is earlier. */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}

export function addMonths(dateISO: string, n: number): string {
  const d = parseISO(dateISO);
  d.setMonth(d.getMonth() + n);
  return toISO(d);
}

// ── Cycle ordering ───────────────────────────────────────────────────────────

/** Newest first — the order almost every calculation below wants. */
export const sortCycles = (entries: PeriodEntry[]) =>
  [...entries].sort((a, b) => b.startDate.localeCompare(a.startDate));

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;

/**
 * A cycle length is only real once a *second* period start exists to measure
 * to. Gaps outside 15–60 days are treated as a missed cycle or a typo rather
 * than a genuine length, since including them would drag the average badly.
 */
export function measuredCycleLengths(entries: PeriodEntry[], limit = 6): number[] {
  const sorted = sortCycles(entries);
  const out: number[] = [];
  for (let i = 0; i < sorted.length - 1 && out.length < limit; i++) {
    const diff = daysBetween(sorted[i + 1].startDate, sorted[i].startDate);
    if (diff >= 15 && diff <= 60) out.push(diff);
  }
  return out;
}

/** Duration in days of every completed (ended) period. */
export function measuredPeriodLengths(entries: PeriodEntry[]): number[] {
  return entries
    .filter(e => e.endDate)
    .map(e => daysBetween(e.startDate, e.endDate!) + 1)
    .filter(len => len >= 1 && len <= 15);
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export const averageCycleLength = (entries: PeriodEntry[]): number | null => {
  const lens = measuredCycleLengths(entries);
  return lens.length ? Math.round(mean(lens)) : null;
};

export const averagePeriodLength = (entries: PeriodEntry[]): number | null => {
  const lens = measuredPeriodLengths(entries);
  return lens.length ? Math.round(mean(lens)) : null;
};

/**
 * The cycle length to predict with.
 *
 * Precedence is deliberate: what the user explicitly set in Edit Cycle beats
 * what we measured, because they know about the cycle we haven't seen yet.
 * The 28-day default is last, and callers can tell it apart via `source`.
 */
export function effectiveCycleLength(entries: PeriodEntry[]): {
  length: number; source: 'configured' | 'measured' | 'default';
} {
  const latest = sortCycles(entries)[0];
  if (latest?.cycleLength) return { length: latest.cycleLength, source: 'configured' };
  const measured = averageCycleLength(entries);
  if (measured) return { length: measured, source: 'measured' };
  return { length: DEFAULT_CYCLE_LENGTH, source: 'default' };
}

export function effectivePeriodLength(entries: PeriodEntry[]): {
  length: number; source: 'configured' | 'measured' | 'default';
} {
  const latest = sortCycles(entries)[0];
  if (latest?.periodLength) return { length: latest.periodLength, source: 'configured' };
  const measured = averagePeriodLength(entries);
  if (measured) return { length: measured, source: 'measured' };
  return { length: DEFAULT_PERIOD_LENGTH, source: 'default' };
}

// ── Cycle day & prediction (§5) ──────────────────────────────────────────────

/** Day 1 is the start date itself (§5). Null before any cycle is recorded. */
export function cycleDayOn(entries: PeriodEntry[], dateISO: string): number | null {
  const start = sortCycles(entries).find(e => e.startDate <= dateISO)?.startDate;
  if (!start) return null;
  const day = daysBetween(start, dateISO) + 1;
  return day >= 1 ? day : null;
}

export type Prediction = {
  nextStart: string | null;
  nextEnd: string | null;
  cycleLength: number;
  periodLength: number;
  /** False when the length is only the 28-day default — label it as such. */
  grounded: boolean;
};

/**
 * Next period estimate = last start + effective cycle length (§5).
 *
 * `grounded` is false when nothing but the default backs it, so the UI can
 * present it as a placeholder instead of an estimate the user might plan
 * around. Predictions are estimates from logged history, never a diagnosis.
 */
export function predict(entries: PeriodEntry[]): Prediction {
  const latest = sortCycles(entries)[0];
  const cycle = effectiveCycleLength(entries);
  const period = effectivePeriodLength(entries);

  if (!latest) {
    return {
      nextStart: null, nextEnd: null,
      cycleLength: cycle.length, periodLength: period.length, grounded: false,
    };
  }

  const nextStart = addDays(latest.startDate, cycle.length);
  return {
    nextStart,
    nextEnd: addDays(nextStart, period.length - 1),
    cycleLength: cycle.length,
    periodLength: period.length,
    grounded: cycle.source !== 'default',
  };
}

/** Ovulation ≈ 14 days before the next period (luteal phase is the stable part). */
export function ovulationDate(entries: PeriodEntry[]): string | null {
  const { nextStart } = predict(entries);
  return nextStart ? addDays(nextStart, -14) : null;
}

export function fertileWindow(entries: PeriodEntry[]): { start: string; end: string } | null {
  const ov = ovulationDate(entries);
  // Sperm survive ~5 days; the egg ~1. The window is asymmetric for that reason.
  return ov ? { start: addDays(ov, -5), end: addDays(ov, 1) } : null;
}

export type Phase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

/** Which phase a date falls in. Null with no history — a guess would be worse. */
export function phaseOn(entries: PeriodEntry[], dateISO: string): Phase | null {
  if (!entries.length) return null;

  // A logged bleeding day is menstrual regardless of arithmetic.
  const covering = entries.find(e => dateISO >= e.startDate && dateISO <= (e.endDate ?? e.startDate));
  if (covering) return 'menstrual';

  const day = cycleDayOn(entries, dateISO);
  if (day == null) return null;

  const ov = ovulationDate(entries);
  const latest = sortCycles(entries).find(e => e.startDate <= dateISO);
  if (ov && latest) {
    const ovDay = daysBetween(latest.startDate, ov) + 1;
    if (Math.abs(day - ovDay) <= 1) return 'ovulation';
    return day < ovDay ? 'follicular' : 'luteal';
  }
  return day <= effectivePeriodLength(entries).length ? 'menstrual' : 'follicular';
}

/** Dates the next period is estimated to cover, for calendar shading. */
export function predictedPeriodDays(entries: PeriodEntry[]): Set<string> {
  const set = new Set<string>();
  const { nextStart, periodLength } = predict(entries);
  if (!nextStart) return set;
  for (let i = 0; i < periodLength; i++) set.add(addDays(nextStart, i));
  return set;
}

/** Every date covered by a logged period, for calendar shading. */
export function loggedPeriodDays(entries: PeriodEntry[]): Set<string> {
  const set = new Set<string>();
  for (const e of entries) {
    const end = e.endDate ?? e.startDate;
    let cur = e.startDate;
    // Bounded: bad data must not spin forever.
    for (let i = 0; i < 20 && cur <= end; i++) { set.add(cur); cur = addDays(cur, 1); }
  }
  return set;
}

// ── Regularity (§5) ──────────────────────────────────────────────────────────

/**
 * How consistent recent cycles are, 0–100.
 *
 * Coefficient of variation inverted, so identical cycles score 100 and wildly
 * varying ones approach 0. Needs two measured cycles; one cycle has no
 * variation to speak of and scoring it 100% would be flattery, not data.
 */
export function cycleRegularity(entries: PeriodEntry[]): number | null {
  const lens = measuredCycleLengths(entries);
  if (lens.length < 2) return null;
  const avg = mean(lens);
  if (avg <= 0) return null;
  const sd = Math.sqrt(mean(lens.map(v => (v - avg) ** 2)));
  return Math.max(0, Math.min(100, Math.round(100 - (sd / avg) * 100)));
}

export const shortestCycle = (entries: PeriodEntry[]) => {
  const lens = measuredCycleLengths(entries);
  return lens.length ? Math.min(...lens) : null;
};
export const longestCycle = (entries: PeriodEntry[]) => {
  const lens = measuredCycleLengths(entries);
  return lens.length ? Math.max(...lens) : null;
};

// ── Symptoms (§5) ────────────────────────────────────────────────────────────

export type SymptomStat = { symptom: string; days: number; trackedDays: number; pct: number };

/**
 * Symptom prevalence: days containing the symptom ÷ days actually tracked (§5).
 *
 * Two rules the previous implementation broke, both of which inflate or
 * deflate every figure on the Insights screen:
 *
 *  1. The denominator is *tracked days*, not the total number of symptom
 *     mentions. Dividing by mentions turns the number into "share of all
 *     symptoms logged", so cramps every single day alongside one other
 *     symptom reads 50% — implying they happen half the time when they
 *     happen always.
 *  2. Untracked days are excluded entirely, never counted as symptom-free
 *     (§5). Someone who logs only on bad days would otherwise appear to have
 *     symptoms far less often than they do.
 *
 * Only daily logs count. Cycle-level symptoms describe a whole period rather
 * than a day, so mixing them in double-counts anything recorded in both.
 */
export function symptomStats(dayLogs: PeriodDayLog[], limit = 5): SymptomStat[] {
  const trackedDays = new Set(dayLogs.map(l => l.date)).size;
  if (!trackedDays) return [];

  const daysWith: Record<string, Set<string>> = {};
  for (const log of dayLogs) {
    for (const sym of log.symptoms ?? []) {
      (daysWith[sym] ??= new Set()).add(log.date);
    }
  }

  return Object.entries(daysWith)
    .map(([symptom, dates]) => ({
      symptom,
      days: dates.size,
      trackedDays,
      pct: Math.round((dates.size / trackedDays) * 100),
    }))
    .sort((a, b) => b.days - a.days || a.symptom.localeCompare(b.symptom))
    .slice(0, limit);
}

export type MoodStat = { mood: PeriodMood; count: number; pct: number };

const MOODS: PeriodMood[] = ['happy', 'calm', 'neutral', 'irritated', 'sad'];

/** Mood split across days where a mood was recorded. */
export function moodStats(dayLogs: PeriodDayLog[]): MoodStat[] {
  const counts = {} as Record<PeriodMood, number>;
  for (const m of MOODS) counts[m] = 0;
  let total = 0;
  for (const l of dayLogs) {
    if (l.mood && counts[l.mood] !== undefined) { counts[l.mood]++; total++; }
  }
  return MOODS
    .map(mood => ({
      mood,
      count: counts[mood],
      pct: total ? Math.round((counts[mood] / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// ── Streak (§3.3) ────────────────────────────────────────────────────────────

/**
 * Consecutive days with a log, counting back from today.
 *
 * Today not yet logged doesn't break it — the day isn't over, and resetting to
 * zero every midnight would make the number useless.
 */
export function loggingStreak(dayLogs: PeriodDayLog[], ref: Date = new Date()): number {
  const dates = new Set(dayLogs.map(l => l.date));
  const cursor = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  if (!dates.has(toISO(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (dates.has(toISO(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ── Ranges (§3.3) ────────────────────────────────────────────────────────────

export type InsightRange = '3m' | '6m' | '12m' | 'all';

export const RANGE_LABEL: Record<InsightRange, string> = {
  '3m': '3 months', '6m': '6 months', '12m': '12 months', all: 'All time',
};

/** Inclusive cutoff date for a range; '0000-01-01' for all time. */
export function rangeStart(range: InsightRange, ref: Date = new Date()): string {
  if (range === 'all') return '0000-01-01';
  const months = range === '3m' ? 3 : range === '6m' ? 6 : 12;
  return addMonths(toISO(ref), -months);
}

// ── Cycle history chart ──────────────────────────────────────────────────────

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type CyclePoint = { label: string; value: number; inProgress: boolean };

/**
 * Cycle-length trend, oldest → newest, labelled by the month each cycle began.
 *
 * A sequence number ("C1, C2") tells you nothing about *when* a long cycle
 * happened, which is the only reason to look at the trend.
 *
 * The running cycle is appended as `inProgress` so a user with one logged
 * period sees something real ("day N so far") instead of an empty chart —
 * a measurement, not a prediction, and the chart draws it distinctly.
 */
export function cycleHistory(entries: PeriodEntry[], ref: Date = new Date()): CyclePoint[] {
  const sorted = sortCycles(entries);
  const lens = measuredCycleLengths(entries);

  const completed = lens
    .map((value, i) => {
      const startedAt = sorted[i + 1]?.startDate;
      return {
        label: startedAt ? MONTH_ABBR[Number(startedAt.slice(5, 7)) - 1] : '',
        value,
        inProgress: false,
      };
    })
    .reverse();

  const latest = sorted[0];
  const active = entries.find(e => !e.endDate);
  if (!latest || active) return completed;

  const day = daysBetween(latest.startDate, toISO(ref)) + 1;
  if (day < 1) return completed;

  return [
    ...completed,
    { label: MONTH_ABBR[Number(latest.startDate.slice(5, 7)) - 1] ?? '', value: day, inProgress: true },
  ];
}

/**
 * Share of measured cycles landing within ±2 days of the running average —
 * how often the estimate would have been close. A plain hit-rate rather than a
 * derived confidence score, so it stays interpretable.
 */
export function predictionAccuracy(entries: PeriodEntry[]): number | null {
  const lens = measuredCycleLengths(entries);
  if (lens.length < 2) return null;
  const avg = mean(lens);
  return Math.round((lens.filter(l => Math.abs(l - avg) <= 2).length / lens.length) * 100);
}

// ── Validation (§11) ─────────────────────────────────────────────────────────

export function validateCycleEdit(
  entries: PeriodEntry[],
  cycleId: string | null,
  startDate: string,
  endDate: string | null,
  cycleLength: number,
  periodLength: number,
  ref: Date = new Date(),
): string | null {
  if (startDate > todayISO(ref)) return "A period can't start in the future.";
  if (endDate && endDate < startDate) return 'The end date is before the start date.';

  const days = endDate ? daysBetween(startDate, endDate) + 1 : null;
  // 15 days of continuous bleeding is a data-entry mistake far more often than
  // a real period, and it would badly distort every average.
  if (days != null && days > 15) return 'That period is longer than 15 days — check the dates.';

  if (!Number.isFinite(cycleLength) || cycleLength < 15 || cycleLength > 60) {
    return 'Cycle length should be between 15 and 60 days.';
  }
  if (!Number.isFinite(periodLength) || periodLength < 1 || periodLength > 15) {
    return 'Period length should be between 1 and 15 days.';
  }
  if (days != null && periodLength !== days) {
    // Not fatal, but the two would contradict each other on the calendar.
    return `You've set a ${periodLength}-day period but the dates cover ${days}. Adjust one of them.`;
  }
  if (entries.some(e => e.id !== cycleId && e.startDate === startDate)) {
    return 'Another cycle already starts on that date.';
  }
  return null;
}
