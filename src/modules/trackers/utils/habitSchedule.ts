// ─────────────────────────────────────────────────────────────────────────────
// habitSchedule — pure date maths for "does this habit occur on this date?".
//
// Until now every active habit showed on every day: the repeat configuration
// was captured and stored but nothing read it back. This module is the single
// place that interprets it, so the Goals list, the notification scheduler and
// any future history view can never disagree about whether a day counts.
//
// Pure functions only — no store, no I/O — so the rules can be reasoned about
// and tested directly.
// ─────────────────────────────────────────────────────────────────────────────
import { Habit, CustomInterval, LAST_DAY, LAST_WEEK } from '../types';

/** Parse a YYYY-MM-DD as *local* midnight. `new Date('2026-08-20')` parses as
 *  UTC and can land on the previous day west of Greenwich. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Whole days between two dates, DST-safe (compares calendar days, not ms). */
export function daysBetween(fromISO: string, toISO: string): number {
  const a = parseISODate(fromISO), b = parseISODate(toISO);
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

const monthsBetween = (a: Date, b: Date) =>
  (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

export const daysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

/** 1-based week of the month: days 1–7 → 1, 8–14 → 2, … */
export const weekOfMonth = (d: Date) => Math.floor((d.getDate() - 1) / 7) + 1;

/** True when the date falls in the month's final 7 days — the "Last week"
 *  rule, which is not the same as "4th week" in a 31-day month. */
export const isInLastWeek = (d: Date) =>
  d.getDate() > daysInMonth(d.getFullYear(), d.getMonth()) - 7;

export const isLastDayOfMonth = (d: Date) =>
  d.getDate() === daysInMonth(d.getFullYear(), d.getMonth());

/** The anchor a repeating interval counts from. */
const anchorOf = (habit: Habit) =>
  habit.startDate ?? habit.createdAt?.split('T')[0] ?? toISODate(new Date());

/**
 * Custom "Customize Repeat Interval" rules.
 *
 * `anytimeInCycle` deliberately returns true for every day in the cycle: the
 * user asked for "anytime in a 7-day cycle", so every day is a legitimate
 * opportunity — it's the completion count, not the calendar, that closes it.
 */
function matchesCustom(habit: Habit, ci: CustomInterval, date: Date): boolean {
  const iso = toISODate(date);
  const anchorISO = anchorOf(habit);
  const anchor = parseISODate(anchorISO);
  const n = Math.max(1, ci.n ?? 1);

  if (ci.unit === 'day') {
    const elapsed = daysBetween(anchorISO, iso);
    if (elapsed < 0) return false;
    switch (ci.mode) {
      case 'every':          return true;
      case 'everyN':         return elapsed % n === 0;
      case 'anytimeInCycle': return true;
      case 'daysOnOff': {
        const on = Math.max(1, ci.daysOn ?? 1);
        const off = Math.max(0, ci.daysOff ?? 0);
        const period = on + off;
        if (period <= 0) return true;
        return elapsed % period < on;
      }
    }
  }

  if (ci.unit === 'weekly') {
    const elapsedWeeks = Math.floor(daysBetween(anchorISO, iso) / 7);
    if (elapsedWeeks < 0) return false;
    return ci.mode === 'everyN' ? elapsedWeeks % n === 0 : true;
  }

  if (ci.unit === 'monthly') {
    const elapsed = monthsBetween(anchor, date);
    if (elapsed < 0) return false;
    return ci.mode === 'everyN' ? elapsed % n === 0 : true;
  }

  // yearly
  const elapsedYears = date.getFullYear() - anchor.getFullYear();
  if (elapsedYears < 0) return false;
  return ci.mode === 'everyN' ? elapsedYears % n === 0 : true;
}

/**
 * Does `habit` occur on `dateISO` (YYYY-MM-DD)?
 *
 * Paused and deleted habits never occur; a habit outside its start/end window
 * never occurs. Beyond that the answer comes from the repeat configuration,
 * where "no selection" means Anytime — i.e. the cycle is open, so the day
 * qualifies.
 */
export function isHabitActiveOn(habit: Habit, dateISO: string): boolean {
  if ((habit.status ?? 'active') !== 'active') return false;
  if (habit.isPaused) return false;
  if (habit.startDate && dateISO < habit.startDate) return false;
  if (habit.endDate && dateISO > habit.endDate) return false;

  const date = parseISODate(dateISO);
  const cycle = habit.repeatCycle ?? 'daily';

  if (cycle === 'custom') {
    return habit.customInterval ? matchesCustom(habit, habit.customInterval, date) : true;
  }

  if (cycle === 'daily') {
    const dow = date.getDay();                       // 0 = Sunday
    switch (habit.repeatDailyPreset ?? 'all') {
      case 'weekdays': return dow >= 1 && dow <= 5;
      case 'weekends': return dow === 0 || dow === 6;
      default:         return true;
    }
  }

  if (cycle === 'weekly') {
    const days = habit.repeatWeekdays ?? [];
    return days.length === 0 ? true : days.includes(date.getDay());
  }

  if (cycle === 'monthly') {
    const days  = habit.repeatMonthDays ?? [];
    const weeks = habit.repeatMonthWeeks ?? [];
    if (days.length === 0 && weeks.length === 0) return true;   // Anytime

    const dayHit = days.length > 0 && (
      days.includes(date.getDate()) ||
      (days.includes(LAST_DAY) && isLastDayOfMonth(date))
    );
    const weekHit = weeks.length > 0 && (
      weeks.includes(weekOfMonth(date)) ||
      (weeks.includes(LAST_WEEK) && isInLastWeek(date))
    );
    // Union, not intersection: the two pickers are independent multi-selects,
    // so "the 15th" and "the last week" together means either qualifies.
    return dayHit || weekHit;
  }

  // yearly
  const months = habit.repeatMonths ?? [];
  return months.length === 0 ? true : months.includes(date.getMonth());
}

/** Today's occurrences, in the order given. */
export const habitsActiveOn = (habits: Habit[], dateISO: string) =>
  habits.filter(h => isHabitActiveOn(h, dateISO));

/**
 * Next date on/after `fromISO` when the habit occurs, or null if none within
 * `lookaheadDays`. Used to avoid scheduling a reminder for a day the habit
 * doesn't actually run.
 */
export function nextOccurrence(
  habit: Habit,
  fromISO: string,
  lookaheadDays = 366,
): string | null {
  const start = parseISODate(fromISO);
  for (let i = 0; i <= lookaheadDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = toISODate(d);
    if (habit.endDate && iso > habit.endDate) return null;
    if (isHabitActiveOn(habit, iso)) return iso;
  }
  return null;
}
