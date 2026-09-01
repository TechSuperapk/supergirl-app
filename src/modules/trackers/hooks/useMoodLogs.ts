/**
 * useMoodLogs — data + analytics for the rich Mood tracker.
 *
 * Everything derived here reads from Redux, so adding, editing or deleting a
 * log automatically recalculates the dashboard, calendar, charts, heatmap,
 * distribution, triggers and streaks with no manual invalidation.
 *
 * Kept in its own file rather than useTrackers.ts, which is already large.
 */
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { RootState } from '../../../store';
import { setMoodLogs, upsertMoodLog, deleteMoodLog } from '../store/trackersSlice';
import {
  fetchMoodLogs, saveMoodLog, updateMoodLogDoc, deleteMoodLogById,
} from '../services/trackersDbService';
import {
  MoodLog, MoodKey, MoodPeriod, POSITIVE_MOODS, moodScoreOf,
} from '../types';
import * as A from '../utils/moodAnalytics';

/**
 * Local calendar dates throughout. `toISOString()` shifts to UTC first, which
 * moves an evening log onto the next day's calendar cell and can break a
 * streak the user actually kept.
 */
const todayISO = () => A.todayISO();
const isoOf = (d: Date) => A.toISO(d);

export interface MoodFilters {
  moods?:       MoodKey[];
  influencers?: string[];
  activities?:  string[];
  minScore?:    number;
  maxScore?:    number;
  from?:        string;
  to?:          string;
}

export function useMoodLogs() {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const logs = useSelector((s: RootState) => s.trackers.moodLogs);

  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const ls = await fetchMoodLogs(user.id);
    dispatch(setMoodLogs(ls));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .catch(() => { if (!cancelled) setError('Could not load mood history. Pull to refresh.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try { await load(); }
    catch { setError('Could not load mood history. Pull to refresh.'); }
    finally { setRefreshing(false); }
  }, [load]);

  // ── Mutations ──
  const logMood = async (data: Omit<MoodLog, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('Not signed in');
    const saved = await saveMoodLog({ userId: user.id, ...data });
    dispatch(upsertMoodLog(saved));
    return saved;
  };

  const editMood = async (id: string, updates: Partial<MoodLog>) => {
    const patch = { ...updates, updatedAt: new Date().toISOString() };
    await updateMoodLogDoc(id, patch);
    const existing = logs.find(l => l.id === id);
    if (existing) dispatch(upsertMoodLog({ ...existing, ...patch }));
  };

  const removeMood = async (id: string) => {
    await deleteMoodLogById(id);
    dispatch(deleteMoodLog(id));
  };

  // ── Lookups ──
  const logFor = (date: string) => logs.find(l => l.date === date) ?? null;
  const todayLog = logFor(todayISO());

  /** Logs inside a period. */
  const logsIn = (period: MoodPeriod) => A.logsIn(logs, period);

  /** Free-form filtering for search/history screens. */
  const filterLogs = (f: MoodFilters) => logs.filter(l => {
    if (f.from && l.date < f.from) return false;
    if (f.to && l.date > f.to) return false;
    if (f.moods?.length && !f.moods.includes(l.mood)) return false;
    if (f.influencers?.length && !f.influencers.some(i => l.influencers.includes(i))) return false;
    if (f.activities?.length && !f.activities.some(a => l.activities.includes(a))) return false;
    const score = moodScoreOf(l);
    if (f.minScore != null && score < f.minScore) return false;
    if (f.maxScore != null && score > f.maxScore) return false;
    return true;
  });

  // ── Streaks ──
  /** Consecutive calendar days logged (§22) — several logs in a day count once. */
  const streak = A.streak(logs);

  /** Longest run of consecutive days with a positive mood, ever. */
  const longestHappyStreak = (() => {
    const positives = logs
      .filter(l => POSITIVE_MOODS.includes(l.mood))
      .map(l => l.date)
      .sort();
    let best = 0, run = 0;
    let prev: Date | null = null;
    for (const d of positives) {
      const cur = new Date(d + 'T00:00:00');
      if (prev && Math.round((cur.getTime() - prev.getTime()) / 86400000) === 1) run++;
      else run = 1;
      best = Math.max(best, run);
      prev = cur;
    }
    return best;
  })();

  /** Current run of consecutive positive-mood days ending today/yesterday. */
  const happyStreak = (() => {
    const byDate = new Map(logs.map(l => [l.date, l]));
    const check = new Date();
    if (!byDate.has(todayISO())) check.setDate(check.getDate() - 1);
    let n = 0;
    for (;;) {
      const l = byDate.get(isoOf(check));
      if (l && POSITIVE_MOODS.includes(l.mood)) { n++; check.setDate(check.getDate() - 1); } else break;
    }
    return n;
  })();

  /**
   * All period-scoped analytics in one place. Screens call this with whichever
   * range the user picked; nothing is hardcoded to a window.
   */
  const statsFor = (period: MoodPeriod) => {
    const scoped = logsIn(period);

    /**
     * Averaged over logged *days*, not logs (§21) — otherwise a day someone
     * logged twice would count double against a day they logged once.
     */
    const avgScore = A.averageScore(scoped);

    const distribution = A.distribution(scoped);
    const mostCommonMood = A.mostCommonMood(scoped);

    // Trend — one point per logged day, oldest first (§14).
    const trend = A.trend(scoped).map(p => ({
      label: p.label,
      value: p.value,
      date: p.date,
      mood: p.mood,
      influencers: scoped.find(l => l.date === p.date)?.influencers ?? [],
      notes: p.notes,
    }));

    /** Highest-scoring day, ties to the most recent (§13). */
    const best = A.bestDay(scoped);
    const bestLog: MoodLog | null = best ? best.logs[best.logs.length - 1] : null;

    const weekdayTotals = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
    scoped.forEach(l => {
      const wd = new Date(l.date + 'T00:00:00').getDay();
      weekdayTotals[wd].sum += moodScoreOf(l);
      weekdayTotals[wd].n += 1;
    });
    const weekdayAvgs = weekdayTotals.map((t, i) => ({
      weekday: i,
      label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
      avg: t.n ? Math.round((t.sum / t.n) * 10) / 10 : null,
    }));
    const bestWeekday = weekdayAvgs
      .filter(w => w.avg != null)
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))[0] ?? null;

    // Triggers — ranked by frequency (§18), carrying the average score so the
    // UI can separate the ones that lift mood from the ones that drag it down.
    const triggers = A.triggers(scoped);
    const baseline = avgScore ?? 5;
    const positiveTriggers = triggers.filter(t => t.avgScore >= baseline).slice(0, 5);
    const negativeTriggers = triggers.filter(t => t.avgScore < baseline)
      .sort((a, b) => a.avgScore - b.avgScore).slice(0, 5);

    /**
     * This period against the *previous equivalent period* (§12).
     *
     * Previously this compared the first half of the selected range with its
     * second half — movement within the window, which is a different question
     * and could not honestly be labelled "vs last 30 days".
     */
    const comparison = A.periodComparison(logs, period);
    const delta = comparison.change;

    return {
      logs: scoped,
      avgScore, distribution, mostCommonMood, trend,
      bestLog,
      bestDay: best,
      bestWeekday, weekdayAvgs,
      triggers, positiveTriggers, negativeTriggers,
      delta, comparison,
      journalCount: scoped.filter(l => !!l.notes?.trim()).length,
    };
  };

  /**
   * Heatmap cells for the last `weeks` weeks — one row per weekday, columns
   * oldest→newest, so the grid reads like the design.
   */
  const heatmap = (weeks = 6) => A.heatmap(logs, weeks);

  /** date → the log shown on that calendar cell, the day's most recent (§10). */
  const calendarMap = () => A.calendarMap(logs);

  return {
    logs, loading, refreshing, refresh, error,
    logMood, editMood, removeMood,
    logFor, todayLog, logsIn, filterLogs,
    streak, happyStreak, longestHappyStreak,
    statsFor, heatmap, calendarMap,
  };
}
