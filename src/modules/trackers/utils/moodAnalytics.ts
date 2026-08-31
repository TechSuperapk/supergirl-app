/**
 * moodAnalytics — the calculations behind Mood Home, Calendar and Insights
 * (spec §21), as pure functions so they can be tested without a store.
 *
 * §30 and §37 both insist the three screens read the same records and share one
 * scoring rule. Keeping the maths here rather than in each screen is what makes
 * that true rather than merely intended.
 */
import { MoodLog, MoodKey, MoodPeriod, MOOD_META, moodScoreOf } from '../types';

// ── Dates ────────────────────────────────────────────────────────────────────

/**
 * Local calendar date. `toISOString()` converts to UTC first, so an evening
 * mood logged west of Greenwich lands on tomorrow — which puts it on the wrong
 * calendar cell and can silently break a streak.
 */
export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const todayISO = (ref: Date = new Date()) => toISO(ref);

export function addDays(dateISO: string, n: number): string {
  const d = new Date(dateISO + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);

// ── Periods (§20) ────────────────────────────────────────────────────────────

/** How many days a period spans. Null for all-time, which has no fixed length. */
export function periodDays(period: MoodPeriod): number | null {
  if (period === 'all') return null;
  if (period === '7d') return 7;
  if (period === '30d') return 30;
  if (period === '3m') return 90;
  return 365;
}

export type Window = { start: string; end: string } | null;

/**
 * Inclusive window for a period, stepped back by `offset` whole periods.
 * `offset: 1` gives the previous equivalent window, which is what §12's
 * "vs last 30 days" comparison needs.
 */
export function periodWindow(
  period: MoodPeriod, offset = 0, ref: Date = new Date(),
): Window {
  const len = periodDays(period);
  if (len == null) return null;              // all time
  const end = addDays(todayISO(ref), -offset * len);
  return { start: addDays(end, -(len - 1)), end };
}

export const inWindow = (dateISO: string, w: Window) =>
  !w || (dateISO >= w.start && dateISO <= w.end);

export const logsIn = (logs: MoodLog[], period: MoodPeriod, offset = 0, ref: Date = new Date()) =>
  logs.filter(l => inWindow(l.date, periodWindow(period, offset, ref)));

// ── Daily scores (§9, §21) ───────────────────────────────────────────────────

export type DayScore = { date: string; score: number; logs: MoodLog[] };

/**
 * One score per calendar day, oldest first.
 *
 * §21 averages over *logged days*, not over logs, and §22 counts a day once no
 * matter how many times it was logged. Collapsing to days here is what makes
 * both true — averaging raw logs would quietly weight a day someone logged
 * twice as heavily as two separate days.
 *
 * Where a day holds several logs, their scores are averaged. §9 leaves the
 * multi-log rule open; a mean is the choice that doesn't privilege whichever
 * log happened to be first or last.
 */
export function dailyScores(logs: MoodLog[]): DayScore[] {
  const byDate = new Map<string, MoodLog[]>();
  for (const l of logs) {
    const list = byDate.get(l.date);
    if (list) list.push(l); else byDate.set(l.date, [l]);
  }
  return [...byDate.entries()]
    .map(([date, dayLogs]) => ({
      date,
      score: Math.round(
        (dayLogs.reduce((sum, l) => sum + moodScoreOf(l), 0) / dayLogs.length) * 10,
      ) / 10,
      logs: dayLogs,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Average daily score across logged days. Null when nothing is logged. */
export function averageScore(logs: MoodLog[]): number | null {
  const days = dailyScores(logs);
  if (!days.length) return null;
  return Math.round((days.reduce((sum, d) => sum + d.score, 0) / days.length) * 10) / 10;
}

// ── Best day (§13) ───────────────────────────────────────────────────────────

/** Highest-scoring day; ties resolve to the most recent (§13). */
export function bestDay(logs: MoodLog[]): DayScore | null {
  return dailyScores(logs).reduce<DayScore | null>((best, d) => {
    if (!best) return d;
    if (d.score > best.score) return d;
    // dailyScores is oldest-first, so >= keeps walking forward to the latest tie.
    if (d.score === best.score && d.date > best.date) return d;
    return best;
  }, null);
}

export const weekdayName = (dateISO: string) =>
  new Date(dateISO + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });

// ── Period comparison (§12, §26) ─────────────────────────────────────────────

export type Comparison = {
  current: number | null;
  previous: number | null;
  /** current − previous, or null when there's nothing to compare against. */
  change: number | null;
};

/**
 * This period's average against the previous equivalent period (§12).
 *
 * Not the first half of the range against its second half: that measures
 * movement *within* the window, which is a different question and can't
 * honestly be labelled "vs last 30 days". All-time has no previous window, so
 * `change` is null rather than a fabricated zero.
 */
export function periodComparison(
  logs: MoodLog[], period: MoodPeriod, ref: Date = new Date(),
): Comparison {
  const current = averageScore(logsIn(logs, period, 0, ref));
  if (period === 'all') return { current, previous: null, change: null };

  const previous = averageScore(logsIn(logs, period, 1, ref));
  return {
    current,
    previous,
    change: current != null && previous != null
      ? Math.round((current - previous) * 10) / 10
      : null,
  };
}

// ── Distribution (§17) ───────────────────────────────────────────────────────

export type DistributionRow = { mood: MoodKey; count: number; pct: number };

/**
 * Share of records per mood, highest first (§17).
 *
 * Counted per record rather than per day: this answers "which moods do I
 * report", and percentages are computed from raw counts then rounded, so the
 * displayed figures come from unrounded data as §17 requires.
 */
export function distribution(logs: MoodLog[]): DistributionRow[] {
  const counts = {} as Record<MoodKey, number>;
  for (const k of Object.keys(MOOD_META) as MoodKey[]) counts[k] = 0;
  for (const l of logs) if (counts[l.mood] !== undefined) counts[l.mood]++;

  const total = logs.length;
  return (Object.keys(counts) as MoodKey[])
    .map(mood => ({
      mood,
      count: counts[mood],
      pct: total ? Math.round((counts[mood] / total) * 100) : 0,
    }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count
      // Deterministic tie-break, so equal counts don't reorder between renders.
      || (Object.keys(MOOD_META) as MoodKey[]).indexOf(a.mood)
       - (Object.keys(MOOD_META) as MoodKey[]).indexOf(b.mood));
}

export const mostCommonMood = (logs: MoodLog[]): MoodKey | null =>
  distribution(logs)[0]?.mood ?? null;

// ── Triggers (§18) ───────────────────────────────────────────────────────────

export type Trigger = { key: string; count: number; avgScore: number };

/**
 * Influences ranked by how often they appear (§18). One record can contribute
 * to several. `avgScore` rides along so the UI can separate the influences
 * that lift mood from the ones that drag it down.
 */
export function triggers(logs: MoodLog[]): Trigger[] {
  const acc: Record<string, { sum: number; n: number }> = {};
  for (const l of logs) {
    // A duplicate inside one record shouldn't count twice.
    for (const k of new Set(l.influencers ?? [])) {
      (acc[k] ??= { sum: 0, n: 0 });
      acc[k].sum += moodScoreOf(l);
      acc[k].n += 1;
    }
  }
  return Object.entries(acc)
    .map(([key, v]) => ({ key, count: v.n, avgScore: Math.round((v.sum / v.n) * 10) / 10 }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

// ── Streak (§22) ─────────────────────────────────────────────────────────────

/**
 * Consecutive calendar days with a log, counting back from today.
 *
 * Days, not logs (§22, §36): three entries on one day is a one-day streak.
 * Today not yet logged doesn't break it — the day isn't over.
 */
export function streak(logs: MoodLog[], ref: Date = new Date()): number {
  const dates = new Set(logs.map(l => l.date));
  const cursor = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  if (!dates.has(toISO(cursor))) cursor.setDate(cursor.getDate() - 1);

  let n = 0;
  while (dates.has(toISO(cursor))) {
    n++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

// ── Trend (§14) ──────────────────────────────────────────────────────────────

export type TrendPoint = {
  date: string; label: string; value: number; mood: MoodKey; notes?: string;
};

/**
 * One point per logged day, oldest first (§14).
 *
 * Missing dates are simply absent rather than plotted as zero — §14 says not
 * to read a gap as either good or bad, and a zero would draw a crash.
 */
export function trend(logs: MoodLog[]): TrendPoint[] {
  return dailyScores(logs).map(d => {
    const primary = d.logs[d.logs.length - 1];
    return {
      date: d.date,
      label: d.date.slice(5),
      value: d.score,
      mood: primary.mood,
      notes: primary.notes,
    };
  });
}

// ── Heatmap (§15) ────────────────────────────────────────────────────────────

export type HeatColumn = { weekStart: string; days: { date: string; log: MoodLog | null }[] };

/**
 * Week columns × weekday rows, oldest column first (§15).
 *
 * Anchored on the Sunday of the current week so the rightmost column is the
 * week in progress and rows line up with the S–M–T–W–T–F–S labels.
 */
export function heatmap(logs: MoodLog[], weeks = 6, ref: Date = new Date()): HeatColumn[] {
  const byDate = new Map<string, MoodLog>();
  // Later logs win, so a day shows its most recent mood.
  for (const l of [...logs].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))) {
    byDate.set(l.date, l);
  }

  const cursor = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  cursor.setDate(cursor.getDate() - cursor.getDay() - (weeks - 1) * 7);

  const cols: HeatColumn[] = [];
  for (let w = 0; w < weeks; w++) {
    const days: { date: string; log: MoodLog | null }[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = toISO(cursor);
      days.push({ date: iso, log: byDate.get(iso) ?? null });
      cursor.setDate(cursor.getDate() + 1);
    }
    cols.push({ weekStart: days[0].date, days });
  }
  return cols;
}

// ── Calendar (§10) ───────────────────────────────────────────────────────────

/** date → the log to show on that calendar cell (the day's latest). */
export function calendarMap(logs: MoodLog[]): Map<string, MoodLog> {
  const map = new Map<string, MoodLog>();
  for (const l of [...logs].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))) {
    map.set(l.date, l);
  }
  return map;
}

// ── Validation (§7) ──────────────────────────────────────────────────────────

export const NOTES_MAX = 500;

export function validateLog(input: {
  mood?: MoodKey | null; intensity: number; date: string; notes?: string;
}, ref: Date = new Date()): string | null {
  if (!input.mood) return 'Choose how you’re feeling.';
  if (!Number.isFinite(input.intensity) || input.intensity < 1 || input.intensity > 10) {
    return 'Intensity should be between 1 and 10.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return 'Choose a valid date.';
  if (input.date > todayISO(ref)) return "You can't log a mood for a future date.";
  if ((input.notes?.length ?? 0) > NOTES_MAX) return `Notes are limited to ${NOTES_MAX} characters.`;
  return null;
}

// ── Rollup ───────────────────────────────────────────────────────────────────

export type MoodStats = {
  logs: MoodLog[];
  days: DayScore[];
  averageScore: number | null;
  comparison: Comparison;
  best: DayScore | null;
  distribution: DistributionRow[];
  mostCommonMood: MoodKey | null;
  triggers: Trigger[];
  trend: TrendPoint[];
  streak: number;
};

export function statsFor(
  allLogs: MoodLog[], period: MoodPeriod, ref: Date = new Date(),
): MoodStats {
  const scoped = logsIn(allLogs, period, 0, ref);
  return {
    logs: scoped,
    days: dailyScores(scoped),
    averageScore: averageScore(scoped),
    comparison: periodComparison(allLogs, period, ref),
    best: bestDay(scoped),
    distribution: distribution(scoped),
    mostCommonMood: mostCommonMood(scoped),
    triggers: triggers(scoped),
    trend: trend(scoped),
    // Streak is a property of the whole history, not of the selected window.
    streak: streak(allLogs, ref),
  };
}
