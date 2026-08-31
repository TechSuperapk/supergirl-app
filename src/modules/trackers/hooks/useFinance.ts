/**
 * useFinanceCategories / useFinanceAccounts — the two reference entities the
 * Expense tracker is built on.
 *
 * Categories were previously hardcoded constants. They're now records so users
 * can add, rename, recolour, reorder and hide them. Transactions store the
 * stable `key`, never the label, so renaming never orphans history.
 *
 * Accounts carry an opening balance so a running balance can start from
 * reality rather than from zero.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { RootState } from '../../../store';
import {
  setFinanceCategories, upsertFinanceCategory, deleteFinanceCategory,
  setFinanceAccounts, upsertFinanceAccount, deleteFinanceAccount,
  setFinanceBudgets, upsertFinanceBudget, deleteFinanceBudget,
} from '../store/trackersSlice';
import {
  fetchFinanceCategories, saveFinanceCategory, updateFinanceCategoryDoc, deleteFinanceCategoryById,
  fetchFinanceAccounts, saveFinanceAccount, updateFinanceAccountDoc, deleteFinanceAccountById,
  fetchFinanceBudgets, saveFinanceBudget, updateFinanceBudgetDoc, deleteFinanceBudgetById,
} from '../services/trackersDbService';
import {
  FinanceCategory, FinanceAccount, FinanceAccountKind, TxnType, ExpenseEntry,
  FinanceBudget, BudgetPeriod,
  DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, ACCOUNT_KIND_META,
} from '../types';
import * as B from '../utils/budgetAnalytics';

/** Slugify a label into a stable key, de-duplicated against existing keys. */
function keyFor(label: string, taken: string[]): string {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'category';
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

export function useFinanceCategories() {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const categories = useSelector((s: RootState) => s.trackers.financeCategories);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const cats = await fetchFinanceCategories(user.id);
    dispatch(setFinanceCategories(cats));
    return cats;
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .then(async cats => {
        if (cancelled || !cats) return;

        // Seed any standard category the account is missing — on first run
        // that's the whole set, later it backfills ones added to the defaults
        // since the account was created. Purely additive: custom categories and
        // renamed defaults are left untouched, and a *hidden* default still
        // counts as present, so hiding one keeps it out of the pickers for good.
        const defaults = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
        const missing = defaults.filter(d => !cats.some(c => c.key === d.key && c.type === d.type));
        if (missing.length === 0) return;

        setSeeding(true);
        try {
          const created = await Promise.all(
            missing.map(c => saveFinanceCategory({ userId: user.id, ...c })),
          );
          if (!cancelled) dispatch(setFinanceCategories([...cats, ...created]));
        } finally {
          if (!cancelled) setSeeding(false);
        }
      })
      .catch(() => { if (!cancelled) setError('Could not load categories.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const addCategory = async (data: { label: string; emoji: string; color: string; type: TxnType }) => {
    if (!user) throw new Error('Not signed in');
    const key = keyFor(data.label, categories.map(c => c.key));
    const order = categories.filter(c => c.type === data.type).length;
    const created = await saveFinanceCategory({ userId: user.id, key, order, ...data });
    dispatch(upsertFinanceCategory(created));
    return created;
  };

  const editCategory = async (id: string, updates: Partial<FinanceCategory>) => {
    const patch = { ...updates, updatedAt: new Date().toISOString() };
    await updateFinanceCategoryDoc(id, patch);
    const existing = categories.find(c => c.id === id);
    if (existing) dispatch(upsertFinanceCategory({ ...existing, ...patch }));
  };

  const removeCategory = async (id: string) => {
    await deleteFinanceCategoryById(id);
    dispatch(deleteFinanceCategory(id));
  };

  const toggleHidden = async (cat: FinanceCategory) => editCategory(cat.id, { hidden: !cat.hidden });

  /** Move a category up or down within its own type. */
  const reorder = async (cat: FinanceCategory, direction: -1 | 1) => {
    const siblings = categories
      .filter(c => c.type === cat.type)
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    const i = siblings.findIndex(c => c.id === cat.id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= siblings.length) return;
    await Promise.all([
      editCategory(siblings[i].id, { order: j }),
      editCategory(siblings[j].id, { order: i }),
    ]);
  };

  const forType = (type: TxnType, includeHidden = false) =>
    categories
      .filter(c => c.type === type && (includeHidden || !c.hidden))
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  /**
   * Look up display metadata for a transaction's category key. Falls back to a
   * neutral placeholder so a deleted category never breaks an old transaction.
   */
  const metaFor = (key: string, type: TxnType = 'expense') => {
    const found = categories.find(c => c.key === key && c.type === type)
      ?? categories.find(c => c.key === key);
    return found ?? {
      id: '', userId: '', key, label: key || 'Uncategorised',
      emoji: '📦', color: '#9AA0A6', type, createdAt: '',
    } as FinanceCategory;
  };

  return {
    categories, loading: loading || seeding, error,
    addCategory, editCategory, removeCategory, toggleHidden, reorder,
    forType, metaFor,
    categoryById: (id: string) => categories.find(c => c.id === id) ?? null,
  };
}

export function useFinanceAccounts() {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const accounts = useSelector((s: RootState) => s.trackers.financeAccounts);
  const txns = useSelector((s: RootState) => s.trackers.expenses);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const accs = await fetchFinanceAccounts(user.id);
    dispatch(setFinanceAccounts(accs));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .catch(() => { if (!cancelled) setError('Could not load accounts.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const addAccount = async (data: { name: string; kind: FinanceAccountKind; openingBalance: number; emoji?: string }) => {
    if (!user) throw new Error('Not signed in');
    const created = await saveFinanceAccount({
      userId: user.id,
      name: data.name.trim(),
      kind: data.kind,
      emoji: data.emoji || ACCOUNT_KIND_META[data.kind].emoji,
      openingBalance: data.openingBalance,
    });
    dispatch(upsertFinanceAccount(created));
    return created;
  };

  const editAccount = async (id: string, updates: Partial<FinanceAccount>) => {
    const patch = { ...updates, updatedAt: new Date().toISOString() };
    await updateFinanceAccountDoc(id, patch);
    const existing = accounts.find(a => a.id === id);
    if (existing) dispatch(upsertFinanceAccount({ ...existing, ...patch }));
  };

  const removeAccount = async (id: string) => {
    await deleteFinanceAccountById(id);
    dispatch(deleteFinanceAccount(id));
  };

  /** Per-account income, expense and running balance from the transaction list. */
  const rollups = useMemo(() => {
    const map: Record<string, { income: number; expense: number; count: number }> = {};
    (txns as ExpenseEntry[]).forEach(t => {
      const acc = t.account;
      if (!acc) return;
      if (!map[acc]) map[acc] = { income: 0, expense: 0, count: 0 };
      if (t.type === 'income') map[acc].income += t.amount;
      else map[acc].expense += t.amount;
      map[acc].count += 1;
    });
    return accounts.map(a => {
      const r = map[a.id] ?? { income: 0, expense: 0, count: 0 };
      return {
        account: a,
        income: r.income,
        expense: r.expense,
        count: r.count,
        balance: Math.round((a.openingBalance + r.income - r.expense) * 100) / 100,
      };
    });
  }, [accounts, txns]);

  const totalBalance = rollups.reduce((sum, r) => (r.account.archived ? sum : sum + r.balance), 0);

  const activeAccounts = accounts.filter(a => !a.archived);

  return {
    accounts, activeAccounts, loading, error,
    addAccount, editAccount, removeAccount,
    rollups, totalBalance,
    accountById: (id: string) => accounts.find(a => a.id === id) ?? null,
    rollupFor: (id: string) => rollups.find(r => r.account.id === id) ?? null,
  };
}


// ── Budgets (§11) ────────────────────────────────────────────────────────────

/**
 * Budgets are limits only. Everything about how a budget is *doing* — spent,
 * remaining, progress, whether to warn — is derived from transactions by
 * `budgetAnalytics`, never stored. §21 makes the transaction the source of
 * truth, and a cached "spent" figure is exactly the kind of second copy that
 * drifts out of step with the ledger behind it.
 */
export function useBudgets() {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const budgets = useSelector((s: RootState) => s.trackers.financeBudgets);
  const txns = useSelector((s: RootState) => s.trackers.expenses);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    dispatch(setFinanceBudgets(await fetchFinanceBudgets(user.id)));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .catch(() => { if (!cancelled) setError('Could not load budgets. Pull to refresh.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try { await load(); }
    catch { setError('Could not load budgets. Pull to refresh.'); }
    finally { setRefreshing(false); }
  }, [load]);

  const addBudget = async (data: {
    limit: number; period: BudgetPeriod; categoryKey?: string;
    startDay?: number; alertThreshold?: number;
  }) => {
    if (!user) return;
    const created = await saveFinanceBudget({ userId: user.id, ...data });
    dispatch(upsertFinanceBudget(created));
    return created;
  };

  const editBudget = async (id: string, updates: Partial<FinanceBudget>) => {
    const patch = { ...updates, updatedAt: new Date().toISOString() };
    await updateFinanceBudgetDoc(id, patch);
    const existing = budgets.find(b => b.id === id);
    if (existing) dispatch(upsertFinanceBudget({ ...existing, ...patch }));
  };

  const removeBudget = async (id: string) => {
    await deleteFinanceBudgetById(id);
    dispatch(deleteFinanceBudget(id));
  };

  /** Recomputes whenever a transaction changes, so §21 holds automatically. */
  const progress = useMemo(() => B.progressForAll(budgets, txns), [budgets, txns]);
  const overall = useMemo(() => B.overallBudget(budgets), [budgets]);
  const byCategory = useMemo(() => B.categoryBudgets(budgets), [budgets]);
  const budgetAlerts = useMemo(() => B.alerts(budgets, txns), [budgets, txns]);

  return {
    budgets, loading, refreshing, refresh, error,
    addBudget, editBudget, removeBudget,
    progress, overall, byCategory, alerts: budgetAlerts,
    budgetById: (id: string) => budgets.find(b => b.id === id) ?? null,
    progressFor: (b: FinanceBudget) => B.progressFor(b, txns),
    /** The budget covering a category, if one is set. */
    budgetForCategory: (key: string) => budgets.find(b => b.categoryKey === key) ?? null,
  };
}
