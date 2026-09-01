/**
 * budgetAnalytics — budget period windows, spend-against-limit and alert
 * states for the Expense tracker (§11, §19).
 *
 * §21 makes the transaction the source of truth: a budget stores only a limit
 * and a period, and everything else — spent, remaining, progress, whether to
 * warn — is derived from transactions here. Nothing about a budget's progress
 * is ever written to storage, so it can't drift from the transactions behind it.
 */
import {
  ExpenseEntry, FinanceBudget, BudgetPeriod,
  BUDGET_ALERT_DEFAULT, BUDGET_LIMIT_MIN, BUDGET_LIMIT_MAX,
} from '../types';

// ── Dates ────────────────────────────────────────────────────────────────────

/**
 * Local calendar date. `toISOString()` converts to UTC first, so an evening
 * purchase west of Greenwich would land in tomorrow's budget period — and near
 * a period boundary that moves it into the wrong month entirely.
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

// ── Period windows (§11, §14) ────────────────────────────────────────────────

export type Window = { start: string; end: string; days: number };

/**
 * The budget period containing `ref`, honouring the configured start day.
 *
 * A budget that resets on the 25th (payday, say) has to run 25th→24th, not
 * 1st→31st: anchoring to the calendar month would report a fortnight's spending
 * against a full month's limit right after payday.
 *
 * `startDay` is clamped to 1–28 for monthly because the 29th–31st don't exist
 * in every month, which would silently skip February.
 */
export function periodWindow(
  period: BudgetPeriod, startDay = 1, ref: Date = new Date(),
): Window {
  if (period === 'yearly') {
    const y = ref.getFullYear();
    const start = `${y}-01-01`;
    const end = `${y}-12-31`;
    return { start, end, days: daysBetween(start, end) + 1 };
  }

  if (period === 'weekly') {
    // 0 = Monday, matching the rest of the app's calendars.
    const anchor = Math.min(6, Math.max(0, Math.round(startDay)));
    const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const dow = (today.getDay() + 6) % 7;               // Mon = 0
    const back = (dow - anchor + 7) % 7;
    const start = addDays(toISO(today), -back);
    return { start, end: addDays(start, 6), days: 7 };
  }

  const anchor = Math.min(28, Math.max(1, Math.round(startDay)));
  const y = ref.getFullYear();
  const m = ref.getMonth();
  // Before the anchor day, we're still inside the window that began last month.
  const startMonth = ref.getDate() >= anchor ? m : m - 1;
  const startDate = new Date(y, startMonth, anchor);
  const endDate = new Date(y, startMonth + 1, anchor);
  endDate.setDate(endDate.getDate() - 1);
  const start = toISO(startDate);
  const end = toISO(endDate);
  return { start, end, days: daysBetween(start, end) + 1 };
}

export const budgetWindow = (b: FinanceBudget, ref: Date = new Date()) =>
  periodWindow(b.period, b.startDay ?? (b.period === 'weekly' ? 0 : 1), ref);

// ── Spend (§21) ──────────────────────────────────────────────────────────────

const isExpense = (t: ExpenseEntry) => (t.type ?? 'expense') === 'expense';

/**
 * Total spent against a budget in a window.
 *
 * Income is excluded — a budget caps spending, and letting a salary offset it
 * would report a month of heavy spending as comfortably under limit. Transfers
 * between the user's own accounts are excluded for the same reason: moving
 * money is not spending it.
 */
export function spendFor(
  txns: ExpenseEntry[], budget: FinanceBudget, w: Window,
): number {
  return txns.reduce((sum, t) => {
    if (!isExpense(t)) return sum;
    if (t.transferId) return sum;
    if (t.date < w.start || t.date > w.end) return sum;
    if (budget.categoryKey && t.category !== budget.categoryKey) return sum;
    return sum + t.amount;
  }, 0);
}

// ── Status (§11, §19) ────────────────────────────────────────────────────────

export type BudgetState = 'paused' | 'under' | 'warning' | 'exceeded';

export type BudgetProgress = {
  budget: FinanceBudget;
  window: Window;
  spent: number;
  limit: number;
  /** Negative once the limit is passed. */
  remaining: number;
  /** Uncapped, so an overspend reads as its real figure (e.g. 132%). */
  pct: number;
  /** 0–1 for the progress bar, where overshoot has nowhere to go. */
  fraction: number;
  state: BudgetState;
  threshold: number;
  daysLeft: number;
  /** Average daily spend so far, or null before the window has begun. */
  dailyRate: number | null;
  /**
   * Spend projected to the end of the window at the current rate, or null when
   * there isn't enough of the window elapsed to extrapolate honestly.
   */
  projected: number | null;
};

/**
 * Everything the UI needs for one budget.
 *
 * The percentage is deliberately uncapped: §11 wants a warning when the limit
 * is approached *or exceeded*, and flattening 132% to 100% would hide exactly
 * the case the user most needs to see.
 */
export function progressFor(
  budget: FinanceBudget, txns: ExpenseEntry[], ref: Date = new Date(),
): BudgetProgress {
  const w = budgetWindow(budget, ref);
  const spent = spendFor(txns, budget, w);
  const limit = budget.limit;
  const threshold = budget.alertThreshold ?? BUDGET_ALERT_DEFAULT;
  const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;

  const today = todayISO(ref);
  const elapsed = Math.min(w.days, Math.max(0, daysBetween(w.start, today) + 1));
  const daysLeft = Math.max(0, daysBetween(today, w.end));
  const dailyRate = elapsed > 0 ? spent / elapsed : null;

  // One day in, a single large purchase would project to an absurd figure, so
  // hold the projection back until a few days have actually elapsed.
  const projected = dailyRate != null && elapsed >= 3
    ? Math.round(dailyRate * w.days)
    : null;

  // Compared on the raw ratio, not the rounded percentage: 79.99% displays as
  // "80%" but must not trip an 80% alert, or the warning fires early and the
  // number on screen looks like it disagrees with itself.
  const ratio = limit > 0 ? (spent / limit) * 100 : 0;

  let state: BudgetState;
  if (budget.paused) state = 'paused';
  else if (limit > 0 && spent > limit) state = 'exceeded';
  else if (limit > 0 && ratio >= threshold) state = 'warning';
  else state = 'under';

  return {
    budget, window: w, spent, limit,
    remaining: Math.round((limit - spent) * 100) / 100,
    pct,
    fraction: limit > 0 ? Math.max(0, Math.min(1, spent / limit)) : 0,
    state, threshold, daysLeft, dailyRate,
    projected,
  };
}

export const progressForAll = (
  budgets: FinanceBudget[], txns: ExpenseEntry[], ref: Date = new Date(),
) => budgets.map(b => progressFor(b, txns, ref));

/** The overall budget, if one is set (§11). */
export const overallBudget = (budgets: FinanceBudget[]) =>
  budgets.find(b => !b.categoryKey) ?? null;

export const categoryBudgets = (budgets: FinanceBudget[]) =>
  budgets.filter(b => !!b.categoryKey);

/**
 * Budgets needing attention, most urgent first — what the dashboard surfaces.
 * Paused budgets never appear: the user muted them deliberately.
 */
export function alerts(
  budgets: FinanceBudget[], txns: ExpenseEntry[], ref: Date = new Date(),
): BudgetProgress[] {
  return progressForAll(budgets, txns, ref)
    .filter(p => p.state === 'warning' || p.state === 'exceeded')
    .sort((a, b) => b.pct - a.pct
      // Stable tie-break so equal overspends don't reorder between renders.
      || (a.budget.categoryKey ?? '').localeCompare(b.budget.categoryKey ?? ''));
}

export type BudgetMessage = { title: string; body: string };

/** Plain-language status, keyed to what actually happened. */
export function budgetMessage(p: BudgetProgress, currency = (n: number) => String(n)): BudgetMessage {
  const noun = p.budget.period === 'weekly' ? 'week' : p.budget.period === 'yearly' ? 'year' : 'month';
  if (p.state === 'paused') {
    return { title: 'Paused', body: "This budget isn't tracking or warning right now." };
  }
  if (p.state === 'exceeded') {
    return {
      title: 'Over budget',
      body: `${currency(Math.abs(p.remaining))} over your ${currency(p.limit)} limit, with ${p.daysLeft} ${p.daysLeft === 1 ? 'day' : 'days'} left this ${noun}.`,
    };
  }
  if (p.state === 'warning') {
    return {
      title: 'Close to the limit',
      body: `${p.pct}% used with ${currency(p.remaining)} left for the rest of the ${noun}.`,
    };
  }
  // Only worth mentioning a projected overspend while still under the limit.
  if (p.projected != null && p.projected > p.limit) {
    return {
      title: 'On track to overspend',
      body: `At this rate you'd reach ${currency(p.projected)} by the end of the ${noun}, over your ${currency(p.limit)} limit.`,
    };
  }
  return {
    title: 'On track',
    body: `${currency(p.remaining)} left of ${currency(p.limit)} for this ${noun}.`,
  };
}

// ── Validation (§11) ─────────────────────────────────────────────────────────

export function validateBudget(input: {
  limit: number;
  period: BudgetPeriod;
  alertThreshold?: number;
  startDay?: number;
  categoryKey?: string;
  existing?: FinanceBudget[];
  editingId?: string | null;
}): string | null {
  if (!Number.isFinite(input.limit) || input.limit < BUDGET_LIMIT_MIN) {
    return 'Enter a budget amount greater than zero.';
  }
  if (input.limit > BUDGET_LIMIT_MAX) return 'That budget looks too large — check the amount.';

  const th = input.alertThreshold ?? BUDGET_ALERT_DEFAULT;
  if (!Number.isFinite(th) || th < 1 || th > 100) {
    return 'The alert threshold should be between 1 and 100 percent.';
  }

  if (input.startDay != null) {
    const max = input.period === 'weekly' ? 6 : 28;
    const min = input.period === 'weekly' ? 0 : 1;
    if (!Number.isFinite(input.startDay) || input.startDay < min || input.startDay > max) {
      return `The start day should be between ${min} and ${max}.`;
    }
  }

  // One budget per scope, or two limits would compete over the same spending.
  const clash = (input.existing ?? []).some(b =>
    b.id !== input.editingId && (b.categoryKey ?? null) === (input.categoryKey ?? null));
  if (clash) {
    return input.categoryKey
      ? 'That category already has a budget — edit the existing one.'
      : 'An overall budget already exists — edit the existing one.';
  }
  return null;
}
