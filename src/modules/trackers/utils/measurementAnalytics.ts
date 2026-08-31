/**
 * measurementAnalytics — per-field series, extremes, change and the wording
 * used to describe it (§10, §15, §16).
 *
 * The tone rule from §16 lives here rather than in each screen: a body
 * measurement going up or down is **not** good or bad. This module never
 * returns a judgement, a colour, or a word like "lost", "gained", "better" or
 * "goal" — only the direction and the size of the change. Screens render what
 * they're given, so there's one place to get this right and one place to check
 * it.
 *
 * That matters beyond spec compliance: this tracker is used by people who are
 * pregnant, building muscle, recovering from illness, or in recovery from
 * disordered eating. An interface that congratulates a smaller number is
 * actively harmful to some of them.
 */
import { MeasurementEntry, MeasurementField, MEASUREMENT_FIELDS } from '../types';

// ── Dates ────────────────────────────────────────────────────────────────────

/** Local calendar date — `toISOString()` shifts to UTC and moves the day. */
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

// ── Periods (§10) ────────────────────────────────────────────────────────────

export type MeasurementPeriod = 'week' | 'month' | 'year' | 'all';

/** Inclusive cutoff for a period; null for all time. */
export function periodStart(period: MeasurementPeriod, ref: Date = new Date()): string | null {
  if (period === 'all') return null;
  const today = todayISO(ref);
  if (period === 'week') return addDays(today, -6);
  if (period === 'month') return addDays(today, -29);
  return addDays(today, -364);
}

export function entriesIn(
  entries: MeasurementEntry[], period: MeasurementPeriod, ref: Date = new Date(),
): MeasurementEntry[] {
  const start = periodStart(period, ref);
  return start ? entries.filter(e => e.date >= start) : entries;
}

// ── Records (§26) ────────────────────────────────────────────────────────────

/** Oldest first — the order every trend and comparison below wants. */
export const sortEntries = (entries: MeasurementEntry[]) =>
  [...entries].sort((a, b) => a.date.localeCompare(b.date)
    || (a.time ?? '').localeCompare(b.time ?? ''));

/** The most recent record, which the dashboard shows (§26). */
export const latestEntry = (entries: MeasurementEntry[]): MeasurementEntry | null =>
  sortEntries(entries).slice(-1)[0] ?? null;

/** Records for a date — used to offer "update" instead of duplicating (§8). */
export const entryOn = (entries: MeasurementEntry[], dateISO: string) =>
  entries.find(e => e.date === dateISO) ?? null;

export const fieldMeta = (key: MeasurementField) =>
  MEASUREMENT_FIELDS.find(f => f.key === key)
  ?? { key, label: key, unit: '', emoji: '📏' };

// ── Per-field series (§10, §15) ──────────────────────────────────────────────

export type FieldPoint = { date: string; value: number };

/**
 * Every recorded value for one field, oldest first.
 *
 * §32 says users shouldn't have to enter every measurement every time, so
 * records are routinely partial. A field simply skips the records where it
 * wasn't filled in — it is never treated as zero, which would draw a crash to
 * the axis and wreck both the extremes and the total change.
 */
export function seriesFor(entries: MeasurementEntry[], field: MeasurementField): FieldPoint[] {
  return sortEntries(entries)
    .filter(e => typeof e[field] === 'number' && Number.isFinite(e[field] as number))
    .map(e => ({ date: e.date, value: e[field] as number }));
}

export type FieldStats = {
  field: MeasurementField;
  label: string;
  unit: string;
  points: FieldPoint[];
  first: FieldPoint | null;
  latest: FieldPoint | null;
  highest: FieldPoint | null;
  lowest: FieldPoint | null;
  /** latest − first. Null with fewer than two readings. */
  totalChange: number | null;
  /** Change as a share of the first reading. Null when it can't be computed. */
  pctChange: number | null;
  /** 'up' | 'down' | 'same' — a direction, never a verdict. */
  direction: 'up' | 'down' | 'same' | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Extremes and change for one field over a set of records.
 *
 * `totalChange` is null with a single reading rather than 0: "no change" and
 * "nothing to compare against yet" are different statements, and reporting the
 * first as the second would be a claim the data doesn't support.
 *
 * Ties on highest/lowest resolve to the most recent, matching the other
 * trackers.
 */
export function statsFor(entries: MeasurementEntry[], field: MeasurementField): FieldStats {
  const meta = fieldMeta(field);
  const points = seriesFor(entries, field);
  const first = points[0] ?? null;
  const latest = points[points.length - 1] ?? null;

  const highest = points.reduce<FieldPoint | null>(
    (best, p) => (!best || p.value > best.value || (p.value === best.value && p.date > best.date) ? p : best), null);
  const lowest = points.reduce<FieldPoint | null>(
    (low, p) => (!low || p.value < low.value || (p.value === low.value && p.date > low.date) ? p : low), null);

  const totalChange = points.length >= 2 && first && latest
    ? round1(latest.value - first.value)
    : null;
  const pctChange = totalChange != null && first && first.value !== 0
    ? round1((totalChange / first.value) * 100)
    : null;

  return {
    field, label: meta.label, unit: meta.unit,
    points, first, latest, highest, lowest,
    totalChange, pctChange,
    direction: totalChange == null ? null
      : totalChange > 0 ? 'up' : totalChange < 0 ? 'down' : 'same',
  };
}

export const allFieldStats = (entries: MeasurementEntry[]) =>
  MEASUREMENT_FIELDS.map(f => statsFor(entries, f.key));

// ── Comparison against the previous record (§5, §12) ─────────────────────────

export type FieldDelta = {
  field: MeasurementField; label: string; unit: string;
  current: number; previous: number; diff: number;
  direction: 'up' | 'down' | 'same';
};

/**
 * Each field's movement between the two most recent records that both contain
 * it. Fields missing from either record are omitted rather than compared
 * against nothing.
 */
export function deltasAgainstPrevious(entries: MeasurementEntry[]): FieldDelta[] {
  const out: FieldDelta[] = [];
  for (const f of MEASUREMENT_FIELDS) {
    const pts = seriesFor(entries, f.key);
    if (pts.length < 2) continue;
    const current = pts[pts.length - 1];
    const previous = pts[pts.length - 2];
    const diff = round1(current.value - previous.value);
    out.push({
      field: f.key, label: f.label, unit: f.unit,
      current: current.value, previous: previous.value, diff,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same',
    });
  }
  return out;
}

// ── Descriptive wording (§16) ────────────────────────────────────────────────

/**
 * A neutral sentence about a change.
 *
 * Deliberately says "higher"/"lower" rather than "gained"/"lost", and never
 * praises or flags a direction. §16's own examples set the register: "Waist
 * measurement is 2 cm lower than your previous recorded measurement."
 */
export function describeChange(s: FieldStats): string {
  if (!s.latest) return `No ${s.label.toLowerCase()} recorded yet.`;
  if (s.totalChange == null) {
    return `${s.label} recorded once, at ${s.latest.value} ${s.unit}. Log again to see change over time.`;
  }
  if (s.direction === 'same') {
    return `${s.label} is the same as your first recorded measurement in this range, at ${s.latest.value} ${s.unit}.`;
  }
  const word = s.direction === 'down' ? 'lower' : 'higher';
  return `${s.label} is ${Math.abs(s.totalChange)} ${s.unit} ${word} than your first recorded measurement in this range.`;
}

/** The same neutrality, for a single step between two records. */
export function describeDelta(d: FieldDelta): string {
  if (d.direction === 'same') return `${d.label} unchanged since your previous measurement.`;
  const word = d.direction === 'down' ? 'lower' : 'higher';
  return `${d.label} is ${Math.abs(d.diff)} ${d.unit} ${word} than your previous recorded measurement.`;
}

/**
 * A summary across all fields in a range.
 *
 * "Stayed fairly consistent" is the one qualitative phrase §16 permits, and it
 * describes stability rather than approving of it.
 */
export function summarise(entries: MeasurementEntry[]): string {
  if (!entries.length) return 'No measurements recorded yet.';
  if (entries.length === 1) {
    return 'One measurement recorded. Log again to start seeing change over time.';
  }
  const moved = allFieldStats(entries).filter(s => s.totalChange != null && s.totalChange !== 0);
  if (!moved.length) return 'Your measurements have stayed the same across this range.';

  // A whole-centimetre-or-less shift on every field is within normal daily
  // fluctuation, so it's described as consistency rather than as movement.
  const largest = moved.reduce((a, b) =>
    Math.abs(b.totalChange!) > Math.abs(a.totalChange!) ? b : a);
  if (Math.abs(largest.totalChange!) <= 1) {
    return 'Your measurements have stayed fairly consistent across this range.';
  }
  const word = largest.direction === 'down' ? 'lower' : 'higher';
  return `Your largest change is ${largest.label.toLowerCase()}, ${Math.abs(largest.totalChange!)} ${largest.unit} ${word} than at the start of this range.`;
}

// ── Validation (§8, §24) ─────────────────────────────────────────────────────

/**
 * Plausible human ranges. These catch a stray digit or a wrong unit — they are
 * not a judgement about any body, and the bounds are deliberately wide.
 */
export const FIELD_BOUNDS: Record<MeasurementField, { min: number; max: number }> = {
  weightKg:     { min: 20,  max: 400 },
  heightCm:     { min: 80,  max: 250 },
  bustCm:       { min: 30,  max: 250 },
  chestCm:      { min: 30,  max: 250 },
  waistCm:      { min: 30,  max: 250 },
  hipCm:        { min: 30,  max: 250 },
  thighLeftCm:  { min: 10,  max: 150 },
  thighRightCm: { min: 10,  max: 150 },
  armLeftCm:    { min: 5,   max: 100 },
  armRightCm:   { min: 5,   max: 100 },
};

export function validateField(field: MeasurementField, raw: string): string | null {
  if (!raw.trim()) return null;                     // every field is optional (§32)
  const n = Number(raw);
  const meta = fieldMeta(field);
  if (!Number.isFinite(n)) return `${meta.label} isn't a number — fix it or clear it.`;
  if (n <= 0) return `${meta.label} should be greater than zero.`;
  const b = FIELD_BOUNDS[field];
  if (n < b.min || n > b.max) {
    return `${meta.label} looks off — check the value and unit.`;
  }
  return null;
}

/** At least one measurement is needed; which ones is up to the user (§32). */
export function validateEntry(
  values: Partial<Record<MeasurementField, string>>, dateISO: string, ref: Date = new Date(),
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return 'Choose a valid date.';
  if (dateISO > todayISO(ref)) return "You can't log a measurement for a future date.";

  for (const f of MEASUREMENT_FIELDS) {
    const problem = validateField(f.key, values[f.key] ?? '');
    if (problem) return problem;
  }
  const anyValue = MEASUREMENT_FIELDS.some(f => (values[f.key] ?? '').trim());
  if (!anyValue) return 'Enter at least one measurement.';
  return null;
}

// ── Unit conversion (§21) ────────────────────────────────────────────────────

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const kgToLb = (kg: number) => round1(kg / KG_PER_LB);
export const lbToKg = (lb: number) => round1(lb * KG_PER_LB);
export const cmToIn = (cm: number) => round1(cm / CM_PER_IN);
export const inToCm = (inch: number) => round1(inch * CM_PER_IN);

/** Convert a stored value for display. Storage stays metric throughout. */
export function forDisplay(
  field: MeasurementField, value: number, weightUnit: 'kg' | 'lb', lengthUnit: 'cm' | 'in',
): { value: number; unit: string } {
  if (field === 'weightKg') {
    return weightUnit === 'lb' ? { value: kgToLb(value), unit: 'lb' } : { value: round1(value), unit: 'kg' };
  }
  return lengthUnit === 'in' ? { value: cmToIn(value), unit: 'in' } : { value: round1(value), unit: 'cm' };
}
