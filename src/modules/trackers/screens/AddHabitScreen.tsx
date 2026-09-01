/**
 * AddHabitScreen — the "Add Habit" (Goals) builder. Configures a habit and its
 * schedule; also edits an existing habit and offers pause / delete.
 * Reached from the + FAB on the Trackers/Goals home.
 */
import { BackArrowIcon } from '../../../shared/components/AppBackButton';
import React, { useMemo, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput, StyleSheet, Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState } from '../../../store';
import { AppText } from '../../../shared/components/AppText';
import { Colors } from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { FontFamily } from '../../../shared/theme/typography';
import {
  Habit, RepeatCycle, CustomInterval, HabitNotificationType, ReminderOffset,
  LAST_DAY, LAST_WEEK,
} from '../types';
import { useHabitBuilder } from '../hooks/useHabitBuilder';
import { CustomIntervalModal, summarizeInterval } from '../components/CustomIntervalModal';
import {
  ConfirmDialog, ColorPickerSheet, TargetAmountSheet, AddTimeSheet,
  NotificationTypeSheet, ReminderSheet, DatePickerSheet,
  AppToggle, MultiChoiceSheet,
} from '../components/HabitOverlays';

type Props = NativeStackScreenProps<any, 'AddHabit'>;

const REPEAT_CHIPS: { key: RepeatCycle; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Week' },
  { key: 'monthly', label: 'Month' },
  { key: 'yearly', label: 'Year' },
];
// ── Repeat-cycle option sets ────────────────────────────────────────────────
// 0 = Sunday to match Date#getDay, but listed Monday-first the way the week
// reads to a user.
const WEEKDAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0].map(k => ({
  key: k, label: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][k],
}));
const MONTH_DAY_OPTIONS = [
  ...Array.from({ length: 31 }, (_, i) => ({ key: i + 1, label: String(i + 1) })),
  { key: LAST_DAY, label: 'Last day' },
];
const MONTH_WEEK_OPTIONS = [
  { key: 1, label: '1st week' }, { key: 2, label: '2nd week' },
  { key: 3, label: '3rd week' }, { key: 4, label: '4th week' },
  { key: LAST_WEEK, label: 'Last week' },
];
const MONTH_OPTIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  .map((label, key) => ({ key, label }));

const SHORT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The Repeat Cycle "customize" affordance — a pencil, per the design. */
const PencilIcon = ({ on }: { on: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z"
      stroke={on ? Colors.white : '#141414'}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </Svg>
);

const REMINDER_LABEL: Record<ReminderOffset, string> = {
  none: 'None', '5m': '5 min before', '10m': '10 min before', '15m': '15 min before',
  '30m': '30 min before', '1h': '1 hour before', '12h': '12 hour before', '1d': '1 day before',
};
const NOTIF_LABEL: Record<HabitNotificationType, string> = { push: 'Push Notification', sound_alarm: 'Sound Alarm' };
const HIT = { top: 8, bottom: 8, left: 8, right: 8 };
const todayISO = () => new Date().toISOString().split('T')[0];

export function AddHabitScreen({ navigation, route }: Props) {
  const habitId: string | undefined = route.params?.habitId;
  const existing = useSelector((st: RootState) =>
    st.trackers.habits.find(h => h.id === habitId));
  const { saveHabit, pauseHabit, resumeHabit, softDeleteHabit } = useHabitBuilder();

  // ── Draft state ──
  const [name, setName] = useState(existing?.name && existing.name !== 'Unnamed Habit' ? existing.name : '');
  const [color, setColor] = useState(existing?.color ?? '#FF5A5A');
  const [hasTarget, setHasTarget] = useState(existing?.hasTarget ?? false);
  const [targetAmount, setTargetAmount] = useState<number | undefined>(existing?.targetAmount);
  const [targetUnit, setTargetUnit] = useState<string | undefined>(existing?.targetUnit);
  const [repeatCycle, setRepeatCycle] = useState<RepeatCycle>(existing?.repeatCycle ?? 'daily');
  const [customInterval, setCustomInterval] = useState<CustomInterval | undefined>(existing?.customInterval);
  const [timesMode, setTimesMode] = useState<'once' | 'many'>(existing?.timesMode ?? 'once');
  const [timesPerPeriod, setTimesPerPeriod] = useState(existing?.timesPerPeriod ?? 1);
  const [setTimeEnabled, setSetTimeEnabled] = useState(existing?.setTimeEnabled ?? true);
  const [times, setTimes] = useState<string[]>(existing?.times ?? ['09:00', '17:00']);
  const [notificationType, setNotificationType] = useState<HabitNotificationType>(existing?.notificationType ?? 'push');
  const [reminderOffset, setReminderOffset] = useState<ReminderOffset>(existing?.reminderOffset ?? 'none');
  const [startDate, setStartDate] = useState(existing?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState<string | undefined>(existing?.endDate);
  const [isBadHabit, setIsBadHabit] = useState(existing?.isBadHabit ?? false);
  const [isPaused, setIsPaused] = useState(existing?.isPaused ?? false);

  // ── Per-cycle repeat selection ──
  const [dailyPreset,   setDailyPreset]   = useState<'all' | 'weekdays' | 'weekends'>(existing?.repeatDailyPreset ?? 'all');
  const [weekdaysSel,   setWeekdaysSel]   = useState<number[]>(existing?.repeatWeekdays  ?? []);
  const [monthDaysSel,  setMonthDaysSel]  = useState<number[]>(existing?.repeatMonthDays ?? []);
  const [monthWeeksSel, setMonthWeeksSel] = useState<number[]>(existing?.repeatMonthWeeks?? []);
  const [monthsSel,     setMonthsSel]     = useState<number[]>(existing?.repeatMonths    ?? []);

  // ── Sheet visibility ──
  const [sheet, setSheet] = useState<
    null | 'color' | 'target' | 'time' | 'notif' | 'reminder' | 'start' | 'end' | 'custom'
    | 'weekdays' | 'monthDays' | 'monthWeeks' | 'months'
  >(null);
  const [confirm, setConfirm] = useState<null | 'pause' | 'delete'>(null);
  const [saving, setSaving] = useState(false);
  /** Which slot the time wheel is editing; null means "adding a new one". */
  const [editingTime, setEditingTime] = useState<string | null>(null);
  const close = () => setSheet(null);

  const displayName = name.trim() || 'Unnamed Habit';

  /**
   * Live preview of how the habit will read on the Goals list — "Laugh 10
   * times". Shown next to the name field rather than in the header, and only
   * once a target exists: without one it would just echo the name back.
   */
  const targetSuffix = hasTarget && targetAmount
    ? `${targetAmount}${targetUnit?.trim() ? ` ${targetUnit.trim()}` : ''}`
    : '';

  /**
   * Width of the typed name, measured off a hidden mirror of the same text.
   * A TextInput has no intrinsic content width in RN — left to itself it either
   * collapses or fills the row — so the suffix would float off to the right
   * edge instead of sitting against the name. Measuring lets the field hug its
   * content and the suffix follow immediately after it.
   */
  const [nameWidth, setNameWidth] = useState(0);

  // Keep the number of time slots in sync with "Many times = N".
  const syncTimesForMany = (n: number) => {
    setTimes(prev => {
      const next = [...prev];
      while (next.length < n) next.push('09:00');
      return next.slice(0, n);
    });
  };
  const setMany = (n: number) => {
    const clamped = Math.max(1, n);
    setTimesPerPeriod(clamped);
    setTimesMode('many');
    setSetTimeEnabled(true);
    syncTimesForMany(clamped);
  };

  const addTime = (hhmm: string) => {
    setTimes(prev => {
      if (prev.includes(hhmm)) return prev;
      const next = [...prev, hhmm].sort();
      // For "many", keep exactly N by dropping the oldest extra.
      if (timesMode === 'many' && next.length > timesPerPeriod) next.shift();
      return next;
    });
  };
  /** Replace one slot in place, keeping the list sorted and duplicate-free. */
  const replaceTime = (oldTime: string, next: string) => {
    setTimes(prev => {
      if (prev.includes(next)) return prev;          // already have that slot
      return prev.map(x => (x === oldTime ? next : x)).sort();
    });
  };

  const removeTime = (t: string) => {
    if (timesMode === 'many' && times.length <= timesPerPeriod) return; // keep required count
    setTimes(prev => prev.filter(x => x !== t));
  };

  const repeatLabel = repeatCycle === 'custom' && customInterval
    ? summarizeInterval(customInterval)
    : REPEAT_CHIPS.find(c => c.key === repeatCycle)?.label ?? 'Daily';

  const draft: Partial<Habit> = useMemo(() => ({
    name: displayName, color, hasTarget,
    targetAmount: hasTarget ? targetAmount : undefined,
    targetUnit: hasTarget ? targetUnit : undefined,
    repeatCycle, customInterval: repeatCycle === 'custom' ? customInterval : undefined,
    // Only the selection belonging to the active cycle is written — switching
    // Month → Week shouldn't leave stale month-days on the habit.
    repeatDailyPreset: repeatCycle === 'daily'   ? dailyPreset   : undefined,
    repeatWeekdays:    repeatCycle === 'weekly'  ? weekdaysSel   : undefined,
    repeatMonthDays:   repeatCycle === 'monthly' ? monthDaysSel  : undefined,
    repeatMonthWeeks:  repeatCycle === 'monthly' ? monthWeeksSel : undefined,
    repeatMonths:      repeatCycle === 'yearly'  ? monthsSel     : undefined,
    timesMode, timesPerPeriod: timesMode === 'many' ? timesPerPeriod : 1,
    setTimeEnabled, times: setTimeEnabled ? times : [],
    notificationType, reminderOffset, startDate, endDate, isBadHabit,
  }), [displayName, color, hasTarget, targetAmount, targetUnit, repeatCycle, customInterval,
      timesMode, timesPerPeriod, setTimeEnabled, times, notificationType, reminderOffset,
      startDate, endDate, isBadHabit,
      dailyPreset, weekdaysSel, monthDaysSel, monthWeeksSel, monthsSel]);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveHabit(draft, habitId);
      navigation.goBack();
    } finally { setSaving(false); }
  };

  const doPauseToggle = async () => {
    if (!existing) return;
    if (isPaused) { await resumeHabit(existing); setIsPaused(false); }
    else { await pauseHabit(existing); setIsPaused(true); }
    setConfirm(null);
  };
  const doDelete = async () => {
    if (!existing) return;
    await softDeleteHabit(existing);
    setConfirm(null);
    navigation.navigate('HabitHistory');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <BackArrowIcon />
        </TouchableOpacity>
        <AppText variant="headingSmall">{habitId ? 'Edit Habit' : 'Add Habit'}</AppText>
        <TouchableOpacity onPress={onSave} disabled={saving} style={s.headerBtn}>
          <AppText variant="button" color={Colors.primary}>{saving ? '…' : 'Save'}</AppText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Name + color */}
        <View style={s.nameRow}>
          <TouchableOpacity onPress={() => setSheet('color')} style={[s.colorDot, { backgroundColor: color }]} />

          <TextInput
            // Sized to the measured text, capped so a long name still leaves
            // the suffix visible rather than pushing it off-screen.
            style={[s.nameInput, targetSuffix ? { width: Math.min(nameWidth + 4, 200) } : { flex: 1 }]}
            placeholder="Unnamed Habit"
            placeholderTextColor={Colors.textLight}
            value={name}
            onChangeText={setName}
          />

          {targetSuffix ? (
            <AppText style={s.nameSuffix} numberOfLines={1}>{targetSuffix}</AppText>
          ) : null}

          {/* Hidden mirror — never visible, exists only to report the width the
              same string occupies in the same font. */}
          <Text
            style={[s.nameInput, s.nameMirror]}
            numberOfLines={1}
            onLayout={e => setNameWidth(e.nativeEvent.layout.width)}
          >
            {name || 'Unnamed Habit'}
          </Text>
        </View>

        {/* Target */}
        <Card>
          <Row>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <AppText variant="headingSmall">Set Target Amount</AppText>
              {hasTarget && targetAmount ? (
                <AppText variant="label" color={Colors.primary}>{targetAmount} {targetUnit}</AppText>
              ) : null}
            </View>
            <AppToggle
              value={hasTarget}
              onValueChange={(v) => { if (v) setSheet('target'); else { setHasTarget(false); } }}
            />
          </Row>
        </Card>

        {/* Repeat cycle */}
        <Card>
          <Row>
            <AppText variant="headingSmall">Repeat Cycle</AppText>
            <AppText variant="body" color={Colors.textSecondary}>{repeatLabel}</AppText>
          </Row>
          {/* Five options share one row — they're a single choice, and wrapping
              split them across two lines with no meaning to the break. */}
          <View style={s.chipsRow}>
            {REPEAT_CHIPS.map(c => {
              const active = repeatCycle === c.key;
              return (
                <TouchableOpacity key={c.key}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setRepeatCycle(c.key)}>
                  {/* One fixed size for every chip — no adjustsFontSizeToFit.
                      Equal-width slots plus auto-shrink meant "Every Month"
                      rendered smaller than "Daily" beside it; letting each
                      chip hug its own label keeps all four at the same size. */}
                  <AppText
                    style={s.chipTxt}
                    color={active ? Colors.white : Colors.textSecondary}
                    numberOfLines={1}
                  >
                    {active && c.key !== 'daily' ? `Every ${c.label}` : c.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[s.pencilChip, repeatCycle === 'custom' && s.chipActive]}
              onPress={() => setSheet('custom')}
              accessibilityLabel="Customize repeat interval">
              <PencilIcon on={repeatCycle === 'custom'} />
            </TouchableOpacity>
          </View>

          {/* Second row — what it offers depends on the cycle above. Daily has
              no "Anytime" because every day already is anytime. */}
          <View style={s.subRow}>
            {repeatCycle === 'daily' && (
              <>
                <SubChip label="Weekdays" active={dailyPreset === 'weekdays'}
                  onPress={() => setDailyPreset(p => (p === 'weekdays' ? 'all' : 'weekdays'))} />
                <SubChip label="Weekends" active={dailyPreset === 'weekends'}
                  onPress={() => setDailyPreset(p => (p === 'weekends' ? 'all' : 'weekends'))} />
              </>
            )}

            {repeatCycle === 'weekly' && (
              <>
                <AppText variant="bodySmall" color={Colors.textMuted} style={s.subLabel}>Weekly</AppText>
                <SubChip label="Anytime" active={weekdaysSel.length === 0}
                  onPress={() => setWeekdaysSel([])} />
                <SubChip
                  label={weekdaysSel.length ? weekdaysSel.map(d => SHORT_DAY[d]).join(', ') : 'Select weekday'}
                  active={weekdaysSel.length > 0}
                  onPress={() => setSheet('weekdays')}
                />
              </>
            )}

            {repeatCycle === 'monthly' && (
              <>
                <AppText variant="bodySmall" color={Colors.textMuted} style={s.subLabel}>Monthly</AppText>
                <SubChip label="Anytime" active={monthDaysSel.length === 0 && monthWeeksSel.length === 0}
                  onPress={() => { setMonthDaysSel([]); setMonthWeeksSel([]); }} />
                <SubChip
                  label={monthDaysSel.length ? `${monthDaysSel.length} date${monthDaysSel.length > 1 ? 's' : ''}` : 'Select Date'}
                  active={monthDaysSel.length > 0}
                  onPress={() => setSheet('monthDays')}
                />
                <SubChip
                  label={monthWeeksSel.length ? `${monthWeeksSel.length} week${monthWeeksSel.length > 1 ? 's' : ''}` : 'Select Week'}
                  active={monthWeeksSel.length > 0}
                  onPress={() => setSheet('monthWeeks')}
                />
              </>
            )}

            {repeatCycle === 'yearly' && (
              <>
                <AppText variant="bodySmall" color={Colors.textMuted} style={s.subLabel}>Yearly</AppText>
                <SubChip label="Anytime" active={monthsSel.length === 0}
                  onPress={() => setMonthsSel([])} />
                <SubChip
                  label={monthsSel.length ? monthsSel.map(m => MONTH_OPTIONS[m].label).join(', ') : 'Select Month'}
                  active={monthsSel.length > 0}
                  onPress={() => setSheet('months')}
                />
              </>
            )}
          </View>
        </Card>

        {/* Frequency */}
        <Card>
          <AppText variant="headingSmall" style={{ marginBottom: 12 }}>Frequency</AppText>
          <View style={s.chips}>
            <TouchableOpacity
              style={[s.chip, timesMode === 'once' && s.chipActive]}
              onPress={() => { setTimesMode('once'); setTimesPerPeriod(1); }}>
              <AppText variant="bodySmall" color={timesMode === 'once' ? Colors.white : Colors.textSecondary}>Once</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.chip, timesMode === 'many' && s.chipActive]}
              onPress={() => setMany(timesPerPeriod > 1 ? timesPerPeriod : 3)}>
              <AppText variant="bodySmall" color={timesMode === 'many' ? Colors.white : Colors.textSecondary}>Many times</AppText>
            </TouchableOpacity>

            {timesMode === 'many' && (
              <View style={s.stepper}>
                <TouchableOpacity onPress={() => setMany(timesPerPeriod - 1)} style={s.stepBtn}>
                  <AppText variant="headingSmall" color={Colors.textPrimary}>−</AppText>
                </TouchableOpacity>
                <AppText variant="headingSmall" style={{ minWidth: 28, textAlign: 'center' }}>{timesPerPeriod}</AppText>
                <TouchableOpacity onPress={() => setMany(timesPerPeriod + 1)} style={s.stepBtn}>
                  <AppText variant="headingSmall" color={Colors.textPrimary}>+</AppText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Card>

        {/* Set time */}
        <Card>
          <Row>
            <AppText variant="headingSmall">Set Time</AppText>
            <AppToggle value={setTimeEnabled} onValueChange={setSetTimeEnabled} />
          </Row>
          {setTimeEnabled && (
            <View style={s.timeWrap}>
              {/* Tapping the time itself reopens the wheel on that slot — with
                  "Many times = N" you need to set each one, and remove-then-add
                  loses your place in the list. */}
              {times.map(t => (
                <View key={t} style={s.timeChip}>
                  <TouchableOpacity onPress={() => { setEditingTime(t); setSheet('time'); }} hitSlop={HIT}>
                    <AppText variant="body" color={Colors.textPrimary}>{t}</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeTime(t)} style={s.timeX}>
                    <AppText variant="caption" color={Colors.textMuted}>✕</AppText>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={s.addTime} onPress={() => { setEditingTime(null); setSheet('time'); }}>
                <AppText variant="body" color={Colors.textSecondary}>+ Add</AppText>
              </TouchableOpacity>
            </View>
          )}
          {timesMode === 'many' && (
            <AppText variant="caption" color={Colors.textMuted} style={{ marginTop: 8 }}>
              {timesPerPeriod} times/day — set {timesPerPeriod} time{timesPerPeriod > 1 ? 's' : ''}.
            </AppText>
          )}
        </Card>

        {/* Notification + Reminder */}
        <Card>
          <TouchableOpacity onPress={() => setSheet('notif')}>
            <Row>
              <AppText variant="headingSmall">Notification</AppText>
              <AppText variant="body" color={Colors.textMuted}>{NOTIF_LABEL[notificationType]} ›</AppText>
            </Row>
          </TouchableOpacity>
          <View style={s.divider} />
          <TouchableOpacity onPress={() => setSheet('reminder')}>
            <Row>
              <AppText variant="headingSmall">Reminder</AppText>
              <AppText variant="body" color={Colors.textMuted}>{REMINDER_LABEL[reminderOffset]} ›</AppText>
            </Row>
          </TouchableOpacity>
        </Card>

        {/* Period */}
        <Card>
          <AppText variant="headingSmall" style={{ marginBottom: 12 }}>Period</AppText>
          <View style={s.periodRow}>
            <TouchableOpacity style={s.datePill} onPress={() => setSheet('start')}>
              <AppText variant="body" color={Colors.textSecondary}>📅 {startDate}</AppText>
            </TouchableOpacity>
            <AppText variant="body" color={Colors.textMuted}>–</AppText>
            <TouchableOpacity style={s.datePill} onPress={() => setSheet('end')}>
              <AppText variant="body" color={endDate ? Colors.textSecondary : Colors.textLight}>
                📅 {endDate ?? 'End date'}
              </AppText>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Bad habit */}
        <Card>
          <Row>
            <AppText variant="headingSmall">Mark as bad habit</AppText>
            <AppToggle value={isBadHabit} onValueChange={setIsBadHabit} />
          </Row>
        </Card>

        {/* Pause / delete (edit only) */}
        {habitId && (
          <Card>
            <TouchableOpacity onPress={() => setConfirm('pause')}>
              <View style={s.lifecycleRow}>
                <AppText variant="body" color={Colors.warning}>⏸</AppText>
                <AppText variant="headingSmall">{isPaused ? 'Resume habit' : 'Pause habit'}</AppText>
              </View>
            </TouchableOpacity>
            <View style={s.divider} />
            <TouchableOpacity onPress={() => setConfirm('delete')}>
              <View style={s.lifecycleRow}>
                <AppText variant="body" color={Colors.error}>🗑</AppText>
                <AppText variant="headingSmall" color={Colors.error}>Delete habit</AppText>
              </View>
            </TouchableOpacity>
          </Card>
        )}

        <TouchableOpacity style={s.saveBtn} onPress={onSave} disabled={saving} activeOpacity={0.9}>
          <AppText variant="button" color={Colors.white}>
            {saving ? 'Saving…' : habitId ? 'Save Changes' : 'Create Habit'}
          </AppText>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Overlays ── */}
      <ColorPickerSheet visible={sheet === 'color'} current={color}
        onSelect={setColor} onClose={close} />

      <TargetAmountSheet visible={sheet === 'target'} amount={targetAmount} unit={targetUnit}
        onConfirm={(a, u) => { setTargetAmount(a); setTargetUnit(u); setHasTarget(true); }}
        onClose={close} />

      <AddTimeSheet
        visible={sheet === 'time'}
        initial={editingTime ?? undefined}
        onAdd={hhmm => { if (editingTime) replaceTime(editingTime, hhmm); else addTime(hhmm); }}
        onClose={() => { setEditingTime(null); close(); }}
      />

      <NotificationTypeSheet visible={sheet === 'notif'} value={notificationType}
        onSelect={setNotificationType} onClose={close} />

      <ReminderSheet visible={sheet === 'reminder'} value={reminderOffset}
        onConfirm={setReminderOffset} onClose={close} />

      <DatePickerSheet visible={sheet === 'start'} title="Start Date" value={startDate}
        onConfirm={(iso) => { setStartDate(iso); if (endDate && endDate < iso) setEndDate(undefined); }}
        onClose={close} />

      <DatePickerSheet visible={sheet === 'end'} title="End Date" value={endDate} min={startDate}
        onConfirm={setEndDate} onClose={close} />

      <MultiChoiceSheet
        visible={sheet === 'weekdays'} title="Select weekday" columns={2}
        options={WEEKDAY_OPTIONS} selected={weekdaysSel}
        onConfirm={setWeekdaysSel} onClose={() => setSheet(null)}
      />
      <MultiChoiceSheet
        visible={sheet === 'monthDays'} title="Select Date" columns={7}
        options={MONTH_DAY_OPTIONS} selected={monthDaysSel}
        onConfirm={setMonthDaysSel} onClose={() => setSheet(null)}
      />
      <MultiChoiceSheet
        visible={sheet === 'monthWeeks'} title="Select week" columns={2}
        options={MONTH_WEEK_OPTIONS} selected={monthWeeksSel}
        onConfirm={setMonthWeeksSel} onClose={() => setSheet(null)}
      />
      <MultiChoiceSheet
        visible={sheet === 'months'} title="Select Month" columns={4}
        options={MONTH_OPTIONS} selected={monthsSel}
        onConfirm={setMonthsSel} onClose={() => setSheet(null)}
      />

      <CustomIntervalModal visible={sheet === 'custom'} initial={customInterval}
        onConfirm={(ci) => { setCustomInterval(ci); setRepeatCycle('custom'); }}
        onClose={close} />

      <ConfirmDialog
        visible={confirm === 'pause'}
        title="Confirmation"
        message={`Are you sure you want to ${isPaused ? 'resume' : 'pause'} "${displayName}"?`}
        confirmLabel={isPaused ? 'Resume habit' : 'Pause habit'}
        onCancel={() => setConfirm(null)} onConfirm={doPauseToggle} destructive
      />
      <ConfirmDialog
        visible={confirm === 'delete'}
        title="Confirmation"
        message={`Are you sure you want to delete "${displayName}"?`}
        confirmLabel="Delete habit"
        onCancel={() => setConfirm(null)} onConfirm={doDelete} destructive
      />
    </SafeAreaView>
  );
}

// ── Small layout helpers ──
/** One pill in the Repeat Cycle second row. */
function SubChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.subChip, active && s.subChipOn]} onPress={onPress} activeOpacity={0.85}>
      <AppText variant="bodySmall" color={active ? Colors.white : Colors.textSecondary}
        numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
function Row({ children }: { children: React.ReactNode }) {
  return <View style={s.rowBetween}>{children}</View>;
}

const s = StyleSheet.create({
  // Repeat Cycle second row — wraps, since Month offers three chips plus a
  // label and they won't fit one line on a narrow phone.
  subRow: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    gap: 6, marginTop: 10,
  },
  subLabel: { marginRight: 2 },
  subChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1.4, borderColor: 'rgba(153,153,153,0.60)',
    maxWidth: 180,
  },
  subChipOn: { backgroundColor: Colors.black, borderColor: Colors.black },
  safe: { flex: 1, backgroundColor: Colors.bgSplash },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  headerBtn: { minWidth: 48, paddingVertical: 6 },
  scroll: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 48 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 8 },
  colorDot: { width: 44, height: 44, borderRadius: 22 },
  nameInput: { flex: 1, fontFamily: 'DMSans-Bold', fontSize: 22, color: Colors.textPrimary } as any,
  // Same weight and size as the name, in muted grey so the typed part still
  // reads as the thing being edited.
  nameSuffix: {
    fontFamily: 'DMSans-Bold', fontSize: 22, color: Colors.textMuted,
    marginLeft: 6, flexShrink: 1,
  },
  // Laid out but painted nowhere: absolute keeps it out of the row's flow,
  // opacity 0 hides it, and it can't intercept touches.
  nameMirror: { position: 'absolute', opacity: 0, left: 0, top: 0 },

  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base,
    ...Shadows.sm,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.md },

  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12 },
  // Single-line variant: no wrapping, tighter gap so five chips fit a 375pt
  // screen without the labels shrinking.
  // Wraps now rather than forcing five equal slots onto one line: chips are
  // content-sized, so "Every Month" is a wider chip instead of smaller text.
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 12 },
  chipEqual: { flex: 1, minWidth: 0, paddingHorizontal: 4, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  /** One size for every repeat chip, selected or not. */
  chipTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, lineHeight: 18 },
  /** Square-ish pencil button — it's an action, not one of the cycle choices. */
  pencilChip: {
    width: 38, height: 38, borderRadius: Radius.full,
    backgroundColor: 'rgba(153,153,153,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  stepper: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: 6,
  },
  stepBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  timeWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12 },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.bgInput, borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: 12,
  },
  timeX: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  addTime: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingVertical: 8, paddingHorizontal: 14, borderStyle: 'dashed',
  },

  periodRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  datePill: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center',
  },

  lifecycleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  saveBtn: {
    backgroundColor: Colors.black, borderRadius: Radius.full,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.sm,
  },
});
