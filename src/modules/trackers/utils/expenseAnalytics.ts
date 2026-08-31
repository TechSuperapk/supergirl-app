/**
 * expenseAnalytics — pure helpers for the Expense tracker: period filtering,
 * totals (income / expense / savings), category breakdown, and daily trends.
 * Kept framework-free so screens and (future) tests can reuse them.
 */
import { ExpenseEntry } from '../types';

export type Period = 'day' | 'week' | 'month' | 'year' | 'all';

export const EXPENSE_CATEGORIES = [
  { id: 'food',          label: 'Food',          emoji: '🍔', color: '#FF7043' },
  { id: 'shopping',      label: 'Shopping',      emoji: '🛍️', color: '#AB47BC' },
  { id: 'transport',     label: 'Transport',     emoji: '🚗', color: '#42A5F5' },
  { id: 'health',        label: 'Health',        emoji: '💊', color: '#26A69A' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬', color: '#EC407A' },
  { id: 'beauty',        label: 'Beauty',        emoji: '💄', color: '#F06292' },
  { id: 'education',     label: 'Education',      emoji: '📚', color: '#5C6BC0' },
  { id: 'bills',         label: 'Bills',         emoji: '🧾', color: '#78909C' },
  { id: 'other',         label: 'Other',         emoji: '📦', color: '#8D6E63' },
];
export const INCOME_CATEGORIES = [
  { id: 'salary',   label: 'Salary',   emoji: '💼', color: '#43A047' },
  { id: 'business', label: 'Business', emoji: '🏪', color: '#00897B' },
  { id: 'gift',     label: 'Gift',     emoji: '🎁', color: '#EC407A' },
  { id: 'interest', label: 'Interest', emoji: '🏦', color: '#5C6BC0' },
  { id: 'other',    label: 'Other',    emoji: '💰', color: '#8D6E63' },
];
export const PAYMENT_TYPES = ['cash', 'card', 'upi', 'bank', 'other'] as const;

export interface CategoryMeta { id: string; label: string; emoji: string; color: string }

/**
 * Fallback category metadata used when no live resolver is supplied. Categories
 * are user-editable now (see useFinanceCategories) — prefer passing that hook's
 * `metaFor` so custom categories render correctly. This keeps older call sites
 * working and degrades to a neutral placeholder for unknown keys.
 */
export function categoryMeta(id: string, type: 'expense' | 'income' = 'expense'): CategoryMeta {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find(c => c.id === id) ?? { id, label: id || 'Other', emoji: '📦', color: '#9AA0A6' };
}

/** Resolver shape accepted by byCategory so it can use live categories. */
export type CategoryResolver = (key: string, type: 'expense' | 'income') => CategoryMeta;

const iso = (d: Date) => d.toISOString().split('T')[0];
const startOfWeek = (d: Date) => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x; };

/** First date (inclusive, YYYY-MM-DD) of the period containing `ref`. */
export function periodStart(period: Period, ref = new Date()): string {
  const d = new Date(ref);
  if (period === 'day')   return iso(d);
  if (period === 'week')  return iso(startOfWeek(d));
  if (period === 'month') return iso(new Date(d.getFullYear(), d.getMonth(), 1));
  if (period === 'year')  return iso(new Date(d.getFullYear(), 0, 1));
  return '0000-01-01';
}

export function filterByPeriod(txns: ExpenseEntry[], period: Period, ref = new Date()): ExpenseEntry[] {
  if (period === 'all') return txns;
  const start = periodStart(period, ref);
  const end = iso(ref);
  return txns.filter(t => t.date >= start && t.date <= end);
}

const isIncome = (t: ExpenseEntry) => t.type === 'income';

export function totals(txns: ExpenseEntry[]) {
  let income = 0, expense = 0;
  for (const t of txns) (isIncome(t) ? (income += t.amount) : (expense += t.amount));
  return { income, expense, savings: income - expense };
}

/** Category breakdown for a txn type, sorted by amount desc, with % of total + txn count. */
export function byCategory(
  txns: ExpenseEntry[],
  type: 'expense' | 'income' = 'expense',
  resolve: CategoryResolver = categoryMeta,
) {
  const rows = txns.filter(t => (type === 'income' ? isIncome(t) : !isIncome(t)));
  const map = new Map<string, { amount: number; count: number }>();
  for (const t of rows) {
    const cur = map.get(t.category) ?? { amount: 0, count: 0 };
    map.set(t.category, { amount: cur.amount + t.amount, count: cur.count + 1 });
  }
  const total = [...map.values()].reduce((a, b) => a + b.amount, 0) || 1;
  return [...map.entries()]
    .map(([id, v]) => ({ ...resolve(id, type), id, amount: v.amount, count: v.count, pct: v.amount / total }))
    .sort((a, b) => b.amount - a.amount);
}

/** Daily savings (income − expense) for the last `days` days, for trend charts. */
export function savingsTrend(txns: ExpenseEntry[], days = 7) {
  return dailyTrend(txns, days).map(d => ({ label: d.label, value: d.income - d.expense }));
}

/** Daily expense + income totals for the last `days` days (oldest → newest). */
export function dailyTrend(txns: ExpenseEntry[], days = 7) {
  const out: { date: string; label: string; expense: number; income: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const date = iso(d);
    const day = txns.filter(t => t.date === date);
    out.push({
      date,
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      expense: day.filter(t => !isIncome(t)).reduce((a, t) => a + t.amount, 0),
      income:  day.filter(t => isIncome(t)).reduce((a, t) => a + t.amount, 0),
    });
  }
  return out;
}

export const formatMoney = (n: number, currency = '₹') =>
  `${currency}${Math.round(n).toLocaleString('en-IN')}`;
