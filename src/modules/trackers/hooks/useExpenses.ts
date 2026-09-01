/**
 * useExpenses — data layer for the Expense tracker. CRUD against
 * `trackers_expenses` via the backend, cached in the Redux store (offline
 * reads), with optimistic add/remove and pull-to-refresh.
 */
import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { setExpenses, addExpenseEntry, deleteExpenseEntry } from '../store/trackersSlice';
import { listDocs, createDoc, patchDoc, removeDoc } from '../../../services/dataApi';
import { ExpenseEntry } from '../types';

const sortDesc = (a: ExpenseEntry, b: ExpenseEntry) =>
  `${b.date}${b.createdAt ?? ''}`.localeCompare(`${a.date}${a.createdAt ?? ''}`);

export function useExpenses() {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const txns = useSelector((s: RootState) => s.trackers.expenses);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => {
    const all = await listDocs<ExpenseEntry>('trackers_expenses');
    dispatch(setExpenses([...all].sort(sortDesc)));
  }, [dispatch]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    load().catch(e => setError(e?.message ?? 'Failed to load')).finally(() => setLoading(false));
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); setError(null); } catch (e: any) { setError(e?.message ?? 'Failed'); }
    finally { setRefreshing(false); }
  }, [load]);

  /** Create a transaction (optimistic). */
  const add = useCallback(async (data: Omit<ExpenseEntry, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const temp: ExpenseEntry = { ...(data as any), id: `tmp_${Date.now()}`, userId: user.id, createdAt: new Date().toISOString() };
    dispatch(addExpenseEntry(temp));                        // optimistic
    try {
      const saved = await createDoc<ExpenseEntry>('trackers_expenses', data);
      dispatch(deleteExpenseEntry(temp.id));
      dispatch(addExpenseEntry(saved));
      return saved;
    } catch (e) {
      dispatch(deleteExpenseEntry(temp.id));               // rollback
      throw e;
    }
  }, [user?.id, dispatch]);

  const update = useCallback(async (id: string, patch: Partial<ExpenseEntry>) => {
    const saved = await patchDoc<ExpenseEntry>('trackers_expenses', id, patch);
    await load();
    return saved;
  }, [load]);

  const remove = useCallback(async (id: string) => {
    dispatch(deleteExpenseEntry(id));                      // optimistic
    try { await removeDoc('trackers_expenses', id); } catch { await load(); }
  }, [dispatch, load]);

  return { txns, loading, refreshing, error, refresh, add, update, remove };
}
