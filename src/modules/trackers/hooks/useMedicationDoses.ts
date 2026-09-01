/**
 * useMedicationDoses — per-day dose events for the medication tracker, plus the
 * adherence and timeline analytics built on top of them.
 *
 * Doses are separate records from the medication schedule so a medication can
 * accumulate a taken/missed/skipped history without its schedule being
 * rewritten. Status for *today* is derived rather than stored: a dose with no
 * explicit mark is "due" until its scheduled time passes, then "missed". That
 * way the list self-updates as the day goes on without a background job.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { RootState } from '../../../store';
import { setMedicationDoses, upsertMedicationDose, deleteMedicationDose } from '../store/trackersSlice';
import {
  fetchMedicationDoses, saveMedicationDose, deleteMedicationDoseById,
} from '../services/trackersDbService';
import {
  MedicationEntry, MedicationDose, MedicationStatus, SymptomEntry, SicknessPeriod,
} from '../types';

const todayISO = () => new Date().toISOString().split('T')[0];
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function periodStart(period: SicknessPeriod): string {
  if (period === 'all') return '0000-01-01';
  if (period === 'today') return todayISO();
  const d = new Date();
  if (period === 'week') d.setDate(d.getDate() - 6);
  else if (period === 'month') d.setDate(d.getDate() - 29);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('T')[0];
}

/** Is this medication scheduled to run on `date`, given its window and repeat? */
export function isScheduledOn(med: MedicationEntry, date: string): boolean {
  if (med.paused) return false;
  const start = med.startDate ?? med.date;
  if (start && date < start) return false;
  if (med.endDate && date > med.endDate) return false;

  const repeat = (med.reminderRepeat ?? med.frequency ?? 'Daily').toLowerCase();
  if (repeat.includes('as needed')) return false;          // no fixed schedule
  if (repeat.includes('alternate')) {
    const d0 = new Date((start || date) + 'T00:00:00').getTime();
    const d1 = new Date(date + 'T00:00:00').getTime();
    const days = Math.round((d1 - d0) / 86400000);
    return days >= 0 && days % 2 === 0;
  }
  if (repeat.includes('week')) {
    const d0 = new Date((start || date) + 'T00:00:00');
    const d1 = new Date(date + 'T00:00:00');
    return d0.getDay() === d1.getDay();
  }
  return true; // daily / once
}

export function useMedicationDoses(medications: MedicationEntry[], symptoms: SymptomEntry[] = []) {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const doses = useSelector((s: RootState) => s.trackers.medicationDoses);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const ds = await fetchMedicationDoses(user.id);
    dispatch(setMedicationDoses(ds));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .catch(() => { if (!cancelled) setError('Could not load medication history.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  /** Record (or change) the status of a medication on a date. */
  const markDose = async (
    med: MedicationEntry,
    status: MedicationStatus,
    date = todayISO(),
    extra?: { sideEffects?: string[]; notes?: string },
  ) => {
    if (!user) throw new Error('Not signed in');
    const saved = await saveMedicationDose({
      userId: user.id,
      medicationId: med.id,
      medicationName: med.medication,
      date,
      time: med.time,
      status,
      takenAt: status === 'taken' ? new Date().toISOString() : undefined,
      sideEffects: extra?.sideEffects,
      notes: extra?.notes,
    });
    dispatch(upsertMedicationDose(saved));
    return saved;
  };

  const removeDose = async (id: string) => {
    await deleteMedicationDoseById(id);
    dispatch(deleteMedicationDose(id));
  };

  const doseFor = (medicationId: string, date: string) =>
    doses.find(d => d.medicationId === medicationId && d.date === date) ?? null;

  /**
   * Effective status of a medication on a date. An explicit mark always wins;
   * otherwise it's "due" until the scheduled time passes, then "missed".
   */
  const statusFor = (med: MedicationEntry, date = todayISO()): MedicationStatus | 'not_scheduled' => {
    if (!isScheduledOn(med, date)) return 'not_scheduled';
    const explicit = doseFor(med.id, date);
    if (explicit) return explicit.status;
    const today = todayISO();
    if (date > today) return 'due';
    if (date < today) return 'missed';
    return nowHHMM() >= med.time ? 'missed' : 'due';
  };

  /** Today's schedule, ordered by dose time. */
  const todaySchedule = useMemo(() => {
    const today = todayISO();
    return medications
      .filter(m => isScheduledOn(m, today))
      .map(m => ({ med: m, status: statusFor(m, today) as MedicationStatus }))
      .sort((a, b) => a.med.time.localeCompare(b.med.time));
  }, [medications, doses]);

  const dueNow = todaySchedule.filter(x => x.status === 'due');
  const nextDose = dueNow[0] ?? null;

  /** Adherence over a range: taken ÷ all scheduled doses that have come due. */
  const adherenceFor = (period: SicknessPeriod) => {
    const start = periodStart(period);
    const today = todayISO();
    let scheduled = 0, taken = 0, missed = 0, skipped = 0;

    // Walk each day in range and count what was expected vs what happened.
    const cursor = new Date(start + 'T00:00:00');
    const end = new Date(today + 'T00:00:00');
    while (cursor <= end) {
      const ds = cursor.toISOString().split('T')[0];
      medications.forEach(m => {
        if (!isScheduledOn(m, ds)) return;
        // Today's not-yet-due doses shouldn't count against adherence.
        if (ds === today && nowHHMM() < m.time && !doseFor(m.id, ds)) return;
        scheduled++;
        const st = statusFor(m, ds);
        if (st === 'taken') taken++;
        else if (st === 'skipped') skipped++;
        else if (st === 'missed') missed++;
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      scheduled, taken, missed, skipped,
      adherencePct: scheduled ? Math.round((taken / scheduled) * 100) : null,
      missedPct: scheduled ? Math.round((missed / scheduled) * 100) : null,
    };
  };

  /** Symptom analytics for a range. */
  const symptomStatsFor = (period: SicknessPeriod) => {
    const start = periodStart(period);
    const scoped = symptoms.filter(s => s.date >= start);

    const freq: Record<string, number> = {};
    scoped.forEach(s => { freq[s.symptom] = (freq[s.symptom] ?? 0) + 1; });
    const mostCommon = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const temps = scoped
      .filter(s => s.temperature != null)
      .map(s => ({
        date: s.date,
        // Normalise to °C so the trend is comparable across units.
        value: s.temperatureUnit === 'F'
          ? Math.round(((s.temperature! - 32) * 5 / 9) * 10) / 10
          : s.temperature!,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Recovery time: days between logging a symptom and marking it resolved.
    const recoveries = scoped
      .filter(s => s.resolved && s.resolvedAt)
      .map(s => Math.max(0, Math.round(
        (new Date(s.resolvedAt! + 'T00:00:00').getTime() - new Date(s.date + 'T00:00:00').getTime()) / 86400000,
      )));
    const avgRecoveryDays = recoveries.length
      ? Math.round((recoveries.reduce((a, b) => a + b, 0) / recoveries.length) * 10) / 10
      : null;

    return {
      entries: scoped,
      total: scoped.length,
      activeCount: scoped.filter(s => !s.resolved).length,
      mostCommon,
      temperatureTrend: temps.map(t => ({ label: t.date.slice(5), value: t.value })),
      avgRecoveryDays,
      severityCounts: {
        mild: scoped.filter(s => s.severity === 'mild').length,
        moderate: scoped.filter(s => s.severity === 'moderate').length,
        severe: scoped.filter(s => s.severity === 'severe').length,
      },
    };
  };

  /**
   * A single health score out of 100: adherence weighted against how many
   * symptoms were active, so it reflects both sides of the tracker. Returns
   * null rather than a misleading number when there's nothing to score.
   */
  const healthScoreFor = (period: SicknessPeriod): number | null => {
    const a = adherenceFor(period);
    const sym = symptomStatsFor(period);
    if (a.scheduled === 0 && sym.total === 0) return null;
    const adherencePart = a.adherencePct ?? 100;
    // Each severe symptom costs more than a mild one; capped so it can't
    // dominate the score entirely.
    const penalty = Math.min(40, sym.severityCounts.severe * 8 + sym.severityCounts.moderate * 4 + sym.severityCounts.mild * 1);
    return Math.max(0, Math.min(100, Math.round(adherencePart - penalty)));
  };

  /** Symptoms and doses merged into one reverse-chronological feed. */
  const timelineFor = (period: SicknessPeriod) => {
    const start = periodStart(period);
    const items = [
      ...symptoms.filter(s => s.date >= start).map(s => ({
        kind: 'symptom' as const,
        id: s.id,
        date: s.date,
        time: s.time ?? '00:00',
        entry: s,
      })),
      ...doses.filter(d => d.date >= start).map(d => ({
        kind: 'dose' as const,
        id: d.id,
        date: d.date,
        time: d.time,
        entry: d,
      })),
    ];
    return items.sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  };

  return {
    doses, loading, error,
    markDose, removeDose, doseFor, statusFor,
    todaySchedule, dueNow, nextDose,
    adherenceFor, symptomStatsFor, healthScoreFor, timelineFor,
    periodStart,
  };
}
