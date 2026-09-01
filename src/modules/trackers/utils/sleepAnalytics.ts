/**
 * sleepAnalytics — the single source of truth for every sleep figure shown in
 * the app (spec §28, §35).
 *
 * Sleep Home, Sleep History and Sleep Log all derive from the same
 * `SleepEntry[]`; none of them computes statistics of its own. That matters
 * because the previous split implementation drifted: Home called a week
 * "the last 7 rows in the array" while History called it "since Monday", so
 * the two screens disagreed about the same week whenever a night was missed.
 *
 * Everything here is pure and date-injectable (`ref`) so it can be tested
 * without mocking the clock.
 */
import { SleepEntry } from '../types';

// ── Goal (§5.3) ──────────────────────────────────────────────────────────────

export const GOAL_MIN_MINS = 7 * 60;
export const GOAL_MAX_MINS = 9 * 60;

export type GoalStatus = 'below' | 'met' | 'above';

/** Where a single night falls against the 7–9h band. */
export function goalStatus(mins: number): GoalStatus {
  if (mins < GOAL_MIN_MINS) return 'below';
  if (mins > GOAL_MAX_MINS) return 'above';
  return 'met';
}

export const meetsGoal = (mins: number) => goalStatus(mins) === 'met';

// ── Formatting ───────────────────────────────────────────────────────────────

export const fmtHrs = (mins: number) => `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;
export const fmtHrsLong = (mins: number) => `${Math.floor(mins / 60)} hr ${Math.round(mins % 60)} min`;

/** Minutes-since-midnight → "10:48 PM". */
export function fmtMinutesClock(mins: number | null): string {
  if (mins == null || !Number.isFinite(mins)) return '—';
  const norm = ((Math.round(mins) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** "23:15" → "11:15 PM". Returns "—" for anything unparseable. */
export function fmtClock(hhmm?: string | null): string {
  if (!hhmm) return '—';
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '—';
  return fmtMinutesClock(h * 60 + m);
}

export const todayISO = (ref: Date = new Date()) => toISO(ref);

export function toISO(d: Date): string {
  // Local calendar date, not UTC: `new Date().toISOString()` rolls the date
  // backwards for anyone west of Greenwich in the evening, which would file a
  // night under the wrong day.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Duration (§10.5–§10.7) ───────────────────────────────────────────────────

/**
 * Minutes between a bedtime and a wake time on the same night date.
 *
 * A wake time at or before the bedtime belongs to the next morning
 * (11:30 PM → 6:45 AM = 435), while a later one is a same-day nap
 * (2:00 PM → 4:00 PM = 120).
 */
export function durationMinutes(bedHHMM: string, wakeHHMM: string): number {
  const [bh, bm] = bedHHMM.split(':').map(Number);
  const [wh, wm] = wakeHHMM.split(':').map(Number);
  if (![bh, bm, wh, wm].every(Number.isFinite)) return 0;
  const bed = bh * 60 + bm;
  const wake = wh * 60 + wm;
  return wake > bed ? wake - bed : wake + 1440 - bed;
}

/** Minutes-since-midnight of an ISO datetime, in local time. */
export function clockMinutes(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

// ── Circular time statistics (§6.1, §6.2) ────────────────────────────────────

/**
 * Average of clock times, treated as angles.
 *
 * A plain mean is wrong across midnight: 23:30 and 00:30 average to 12:00 noon,
 * the exact opposite of the right answer. Averaging the unit vectors gives
 * 00:00 as intended.
 */
export function circularAvgMinutes(times: number[]): number | null {
  if (!times.length) return null;
  let sin = 0;
  let cos = 0;
  for (const t of times) {
    const rad = (t / 1440) * 2 * Math.PI;
    sin += Math.sin(rad);
    cos += Math.cos(rad);
  }
  if (Math.abs(sin) < 1e-9 && Math.abs(cos) < 1e-9) return null; // perfectly opposed
  let rad = Math.atan2(sin, cos);
  if (rad < 0) rad += 2 * Math.PI;
  return Math.round((rad / (2 * Math.PI)) * 1440) % 1440;
}

/**
 * Circular standard deviation, in minutes — how much the times scatter.
 *
 * Needs at least two points; a single night has no spread to speak of, and
 * reporting 0 there would claim perfect consistency from one data point.
 */
export function circularSpreadMinutes(times: number[]): number | null {
  if (times.length < 2) return null;
  let sin = 0;
  let cos = 0;
  for (const t of times) {
    const rad = (t / 1440) * 2 * Math.PI;
    sin += Math.sin(rad);
    cos += Math.cos(rad);
  }
  const r = Math.sqrt(sin * sin + cos * cos) / times.length;
  if (r <= 1e-9) return 720;              // maximally scattered
  const sd = Math.sqrt(-2 * Math.log(Math.min(1, r)));  // radians
  return Math.round((sd / (2 * Math.PI)) * 1440);
}

export type Consistency = 'excellent' | 'good' | 'building' | 'inconsistent' | 'unknown';

const CONSISTENCY_LABEL: Record<Consistency, string> = {
  excellent:    'Excellent consistency',
  good:         'Good consistency',
  building:     'Building consistency',
  inconsistent: 'Varied bedtimes',
  unknown:      'Keep logging',
};

/**
 * Consistency from how tightly bedtimes cluster (§5.4).
 *
 * Deliberately not derived from the streak: a streak measures how many nights
 * hit the duration goal, which is a different question from whether they
 * started at the same time.
 */
export function bedtimeConsistency(entries: SleepEntry[]): {
  level: Consistency; label: string; spreadMins: number | null;
} {
  const times = entries
    .map(e => clockMinutes(e.bedtime))
    .filter((m): m is number => m != null);
  const spread = circularSpreadMinutes(times);

  let level: Consistency;
  if (spread == null) level = 'unknown';
  else if (spread <= 30) level = 'excellent';
  else if (spread <= 60) level = 'good';
  else if (spread <= 90) level = 'building';
  else level = 'inconsistent';

  return { level, label: CONSISTENCY_LABEL[level], spreadMins: spread };
}

// ── Calendar weeks (§6.5) ────────────────────────────────────────────────────

/** Monday-start week containing `ref`, matching the Mon–Sun chart axis. */
export function startOfWeek(ref: Date = new Date()): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dow = (d.getDay() + 6) % 7;   // Mon = 0
  d.setDate(d.getDate() - dow);
  return d;
}

export function weekRange(ref: Date = new Date(), weeksAgo = 0): { start: string; end: string } {
  const s = startOfWeek(ref);
  s.setDate(s.getDate() - weeksAgo * 7);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return { start: toISO(s), end: toISO(e) };
}

export const inRange = (e: SleepEntry, start: string, end: string) => e.date >= start && e.date <= end;

export function averageMinutes(entries: SleepEntry[]): number {
  if (!entries.length) return 0;
  return Math.round(entries.reduce((sum, e) => sum + e.durationMins, 0) / entries.length);
}

export type Comparison = { differenceMinutes: number; direction: 'up' | 'down' | 'same' };

/**
 * This calendar week's average against last week's (§6.5).
 *
 * `null` means there is genuinely nothing to compare — showing "no change"
 * in that case would assert a comparison that never happened.
 */
export function weekComparison(entries: SleepEntry[], ref: Date = new Date()): Comparison | null {
  const cur = weekRange(ref, 0);
  const prev = weekRange(ref, 1);
  const curEntries = entries.filter(e => inRange(e, cur.start, cur.end));
  const prevEntries = entries.filter(e => inRange(e, prev.start, prev.end));
  if (!curEntries.length || !prevEntries.length) return null;

  const diff = averageMinutes(curEntries) - averageMinutes(prevEntries);
  return {
    differenceMinutes: diff,
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same',
  };
}

// ── Streak (§6.3) ────────────────────────────────────────────────────────────

/**
 * Consecutive nights that hit the goal band, counting back from today.
 *
 * Spec §6.3: "A night is successful when sleep duration is within the
 * configured goal." A logged-but-short night therefore breaks the streak
 * rather than extending it — the earlier implementation counted any logged
 * night, which quietly rewarded four hours' sleep.
 *
 * Today not yet logged is not a break: the streak is measured from yesterday
 * so it doesn't collapse to zero every morning before the user logs.
 */
export function goalStreak(entries: SleepEntry[], ref: Date = new Date()): number {
  const byDate = new Map(entries.map(e => [e.date, e]));
  const cursor = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  if (!byDate.has(toISO(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  for (;;) {
    const entry = byDate.get(toISO(cursor));
    if (!entry || !meetsGoal(entry.durationMins)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ── Extremes (§6.4, §13.2) ───────────────────────────────────────────────────

/** Longest night in the set; ties resolve to the most recent (§6.4). */
export function bestSleep(entries: SleepEntry[]): SleepEntry | null {
  return entries.reduce<SleepEntry | null>((best, e) => {
    if (!best) return e;
    if (e.durationMins > best.durationMins) return e;
    if (e.durationMins === best.durationMins && e.date > best.date) return e;
    return best;
  }, null);
}

export function lowestSleep(entries: SleepEntry[]): SleepEntry | null {
  return entries.reduce<SleepEntry | null>((low, e) => {
    if (!low) return e;
    if (e.durationMins < low.durationMins) return e;
    if (e.durationMins === low.durationMins && e.date > low.date) return e;
    return low;
  }, null);
}

// ── Chart (§5.5) ─────────────────────────────────────────────────────────────

export type ChartPoint = { label: string; value: number; date: string; hasData: boolean };

/** Seven Mon–Sun points for the current week; missing nights carry hasData:false. */
export function weekChart(entries: SleepEntry[], ref: Date = new Date()): ChartPoint[] {
  const start = startOfWeek(ref);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const date = toISO(d);
    const entry = entries.find(e => e.date === date);
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      value: entry ? Math.round((entry.durationMins / 60) * 10) / 10 : 0,
      date,
      hasData: !!entry,
    };
  });
}

// ── Month & year rollups (§13.2, §13.3) ──────────────────────────────────────

export type MonthSummary = {
  averageMinutes: number;
  best: SleepEntry | null;
  lowest: SleepEntry | null;
  goalAchieved: number;
  daysInMonth: number;
  streak: number;
  entries: SleepEntry[];
};

export function monthSummary(entries: SleepEntry[], ref: Date = new Date()): MonthSummary {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const start = toISO(new Date(year, month, 1));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const end = toISO(new Date(year, month, daysInMonth));
  const scoped = entries.filter(e => inRange(e, start, end));

  return {
    averageMinutes: averageMinutes(scoped),
    best: bestSleep(scoped),
    lowest: lowestSleep(scoped),
    goalAchieved: scoped.filter(e => meetsGoal(e.durationMins)).length,
    daysInMonth,
    streak: goalStreak(entries, ref),
    entries: scoped,
  };
}

export type MonthBucket = { month: number; label: string; averageMinutes: number; nights: number };

/**
 * Twelve monthly averages for the year (§13.3) — the year view aggregates
 * rather than listing every individual night, which would run to 365 rows.
 * Months with no entries are kept so the list reads as a full calendar year.
 */
export function yearByMonth(entries: SleepEntry[], ref: Date = new Date()): MonthBucket[] {
  const year = ref.getFullYear();
  const scoped = entries.filter(e => e.date.startsWith(`${year}-`));
  return Array.from({ length: 12 }, (_, m) => {
    const bucket = scoped.filter(e => Number(e.date.slice(5, 7)) - 1 === m);
    return {
      month: m,
      label: new Date(year, m, 1).toLocaleDateString('en-US', { month: 'long' }),
      averageMinutes: averageMinutes(bucket),
      nights: bucket.length,
    };
  });
}

// ── Recommendation (§8) ──────────────────────────────────────────────────────

/**
 * Advice keyed off the user's own average and bedtime spread.
 *
 * Order matters: duration problems outrank timing ones, because telling
 * somebody averaging five hours to "keep a consistent bedtime" answers a
 * question they didn't ask.
 */
export function recommendation(entries: SleepEntry[], avgMins: number): string {
  if (!entries.length || !avgMins) {
    return 'Keep logging your sleep to receive personalized recommendations.';
  }
  if (avgMins < GOAL_MIN_MINS) {
    const short = GOAL_MIN_MINS - avgMins;
    return `You're averaging ${fmtHrs(avgMins)}, about ${fmtHrs(short)} under your goal. Try going to bed earlier to reach 7–9 hours.`;
  }
  if (avgMins > GOAL_MAX_MINS) {
    return `You're averaging ${fmtHrs(avgMins)}, above your current target. Try maintaining a consistent sleep schedule.`;
  }

  const { level } = bedtimeConsistency(entries);
  if (level === 'inconsistent') {
    return 'Your bedtime varies frequently. Try going to bed around the same time each night.';
  }

  const avgBed = circularAvgMinutes(
    entries.map(e => clockMinutes(e.bedtime)).filter((m): m is number => m != null),
  );
  return avgBed != null
    ? `You're maintaining a healthy sleep schedule at ${fmtHrs(avgMins)} a night, with a typical bedtime of ${fmtMinutesClock(avgBed)}. Keep your bedtime consistent.`
    : `You're maintaining a healthy sleep schedule at ${fmtHrs(avgMins)} a night. Keep your bedtime consistent.`;
}

// ── Dashboard rollup (§22, §28) ──────────────────────────────────────────────

export type SleepDashboard = {
  hasData: boolean;
  averageSleepMinutes: number;
  goal: { minMinutes: number; maxMinutes: number };
  averageBedtimeMinutes: number | null;
  averageWakeMinutes: number | null;
  currentStreak: number;
  best: SleepEntry | null;
  comparison: Comparison | null;
  consistency: ReturnType<typeof bedtimeConsistency>;
  weeklyData: ChartPoint[];
  recentHistory: SleepEntry[];
  recommendation: string;
};

/** Everything Sleep Home renders, computed once from the record set. */
export function sleepDashboard(entries: SleepEntry[], ref: Date = new Date()): SleepDashboard {
  const cur = weekRange(ref, 0);
  const week = entries.filter(e => inRange(e, cur.start, cur.end));
  const avg = averageMinutes(week);
  const bedTimes = week.map(e => clockMinutes(e.bedtime)).filter((m): m is number => m != null);
  const wakeTimes = week.map(e => clockMinutes(e.wakeTime)).filter((m): m is number => m != null);
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));

  return {
    hasData: entries.length > 0,
    averageSleepMinutes: avg,
    goal: { minMinutes: GOAL_MIN_MINS, maxMinutes: GOAL_MAX_MINS },
    averageBedtimeMinutes: circularAvgMinutes(bedTimes),
    averageWakeMinutes: circularAvgMinutes(wakeTimes),
    currentStreak: goalStreak(entries, ref),
    best: bestSleep(week),
    comparison: weekComparison(entries, ref),
    consistency: bedtimeConsistency(week),
    weeklyData: weekChart(entries, ref),
    recentHistory: sorted.slice(0, 3),
    recommendation: recommendation(week, avg),
  };
}
