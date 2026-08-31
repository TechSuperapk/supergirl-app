/**
 * waterAnalytics — the single source of truth for every water figure in the
 * app (spec §27, §37).
 *
 * Water Home and Water History both derive from the same `WaterLogEntry[]`;
 * neither keeps its own copy of the maths. Amounts stay in whole millilitres
 * end to end (§19) and are only converted to litres for display, so totals,
 * averages and percentages never accumulate rounding error.
 *
 * Pure and date-injectable (`ref`) so it can be tested without mocking a clock.
 */
import { WaterLogEntry, WaterPeriod, WaterReminderFrequency } from '../types';

// ── Dates ────────────────────────────────────────────────────────────────────

/**
 * Local calendar date. `toISOString()` converts to UTC first, so for anyone
 * west of Greenwich an evening drink lands on tomorrow's date — or, east of
 * it, an early-morning one lands on yesterday's.
 */
export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const todayISO = (ref: Date = new Date()) => toISO(ref);

export const nowHHMM = (ref: Date = new Date()) =>
  `${String(ref.getHours()).padStart(2, '0')}:${String(ref.getMinutes()).padStart(2, '0')}`;

/** Whole days between two ISO dates, end-exclusive of neither. */
export function daysBetween(startISO: string, endISO: string): number {
  const a = new Date(startISO + 'T00:00:00').getTime();
  const b = new Date(endISO + 'T00:00:00').getTime();
  return Math.round((b - a) / 86400000) + 1;
}

// ── Formatting ───────────────────────────────────────────────────────────────

/**
 * Litres above a litre, millilitres below (§15). 2500 → "2.5 L", 300 → "300 ml"
 * — showing "0.3 L" for a single glass reads as false precision.
 */
export function fmtAmount(ml: number): string {
  if (Math.abs(ml) >= 1000) return `${(ml / 1000).toFixed(1)} L`;
  return `${Math.round(ml)} ml`;
}

/** Always litres, for axes and totals where a common unit matters. */
export const fmtL = (ml: number) => `${(ml / 1000).toFixed(1)} L`;

/** "08:30" → "8:30 AM". */
export function fmtClock(hhmm?: string | null): string {
  if (!hhmm) return '—';
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '—';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// ── Goal percentage (§3, §16) ────────────────────────────────────────────────

/**
 * True percentage of goal — uncapped on purpose.
 *
 * §16 requires an over-goal day to read as its real figure (107%), so the cap
 * belongs on the progress arc alone, not on the number. Capping here would
 * throw the excess away before any screen could show it.
 */
export function goalPercentage(consumedMl: number, goalMl: number): number {
  if (!goalMl || goalMl <= 0) return 0;
  return Math.round((consumedMl / goalMl) * 100);
}

/** 0–1 for drawing a progress arc, where overshoot has nowhere to go. */
export function goalFraction(consumedMl: number, goalMl: number): number {
  if (!goalMl || goalMl <= 0) return 0;
  return Math.max(0, Math.min(1, consumedMl / goalMl));
}

export type GoalState = 'empty' | 'partial' | 'achieved' | 'exceeded';

/** §16's four states. */
export function goalState(consumedMl: number, goalMl: number): GoalState {
  const pct = goalPercentage(consumedMl, goalMl);
  if (pct <= 0) return 'empty';
  if (pct < 100) return 'partial';
  if (pct === 100) return 'achieved';
  return 'exceeded';
}

export const remainingMl = (consumedMl: number, goalMl: number) =>
  Math.max(0, goalMl - consumedMl);

// ── Daily totals ─────────────────────────────────────────────────────────────

/** Date → total ml. The base every other statistic is built from. */
export function totalsByDate(logs: WaterLogEntry[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const l of logs) map[l.date] = (map[l.date] ?? 0) + l.amountMl;
  return map;
}

export const totalFor = (logs: WaterLogEntry[], dateISO: string) =>
  logs.reduce((sum, l) => (l.date === dateISO ? sum + l.amountMl : sum), 0);

/** A day's entries, newest first. */
export const logsFor = (logs: WaterLogEntry[], dateISO: string) =>
  logs.filter(l => l.date === dateISO).sort((a, b) => b.time.localeCompare(a.time));

// ── Period windows (§9.1) ────────────────────────────────────────────────────

export type Window = { start: string; end: string; label: string; days: number };

/** Monday-start week, matching the rest of the app's calendars. */
export function startOfWeek(ref: Date = new Date()): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

const shortDay = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/**
 * Inclusive window for a period, stepped by `offset` (0 = current, -1 = one
 * back). Calendar-aligned rather than rolling: "this month" means the month,
 * not the last 30 days, so the day count in the summary is meaningful.
 */
export function periodWindow(
  period: WaterPeriod, offset = 0, ref: Date = new Date(),
): Window {
  if (period === 'all') {
    return { start: '0000-01-01', end: '9999-12-31', label: 'All time', days: 0 };
  }

  if (period === 'week') {
    const s = startOfWeek(ref);
    s.setDate(s.getDate() + offset * 7);
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    const start = toISO(s);
    const end = toISO(e);
    return { start, end, label: `${shortDay(start)} – ${shortDay(end)}`, days: 7 };
  }

  if (period === 'year') {
    const y = ref.getFullYear() + offset;
    return {
      start: `${y}-01-01`,
      end: `${y}-12-31`,
      label: String(y),
      days: daysBetween(`${y}-01-01`, `${y}-12-31`),
    };
  }

  const d = new Date(ref.getFullYear(), ref.getMonth() + offset, 1);
  const y = d.getFullYear();
  const m = d.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  const mm = String(m + 1).padStart(2, '0');
  return {
    start: `${y}-${mm}-01`,
    end: `${y}-${mm}-${String(last).padStart(2, '0')}`,
    label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    days: last,
  };
}

export const inWindow = (dateISO: string, w: Window) => dateISO >= w.start && dateISO <= w.end;

// ── Period statistics (§9.2, §22) ────────────────────────────────────────────

export type PeriodStats = {
  start: string;
  end: string;
  label: string;
  /** Days in the period — 31 for a full month, even if only 4 were logged. */
  periodDays: number;
  /** Days that actually have entries. */
  loggedDays: number;
  totalMl: number;
  averageMl: number;
  goalPercentage: number;
  bestDate: string | null;
  bestDayMl: number;
  daysMet: number;
  /** Oldest → newest, one point per logged day. */
  daily: { date: string; ml: number; litres: number; met: boolean }[];
};

/**
 * Everything the history header needs for a window.
 *
 * The average divides by days *logged*, not days in the period: a user four
 * days into January shouldn't see their 2 L average reported as 0.26 L because
 * the month has 27 days left in it.
 */
export function periodStats(
  logs: WaterLogEntry[], period: WaterPeriod, goalMl: number, offset = 0, ref: Date = new Date(),
): PeriodStats {
  const w = periodWindow(period, offset, ref);
  const byDate = totalsByDate(logs);
  const dates = Object.keys(byDate).filter(d => inWindow(d, w)).sort();

  const totalMl = dates.reduce((sum, d) => sum + byDate[d], 0);
  const averageMl = dates.length ? Math.round(totalMl / dates.length) : 0;

  // Ties resolve to the most recent day, matching the sleep tracker.
  const bestDate = dates.reduce<string | null>(
    (best, d) => (best == null || byDate[d] >= byDate[best] ? d : best), null,
  );

  const periodDays = period === 'all'
    ? (dates.length ? daysBetween(dates[0], dates[dates.length - 1]) : 0)
    : w.days;

  return {
    start: w.start,
    end: w.end,
    label: w.label,
    periodDays,
    loggedDays: dates.length,
    totalMl,
    averageMl,
    goalPercentage: goalPercentage(averageMl, goalMl),
    bestDate,
    bestDayMl: bestDate ? byDate[bestDate] : 0,
    daysMet: dates.filter(d => goalMl > 0 && byDate[d] >= goalMl).length,
    daily: dates.map(d => ({
      date: d,
      ml: byDate[d],
      litres: Math.round((byDate[d] / 1000) * 10) / 10,
      met: goalMl > 0 && byDate[d] >= goalMl,
    })),
  };
}

// ── Year rollup (§11) ────────────────────────────────────────────────────────

export type MonthBucket = {
  month: number; label: string; totalMl: number; averageMl: number; loggedDays: number;
};

/**
 * Twelve monthly buckets for a year. The year view aggregates rather than
 * listing 365 individual days, which is neither scrollable nor informative.
 */
export function yearByMonth(
  logs: WaterLogEntry[], offset = 0, ref: Date = new Date(),
): MonthBucket[] {
  const year = ref.getFullYear() + offset;
  const byDate = totalsByDate(logs);
  return Array.from({ length: 12 }, (_, m) => {
    const prefix = `${year}-${String(m + 1).padStart(2, '0')}`;
    const dates = Object.keys(byDate).filter(d => d.startsWith(prefix));
    const totalMl = dates.reduce((sum, d) => sum + byDate[d], 0);
    return {
      month: m,
      label: new Date(year, m, 1).toLocaleDateString('en-US', { month: 'short' }),
      totalMl,
      averageMl: dates.length ? Math.round(totalMl / dates.length) : 0,
      loggedDays: dates.length,
    };
  });
}

export function bestMonth(buckets: MonthBucket[]): MonthBucket | null {
  return buckets.reduce<MonthBucket | null>(
    (best, m) => (m.loggedDays > 0 && (!best || m.totalMl > best.totalMl) ? m : best), null,
  );
}

// ── Streaks ──────────────────────────────────────────────────────────────────

/**
 * Consecutive days hitting the goal, counting back from today.
 *
 * Today is skipped rather than counted as a break when it hasn't been met yet:
 * the day is still in progress, and collapsing the streak to zero every
 * morning would punish the user for waking up.
 */
export function goalStreak(
  logs: WaterLogEntry[], goalMl: number, ref: Date = new Date(),
): number {
  if (goalMl <= 0) return 0;
  const byDate = totalsByDate(logs);
  const cursor = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  if ((byDate[toISO(cursor)] ?? 0) < goalMl) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  for (;;) {
    if ((byDate[toISO(cursor)] ?? 0) < goalMl) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ── Consistency message (§9.5) ───────────────────────────────────────────────

export type ConsistencyMessage = { title: string; body: string };

/**
 * Motivational line keyed to what actually happened, not a fixed string.
 *
 * "Consistency is the key!" under a week where the user logged twice would be
 * congratulating them on nothing, so each band gets its own message.
 */
export function consistencyMessage(stats: PeriodStats): ConsistencyMessage {
  if (stats.loggedDays === 0) {
    return {
      title: 'Nothing logged yet',
      body: 'Log a drink and your progress will show up here.',
    };
  }
  const rate = stats.loggedDays ? Math.round((stats.daysMet / stats.loggedDays) * 100) : 0;

  if (rate >= 80) {
    return {
      title: 'Consistency is the key!',
      body: `You hit your goal on ${stats.daysMet} of ${stats.loggedDays} logged days. Keep going, you're doing awesome.`,
    };
  }
  if (rate >= 50) {
    return {
      title: "You're over halfway there",
      body: `Goal met on ${stats.daysMet} of ${stats.loggedDays} days. A glass or two more each day would close the gap.`,
    };
  }
  if (stats.daysMet > 0) {
    return {
      title: 'Every glass counts',
      body: `You reached your goal on ${stats.daysMet} ${stats.daysMet === 1 ? 'day' : 'days'}. Try setting a reminder to stay on track.`,
    };
  }
  return {
    title: 'Small steps first',
    body: "You haven't hit your goal yet in this period. Lowering the target slightly can make it easier to build the habit.",
  };
}

// ── Reminders (§5.7, §26, §33) ───────────────────────────────────────────────

const DAY_MS = 86400000;

/** Whether the reminder frequency covers a given weekday (0 = Sunday). */
function frequencyCoversDay(freq: WaterReminderFrequency, weekday: number): boolean {
  if (freq === 'weekdays') return weekday >= 1 && weekday <= 5;
  if (freq === 'weekends') return weekday === 0 || weekday === 6;
  if (freq === 'none') return false;
  return true;   // daily, custom
}

/**
 * The next moment the reminder will actually fire, or null when reminders are
 * off. Looks forward day by day so a "weekdays" reminder late on Friday
 * correctly reports Monday rather than tomorrow.
 */
export function nextReminder(
  settings: { reminderEnabled?: boolean; reminderTime?: string; reminderFrequency?: WaterReminderFrequency } | null | undefined,
  ref: Date = new Date(),
): Date | null {
  if (!settings?.reminderEnabled) return null;
  const freq = settings.reminderFrequency ?? 'daily';
  if (freq === 'none') return null;

  const time = settings.reminderTime ?? '';
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;

  for (let i = 0; i < 8; i++) {
    const day = new Date(ref.getTime() + i * DAY_MS);
    day.setHours(h, m, 0, 0);
    if (day.getTime() > ref.getTime() && frequencyCoversDay(freq, day.getDay())) return day;
  }
  return null;
}

/** "Today at 10:30 AM" / "Tomorrow at 8:00 AM" / "Mon at 8:00 AM". */
export function nextReminderLabel(next: Date | null, ref: Date = new Date()): string {
  if (!next) return 'Off';
  const clock = fmtClock(nowHHMM(next));
  const today = toISO(ref);
  const tomorrow = toISO(new Date(ref.getTime() + DAY_MS));
  const day = toISO(next);
  if (day === today) return clock;
  if (day === tomorrow) return `Tomorrow, ${clock}`;
  return `${next.toLocaleDateString('en-US', { weekday: 'short' })}, ${clock}`;
}

// ── Validation (§28) ─────────────────────────────────────────────────────────

/** A single entry above this is a mistyped figure, not a drink. */
export const MAX_ENTRY_ML = 5000;
export const MIN_GOAL_ML = 1;
export const MAX_GOAL_ML = 10000;

export function validateEntry(
  amountMl: number, dateISO: string, ref: Date = new Date(),
): string | null {
  if (!Number.isFinite(amountMl) || amountMl <= 0) return 'Enter an amount greater than 0.';
  if (amountMl > MAX_ENTRY_ML) return `That's over ${MAX_ENTRY_ML} ml for one entry — check the amount.`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return 'Choose a valid date.';
  if (dateISO > todayISO(ref)) return "You can't log water for a future date.";
  return null;
}

export function validateGoal(goalMl: number): string | null {
  if (!Number.isFinite(goalMl) || goalMl < MIN_GOAL_ML) return 'Enter a daily goal greater than 0.';
  if (goalMl > MAX_GOAL_ML) return `Enter a daily goal under ${MAX_GOAL_ML} ml.`;
  return null;
}

// ── Today's dashboard (§21) ──────────────────────────────────────────────────

export type WaterDashboard = {
  hasData: boolean;
  dailyGoalMl: number;
  consumedMl: number;
  /** Uncapped — can exceed 100 (§16). */
  percentage: number;
  /** 0–1, for the progress arc. */
  fraction: number;
  state: GoalState;
  remainingMl: number;
  streak: number;
  todayLogs: WaterLogEntry[];
  next: Date | null;
};

export function waterDashboard(
  logs: WaterLogEntry[],
  goalMl: number,
  settings: Parameters<typeof nextReminder>[0],
  ref: Date = new Date(),
): WaterDashboard {
  const today = todayISO(ref);
  const consumedMl = totalFor(logs, today);
  return {
    hasData: logs.length > 0,
    dailyGoalMl: goalMl,
    consumedMl,
    percentage: goalPercentage(consumedMl, goalMl),
    fraction: goalFraction(consumedMl, goalMl),
    state: goalState(consumedMl, goalMl),
    remainingMl: remainingMl(consumedMl, goalMl),
    streak: goalStreak(logs, goalMl, ref),
    todayLogs: logsFor(logs, today),
    next: nextReminder(settings, ref),
  };
}
