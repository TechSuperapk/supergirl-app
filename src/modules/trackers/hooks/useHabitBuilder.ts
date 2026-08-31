/**
 * useHabitBuilder — create / edit / pause / resume / soft-delete / restore a
 * Habit from the "Add Habit" (Goals) screen, and keep its scheduled
 * notifications in sync.
 */
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { addHabit, updateHabit, deleteHabit } from '../store/trackersSlice';
import { createHabit, updateHabitDoc, deleteHabitById } from '../services/trackersDbService';
import {
  scheduleDailyReminder, cancelReminder,
} from '../../notifications/services/notificationService';
import { Habit, ReminderOffset } from '../types';
import { nextOccurrence, toISODate } from '../utils/habitSchedule';

const todayISO = () => toISODate(new Date());

const OFFSET_MINUTES: Record<ReminderOffset, number> = {
  none: 0, '5m': 5, '10m': 10, '15m': 15, '30m': 30, '1h': 60, '12h': 720, '1d': 1440,
};

const notifId = (habitId: string, i: number) => `habit_${habitId}_${i}`;

/** (time HH:mm − offset) → { hour, minute } wrapped into a valid 24h clock. */
function shiftTime(hhmm: string, offsetMins: number): { hour: number; minute: number } {
  const [h, m] = hhmm.split(':').map(Number);
  let total = h * 60 + m - offsetMins;
  total = ((total % 1440) + 1440) % 1440; // wrap
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

/** Cancel every notification we might have scheduled for this habit. */
async function cancelHabitNotifications(habitId: string, count = 12): Promise<void> {
  for (let i = 0; i < count; i++) await cancelReminder(notifId(habitId, i));
}

/**
 * (Re)schedule one local notification per time slot. Returns the ids used.
 *
 * Always cancels first, so editing a habit can't leave a stale reminder behind
 * or double up when the screen is saved twice.
 */
async function scheduleHabitNotifications(habit: Habit): Promise<string[]> {
  await cancelHabitNotifications(habit.id);
  const times = habit.times;
  const active = habit.status !== 'deleted' && !habit.isPaused;
  if (!active || !habit.setTimeEnabled || !times || times.length === 0) return [];

  // Nothing to remind about if the habit never occurs again — an ended habit,
  // or one whose repeat rule has no future match.
  if (!nextOccurrence(habit, todayISO(), 366)) return [];

  const offset = OFFSET_MINUTES[habit.reminderOffset ?? 'none'] ?? 0;
  // "Sound Alarm" gets the max-importance alarm channel so it rings with the
  // app closed; plain push goes to the quieter social channel.
  const channel = habit.notificationType === 'sound_alarm' ? 'alarms' : 'social';
  const ids: string[] = [];

  for (let i = 0; i < times.length; i++) {
    const { hour, minute } = shiftTime(times[i], offset);
    const id = notifId(habit.id, i);
    await scheduleDailyReminder(
      id,
      habit.name || 'Habit reminder',
      habit.hasTarget && habit.targetAmount
        ? `Time for ${habit.name} — ${habit.targetAmount} ${habit.targetUnit ?? ''}`.trim()
        : `Time for ${habit.name || 'your habit'}`,
      hour, minute,
      channel,
    );
    ids.push(id);
  }
  return ids;
}

export function useHabitBuilder() {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);

  /** Create a brand-new habit, or update an existing one when `existingId` is set. */
  const saveHabit = useCallback(async (
    draft: Partial<Habit>,
    existingId?: string,
  ): Promise<Habit | undefined> => {
    if (!user) return;
    const now = new Date().toISOString();

    if (existingId) {
      const merged = {
        ...draft, id: existingId, userId: user.id, updatedAt: now,
      } as Habit;
      const ids = await scheduleHabitNotifications(merged);
      merged.notifIds = ids;
      await updateHabitDoc(existingId, { ...draft, notifIds: ids, updatedAt: now });
      dispatch(updateHabit(merged));
      return merged;
    }

    // Create
    const base: Omit<Habit, 'id' | 'createdAt' | 'streak'> = {
      userId:           user.id,
      name:             draft.name?.trim() || 'Unnamed Habit',
      icon:             draft.icon ?? '',
      color:            draft.color ?? '#FF5A5A',
      frequency:        'daily',
      hasTarget:        draft.hasTarget ?? false,
      targetAmount:     draft.targetAmount,
      targetUnit:       draft.targetUnit,
      repeatCycle:      draft.repeatCycle ?? 'daily',
      customInterval:   draft.customInterval,
      timesMode:        draft.timesMode ?? 'once',
      timesPerPeriod:   draft.timesPerPeriod ?? 1,
      setTimeEnabled:   draft.setTimeEnabled ?? false,
      times:            draft.times ?? [],
      notificationType: draft.notificationType ?? 'push',
      reminderOffset:   draft.reminderOffset ?? 'none',
      startDate:        draft.startDate ?? now.split('T')[0],
      endDate:          draft.endDate,
      isBadHabit:       draft.isBadHabit ?? false,
      isPaused:         false,
      status:           'active',
      notifIds:         [],
      updatedAt:        now,
    };
    const created = await createHabit(base);
    const ids = await scheduleHabitNotifications(created);
    if (ids.length) {
      await updateHabitDoc(created.id, { notifIds: ids });
      created.notifIds = ids;
    }
    dispatch(addHabit(created));
    return created;
  }, [user?.id]);

  const pauseHabit = useCallback(async (habit: Habit) => {
    const updated = { ...habit, isPaused: true, status: 'paused' as const };
    await cancelHabitNotifications(habit.id);
    await updateHabitDoc(habit.id, { isPaused: true, status: 'paused', notifIds: [] });
    dispatch(updateHabit({ ...updated, notifIds: [] }));
  }, []);

  const resumeHabit = useCallback(async (habit: Habit) => {
    const updated = { ...habit, isPaused: false, status: 'active' as const };
    const ids = await scheduleHabitNotifications(updated);
    await updateHabitDoc(habit.id, { isPaused: false, status: 'active', notifIds: ids });
    dispatch(updateHabit({ ...updated, notifIds: ids }));
  }, []);

  /** Soft-delete: keep the record (History) but stop everything. */
  const softDeleteHabit = useCallback(async (habit: Habit) => {
    await cancelHabitNotifications(habit.id);
    await updateHabitDoc(habit.id, { status: 'deleted', isPaused: true, notifIds: [] });
    dispatch(updateHabit({ ...habit, status: 'deleted', isPaused: true, notifIds: [] }));
  }, []);

  const restoreHabit = useCallback(async (habit: Habit) => {
    const updated = { ...habit, status: 'active' as const, isPaused: false };
    const ids = await scheduleHabitNotifications(updated);
    await updateHabitDoc(habit.id, { status: 'active', isPaused: false, notifIds: ids });
    dispatch(updateHabit({ ...updated, notifIds: ids }));
  }, []);

  /** Hard delete (permanent) — used from History. */
  const purgeHabit = useCallback(async (habit: Habit) => {
    await cancelHabitNotifications(habit.id);
    await deleteHabitById(habit.id);
    dispatch(deleteHabit(habit.id));
  }, []);

  return { saveHabit, pauseHabit, resumeHabit, softDeleteHabit, restoreHabit, purgeHabit };
}
