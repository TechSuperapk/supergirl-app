/**
 * sicknessAnalytics — the dashboard, history and timeline calculations from the
 * Sickness Tracker spec (§5, §18, §20), as pure functions.
 *
 * §32 requires that every symptom, feeling, medication and dose change shows up
 * consistently across Dashboard, History, Recent Entries and Timeline. Deriving
 * all four from one module here is what makes that structural rather than a
 * promise each screen has to keep on its own.
 */
import {
  SymptomEntry, MedicationEntry, SicknessFeeling, MedicationStatus,
} from '../types';

// ── Dates ────────────────────────────────────────────────────────────────────

/**
 * Local calendar date. `toISOString()` converts to UTC first, so a symptom
 * logged in the evening west of Greenwich would be filed under tomorrow — and
 * §5.2 asks specifically for the current *local* date.
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

/** Sortable "YYYY-MM-DDTHH:mm" key for merging record types by moment. */
export const stampOf = (date: string, time?: string) => `${date}T${time ?? '00:00'}`;

// ── Today's feeling (§5.2) ───────────────────────────────────────────────────

/**
 * The latest feeling recorded for today, or null.
 *
 * Null rather than a cheerful default: the dashboard shouldn't tell someone
 * they feel "Good" when they never said so, least of all in a health record.
 * The UI shows a prompt to set it instead.
 */
export function feelingForToday(
  symptoms: SymptomEntry[], ref: Date = new Date(),
): SicknessFeeling | null {
  const today = todayISO(ref);
  const todays = symptoms
    .filter(s => s.date === today && s.feeling)
    .sort((a, b) => stampOf(a.date, a.time).localeCompare(stampOf(b.date, b.time)));
  return todays.length ? todays[todays.length - 1].feeling! : null;
}

// ── Active symptoms (§5.3) ───────────────────────────────────────────────────

/** Symptoms not yet marked resolved. Refreshes as records change. */
export const activeSymptoms = (symptoms: SymptomEntry[]) => symptoms.filter(s => !s.resolved);

// ── Medication due status (§5.4) ─────────────────────────────────────────────

/**
 * Whether a medication should still be treated as due.
 *
 * Three things disqualify it, and only the first was previously checked:
 *  - it isn't marked `due` (already taken, skipped or missed)
 *  - it's paused — the type says paused medications stay in history but stop
 *    appearing as due, and showing "Due Soon" for a course someone
 *    deliberately paused is a prompt to take medicine they chose to stop
 *  - the course has ended
 */
export function isDue(m: MedicationEntry, ref: Date = new Date()): boolean {
  if (m.status !== 'due') return false;
  if (m.paused) return false;
  const today = todayISO(ref);
  if (m.endDate && m.endDate < today) return false;
  if (m.startDate && m.startDate > today) return false;
  return true;
}

export const dueMedications = (meds: MedicationEntry[], ref: Date = new Date()) =>
  meds.filter(m => isDue(m, ref));

/** The soonest due dose, for the §6.2 upcoming-dose banner. */
export function upcomingDose(
  meds: MedicationEntry[], ref: Date = new Date(),
): MedicationEntry | null {
  return dueMedications(meds, ref)
    .slice()
    .sort((a, b) => stampOf(a.date, a.time).localeCompare(stampOf(b.date, b.time)))[0] ?? null;
}

// ── Adherence ────────────────────────────────────────────────────────────────

export type Adherence = {
  taken: number; skipped: number; missed: number;
  /** Null when nothing has been resolved yet — 0% would read as total failure. */
  pct: number | null;
};

/**
 * Adherence over doses that actually reached an outcome. A dose still marked
 * `due` hasn't been answered yet, so counting it as a miss would penalise the
 * user for a dose whose time hasn't come.
 */
export function adherence(meds: MedicationEntry[]): Adherence {
  const count = (st: MedicationStatus) => meds.filter(m => m.status === st).length;
  const taken = count('taken');
  const skipped = count('skipped');
  const missed = count('missed');
  const total = taken + skipped + missed;
  return { taken, skipped, missed, pct: total ? Math.round((taken / total) * 100) : null };
}

// ── Timeline (§20) ───────────────────────────────────────────────────────────

export type TimelineItem =
  | { kind: 'symptom'; id: string; date: string; time: string; entry: SymptomEntry }
  | { kind: 'medication'; id: string; date: string; time: string; entry: MedicationEntry };

/**
 * Symptoms and medication events merged into one record, newest first (§20).
 *
 * Keyed by kind *and* id so a symptom and a medication that happen to share an
 * id can't collide, which §20 calls out as duplicate display of the same event.
 */
export function timeline(
  symptoms: SymptomEntry[], meds: MedicationEntry[],
): TimelineItem[] {
  const items: TimelineItem[] = [
    ...symptoms.map(s => ({
      kind: 'symptom' as const, id: s.id, date: s.date, time: s.time ?? '00:00', entry: s,
    })),
    ...meds.map(m => ({
      kind: 'medication' as const, id: m.id, date: m.date, time: m.time, entry: m,
    })),
  ];
  return items.sort((a, b) =>
    stampOf(b.date, b.time).localeCompare(stampOf(a.date, a.time))
    // Stable tie-break, so equal timestamps don't reorder between renders.
    || a.kind.localeCompare(b.kind)
    || a.id.localeCompare(b.id));
}

// ── Symptom frequency ────────────────────────────────────────────────────────

export type SymptomCount = { symptom: string; count: number };

/** Most-logged symptoms first, with a deterministic tie-break. */
export function topSymptoms(symptoms: SymptomEntry[], limit = 5): SymptomCount[] {
  const counts: Record<string, number> = {};
  for (const s of symptoms) counts[s.symptom] = (counts[s.symptom] ?? 0) + 1;
  return Object.entries(counts)
    .map(([symptom, count]) => ({ symptom, count }))
    .sort((a, b) => b.count - a.count || a.symptom.localeCompare(b.symptom))
    .slice(0, limit);
}

// ── Side effects (§18) ───────────────────────────────────────────────────────

export const SIDE_EFFECT_NONE = 'None';

/**
 * Toggle a side effect, keeping "None" mutually exclusive with the rest (§18).
 *
 * "None, plus nausea and a headache" is a contradiction, and it would quietly
 * corrupt any later analysis of which medications cause side effects.
 */
export function toggleSideEffect(current: string[], value: string): string[] {
  if (value === SIDE_EFFECT_NONE) {
    // Selecting None clears everything else; tapping it again clears it too.
    return current.includes(SIDE_EFFECT_NONE) ? [] : [SIDE_EFFECT_NONE];
  }
  const withoutNone = current.filter(v => v !== SIDE_EFFECT_NONE);
  return withoutNone.includes(value)
    ? withoutNone.filter(v => v !== value)
    : [...withoutNone, value];
}

// ── Validation (§18) ─────────────────────────────────────────────────────────

export const NOTES_MAX = 500;

/** Temperature ranges that catch a mistyped digit rather than judge a fever. */
export const TEMP_BOUNDS = { C: { min: 30, max: 45 }, F: { min: 86, max: 113 } } as const;

export function validateTemperature(raw: string, unit: 'C' | 'F'): string | null {
  if (!raw.trim()) return null;                 // optional (§9.4)
  const n = Number(raw);
  if (!Number.isFinite(n)) return 'Enter a valid temperature, or leave it blank.';
  const b = TEMP_BOUNDS[unit];
  if (n < b.min || n > b.max) return `Enter a temperature between ${b.min} and ${b.max} °${unit}.`;
  return null;
}

export function validateDosage(raw?: string): string | null {
  if (!raw?.trim()) return null;                // optional
  const n = parseFloat(raw);
  // §18: a dose amount must be greater than zero when one is given.
  if (Number.isFinite(n) && n <= 0) return 'Dose amount must be greater than zero.';
  return null;
}

// ── Dashboard rollup (§5) ────────────────────────────────────────────────────

export type SicknessDashboard = {
  hasData: boolean;
  feelingToday: SicknessFeeling | null;
  active: SymptomEntry[];
  due: MedicationEntry[];
  next: MedicationEntry | null;
  recent: TimelineItem[];
  adherence: Adherence;
};

export function sicknessDashboard(
  symptoms: SymptomEntry[], meds: MedicationEntry[], ref: Date = new Date(),
): SicknessDashboard {
  const all = timeline(symptoms, meds);
  return {
    hasData: symptoms.length > 0 || meds.length > 0,
    feelingToday: feelingForToday(symptoms, ref),
    active: activeSymptoms(symptoms),
    due: dueMedications(meds, ref),
    next: upcomingDose(meds, ref),
    recent: all.slice(0, 5),
    adherence: adherence(meds),
  };
}
