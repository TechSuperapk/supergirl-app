/**
 * intimacyAnalytics — the calculations behind the Intimacy Insights screen
 * (spec §6), as pure functions so §17 step 8's automated tests can cover them.
 *
 * The recurring theme here is *denominators*. Every optional field on an entry
 * — protection, feeling, mood after — creates a choice about what "100%" means,
 * and the wrong choice silently reports something the user never recorded. The
 * rule throughout, per §6 and §14, is that a blank field is excluded from its
 * denominator rather than counted as a negative answer.
 */
import {
  IntimacyEntry, IntimacyFeeling, IntimacyMoodAfter, IntimacyPeriod,
} from '../types';

// ── Dates ────────────────────────────────────────────────────────────────────

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const todayISO = (ref: Date = new Date()) => toISO(ref);

/** "YYYY-MM" for a local date. */
export const monthKey = (dateISO: string) => dateISO.slice(0, 7);

/**
 * Month key for a Date, in local time.
 *
 * `toISOString().slice(0, 7)` converts to UTC first, so on the 1st of a month
 * anywhere west of Greenwich it returns the *previous* month — which would
 * mislabel every bar in the frequency chart.
 */
export const monthKeyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// ── Ordering (§3.2, §7) ──────────────────────────────────────────────────────

/**
 * Newest first by the moment the event happened, not when the row was written.
 *
 * Sorting on date alone leaves same-day entries in whatever order the API
 * returned, which makes "Last Entry" on Home a coin flip once someone logs
 * twice in a day. `createdAt` then `id` break ties so the order is stable
 * across reloads (§7).
 */
export function sortEntries(entries: IntimacyEntry[]): IntimacyEntry[] {
  return [...entries].sort((a, b) =>
    b.date.localeCompare(a.date)
    || (b.time ?? '').localeCompare(a.time ?? '')
    || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    || b.id.localeCompare(a.id));
}

/** The most recent event (§3.2), or null. */
export const latestEntry = (entries: IntimacyEntry[]): IntimacyEntry | null =>
  sortEntries(entries)[0] ?? null;

/** All entries on a date, newest first — a date can hold several (§14). */
export const entriesOn = (entries: IntimacyEntry[], dateISO: string) =>
  sortEntries(entries.filter(e => e.date === dateISO));

/** Dates with at least one entry, for calendar markers (§8, never note content). */
export const markedDates = (entries: IntimacyEntry[]) =>
  new Set(entries.map(e => e.date));

// ── Ranges ───────────────────────────────────────────────────────────────────

export function inPeriod(
  entries: IntimacyEntry[], period: IntimacyPeriod, ref: Date = new Date(),
): IntimacyEntry[] {
  if (period === 'all') return entries;
  const today = todayISO(ref);
  if (period === 'year') return entries.filter(e => e.date.slice(0, 4) === today.slice(0, 4));
  return entries.filter(e => monthKey(e.date) === monthKey(today));
}

// ── Protection (§3.2, §6.2) ──────────────────────────────────────────────────

export type ProtectionStats = {
  partnerCount: number;
  /** Partner entries that actually recorded a protection value. */
  eligibleCount: number;
  protectedCount: number;
  unprotectedCount: number;
  /** Null when nothing is eligible — there is no rate to report. */
  ratePct: number | null;
  /** Partner entries left blank; surfaced so the UI can say so honestly. */
  unrecordedCount: number;
};

/**
 * Protection rate over *eligible* records (§6.2).
 *
 * Two exclusions, both of which the previous implementation got wrong or would
 * have got wrong:
 *
 *  1. Self love never enters the calculation. §6.2 is explicit: "Do not
 *     classify Self love as unprotected."
 *  2. A Partner entry with no protection recorded is not eligible either.
 *     Dividing by every Partner record treats "didn't say" as "unprotected",
 *     so one protected entry alongside one blank one reports 50% — a claim
 *     about the user's sexual health that they never made.
 *
 * Returns null rather than 0 when there is nothing to divide by, so the screen
 * can show "no data" instead of a confident 0%.
 */
export function protectionStats(entries: IntimacyEntry[]): ProtectionStats {
  const partner = entries.filter(e => e.who === 'partner');
  const prot = partner.filter(e => e.protection === 'protected').length;
  const unprot = partner.filter(e => e.protection === 'unprotected').length;
  const eligible = prot + unprot;

  return {
    partnerCount: partner.length,
    eligibleCount: eligible,
    protectedCount: prot,
    unprotectedCount: unprot,
    ratePct: eligible ? Math.round((prot / eligible) * 100) : null,
    unrecordedCount: partner.length - eligible,
  };
}

// ── Overview (§3.2, §6.1) ────────────────────────────────────────────────────

export type Overview = {
  totalEntries: number;
  partnerCount: number;
  selfLoveCount: number;
  protectedPct: number | null;
  protectedCount: number;
  unprotectedCount: number;
  eligibleCount: number;
  unrecordedCount: number;
};

export function overviewOf(entries: IntimacyEntry[]): Overview {
  const p = protectionStats(entries);
  return {
    totalEntries: entries.length,
    partnerCount: p.partnerCount,
    selfLoveCount: entries.filter(e => e.who === 'self_love').length,
    protectedPct: p.ratePct,
    protectedCount: p.protectedCount,
    unprotectedCount: p.unprotectedCount,
    eligibleCount: p.eligibleCount,
    unrecordedCount: p.unrecordedCount,
  };
}

// ── Mood after (§6.3) ────────────────────────────────────────────────────────

export const MOOD_KEYS: IntimacyMoodAfter[] = ['amazing', 'good', 'ok', 'low'];

export type MoodStats = {
  counts: Record<IntimacyMoodAfter, number>;
  /** Records that actually carry a mood — the denominator (§6.3). */
  total: number;
  rows: { key: IntimacyMoodAfter; count: number; pct: number }[];
};

/**
 * Mood-after distribution over records that recorded a mood (§6.3).
 * A blank mood is never inferred, and `total` of 0 yields 0% rather than NaN.
 */
export function moodStats(entries: IntimacyEntry[]): MoodStats {
  const counts = {} as Record<IntimacyMoodAfter, number>;
  for (const k of MOOD_KEYS) counts[k] = 0;

  let total = 0;
  for (const e of entries) {
    if (e.moodAfter && counts[e.moodAfter] !== undefined) { counts[e.moodAfter]++; total++; }
  }

  return {
    counts,
    total,
    rows: MOOD_KEYS.map(key => ({
      key,
      count: counts[key],
      pct: total ? Math.round((counts[key] / total) * 100) : 0,
    })),
  };
}

// ── Feelings (§6.5) ──────────────────────────────────────────────────────────

export const FEELING_KEYS: IntimacyFeeling[] = [
  'loved', 'happy', 'relaxed', 'passionate', 'neutral', 'disappointed',
];

export type FeelingStats = {
  counts: Record<string, number>;
  /** Records carrying a feeling — the denominator (§6.5). */
  total: number;
  top: IntimacyFeeling | null;
  topCount: number;
  /** Null when no feeling was ever recorded. */
  topPct: number | null;
  ranked: { feeling: IntimacyFeeling; count: number; pct: number }[];
};

/**
 * Most common feeling and its share (§6.5).
 *
 * The denominator is records *containing a feeling*, not every record in the
 * range. Feelings are optional, so dividing by all records understates the
 * answer badly — two "loved" entries out of ten records where only three
 * recorded a feeling is 67%, not 20%.
 *
 * Ties break by the declared order in FEELING_KEYS, which is deterministic and
 * stable across reloads (§6.5) — `Object.entries` order alone is not.
 */
export function feelingStats(entries: IntimacyEntry[]): FeelingStats {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const e of entries) {
    if (!e.feeling) continue;
    counts[e.feeling] = (counts[e.feeling] ?? 0) + 1;
    total++;
  }

  const ranked = FEELING_KEYS
    .filter(f => counts[f])
    .map(feeling => ({
      feeling,
      count: counts[feeling],
      pct: Math.round((counts[feeling] / total) * 100),
    }))
    .sort((a, b) => b.count - a.count
      || FEELING_KEYS.indexOf(a.feeling) - FEELING_KEYS.indexOf(b.feeling));

  const top = ranked[0] ?? null;
  return {
    counts,
    total,
    top: top?.feeling ?? null,
    topCount: top?.count ?? 0,
    topPct: top ? top.pct : null,
    ranked,
  };
}

// ── Monthly frequency (§6.4) ─────────────────────────────────────────────────

export type MonthPoint = { key: string; label: string; value: number };

/**
 * Entries per month over the last `months` months, oldest → newest.
 *
 * Months with nothing logged are included as zero (§6.4): dropping them would
 * connect March straight to June and imply a steady rate through a gap that
 * was actually empty. Counted on the event date, never `createdAt`.
 */
export function monthlyFrequency(
  entries: IntimacyEntry[], months = 6, ref: Date = new Date(),
): MonthPoint[] {
  const byMonth: Record<string, number> = {};
  for (const e of entries) byMonth[monthKey(e.date)] = (byMonth[monthKey(e.date)] ?? 0) + 1;

  return Array.from({ length: months }, (_, i) => {
    const d = new Date(ref.getFullYear(), ref.getMonth() - (months - 1 - i), 1);
    const key = monthKeyOf(d);
    return {
      key,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      value: byMonth[key] ?? 0,
    };
  });
}

/** Entries grouped into months, newest first, for History (§7). */
export function groupByMonth(entries: IntimacyEntry[]): {
  key: string; label: string; entries: IntimacyEntry[];
}[] {
  const groups = new Map<string, IntimacyEntry[]>();
  for (const e of sortEntries(entries)) {
    const k = monthKey(e.date);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(e);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, list]) => ({
      key,
      label: new Date(`${key}-01T00:00:00`)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      entries: list,
    }));
}

// ── Combined stats for a range ───────────────────────────────────────────────

export type IntimacyStats = {
  entries: IntimacyEntry[];
  overview: Overview;
  protection: ProtectionStats;
  mood: MoodStats;
  feelings: FeelingStats;
};

export function statsFor(
  allEntries: IntimacyEntry[], period: IntimacyPeriod, ref: Date = new Date(),
): IntimacyStats {
  const scoped = sortEntries(inPeriod(allEntries, period, ref));
  return {
    entries: scoped,
    overview: overviewOf(scoped),
    protection: protectionStats(scoped),
    mood: moodStats(scoped),
    feelings: feelingStats(scoped),
  };
}

// ── Validation (§4.3) ────────────────────────────────────────────────────────

export const NOTES_MAX = 500;

export function validateEntry(input: {
  date: string;
  time: string;
  who: IntimacyEntry['who'] | null;
  protection?: IntimacyEntry['protection'];
  notes?: string;
}, ref: Date = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return 'Choose a valid date.';
  if (!/^\d{2}:\d{2}$/.test(input.time)) return 'Choose a valid time.';
  if (input.date > todayISO(ref)) return "You can't log an entry for a future date.";
  if (!input.who) return 'Choose who it was with.';
  // Protection only applies to partner entries (§4.2).
  if (input.who === 'partner' && !input.protection) return 'Select a protection status.';
  if ((input.notes?.length ?? 0) > NOTES_MAX) return `Notes are limited to ${NOTES_MAX} characters.`;
  return null;
}
