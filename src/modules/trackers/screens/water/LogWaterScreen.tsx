/**
 * LogWaterScreen — log a drink: amount, time, date and optional notes (§6).
 *
 * Three ways in, all landing on the same form:
 *   • a quick-add tile, which arrives with `amount` pre-filled (§7)
 *   • "Set water intake", which starts blank (§8)
 *   • a history row, which arrives with `id` and edits in place (§13)
 *
 * The daily goal and the reminder live here too (§15, §26), but below the
 * intake fields — they're settings the user changes occasionally, not part of
 * logging a glass of water.
 */
import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { DatePickerSheet, AddTimeSheet } from '../../components/HabitOverlays';
import { PickerSheet } from '../../components/PickerSheet';
import { useWaterTracker } from '../../hooks/useTrackers';
import {
  fmtAmount, fmtClock, nowHHMM, todayISO, validateEntry, validateGoal,
} from '../../utils/waterAnalytics';
import { WATER_GOAL_PRESETS, WaterReminderFrequency } from '../../types';

type Props = NativeStackScreenProps<any, 'LogWater'>;

const fmtDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const NOTES_MAX = 500;
const AMOUNT_STEP = 50;
const DEFAULT_AMOUNT_ML = 300;

/** Intake presets offered by the Select Amount dropdown (§6.1). */
const AMOUNT_PRESETS = [100, 150, 200, 250, 300, 500, 750, 1000];
const CUSTOM_AMOUNT = 'Custom amount';
const AMOUNT_OPTIONS = [...AMOUNT_PRESETS.map(fmtAmount), CUSTOM_AMOUNT];

const mlToGoalLabel = (ml: number) => `${(ml / 1000).toString().replace(/\.0$/, '')} L per day`;
const GOAL_OPTIONS = [...WATER_GOAL_PRESETS.map(mlToGoalLabel), 'Custom goal'];
const goalToMl = (label: string) => Math.round(parseFloat(label) * 1000);

const REMINDER_FREQS: { key: WaterReminderFrequency; label: string }[] = [
  { key: 'none',     label: 'None' },
  { key: 'daily',    label: 'Daily' },
  { key: 'weekdays', label: 'Weekdays' },
  { key: 'weekends', label: 'Weekends' },
  { key: 'custom',   label: 'Custom' },
];
const freqLabel = (k: WaterReminderFrequency) =>
  REMINDER_FREQS.find(f => f.key === k)?.label ?? 'Daily';

// ── Glyphs ───────────────────────────────────────────────────────────────────

const TargetGlyph = () => (
  <Svg width={30} height={30} viewBox="0 0 32 32" fill="none">
    <Circle cx={16} cy={17.3} r={11} stroke="#141414" strokeWidth={2} />
    <Circle cx={16} cy={17.3} r={3.3} stroke="#141414" strokeWidth={2} />
    <Path
      d="M26 26.7v2.6M6 26.7v2.6M4.7 4.7l2.6 2.6M27.3 4.7l-2.6 2.6"
      stroke="#141414" strokeWidth={2} strokeLinecap="round"
    />
  </Svg>
);
const ClockGlyph = () => (
  <Svg width={30} height={30} viewBox="0 0 32 32" fill="none">
    <Circle cx={16} cy={17.3} r={11} stroke="#141414" strokeWidth={2} />
    <Path d="M16 11.5v6.3l3.6 2.1" stroke="#141414" strokeWidth={2} strokeLinecap="round" />
    <Path d="M4.7 4.7l2.6 2.6M27.3 4.7l-2.6 2.6" stroke="#141414" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const DropGlyph = () => (
  <Svg width={30} height={30} viewBox="0 0 32 32" fill="none">
    <Path
      d="M16 3.5c3.5 2.7 9.3 7.9 9.3 13.5a9.3 9.3 0 1 1-18.6 0C6.7 11.4 12.5 6.2 16 3.5Z"
      stroke="#141414" strokeWidth={2} strokeLinejoin="round"
    />
  </Svg>
);
const CaretGlyph = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M6 10l6 6 6-6" stroke="#141414" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const CalendarGlyph = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={5} width={16} height={15} rx={2.5} stroke="#141414" strokeWidth={1.5} />
    <Path d="M4 10h16M8.5 3v4M15.5 3v4" stroke="#141414" strokeWidth={1.5} strokeLinecap="round" />
    {[8.5, 12, 15.5].map(cx => [13.5, 16.5].map(cy => (
      <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={0.9} fill="#141414" />
    )))}
  </Svg>
);
const BellGlyph = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 4a6 6 0 0 0-6 6v3.2L4.6 16a.6.6 0 0 0 .5.9h13.8a.6.6 0 0 0 .5-.9L18 13.2V10a6 6 0 0 0-6-6Z"
      stroke="#141414" strokeWidth={1.5} strokeLinejoin="round"
    />
    <Path d="M10 19.5a2.2 2.2 0 0 0 4 0M11 3.2h2" stroke="#141414" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);
const MinusGlyph = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M6 12h12" stroke="#141414" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const PlusGlyph = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M6 12h12M12 6v12" stroke="#141414" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

/** Pill toggle drawn to the design rather than the platform Switch. */
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity
      style={[s.toggle, value && s.toggleOn]}
      activeOpacity={0.8}
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <View style={[s.toggleThumb, value && s.toggleThumbOn]} />
    </TouchableOpacity>
  );
}

function SectionCard({ title, children }: { title?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      {title ? <View style={s.cardHead}>{title}</View> : null}
      {children}
    </View>
  );
}

export function LogWaterScreen({ navigation, route }: Props) {
  const editingId: string | undefined = route.params?.id;
  const { goalMl, setGoal, logWater, editLog, removeLog, logById, settings } = useWaterTracker();
  const existing = editingId ? logById(editingId) : null;

  /** Quick-add hands the chosen preset through so it lands pre-filled (§7, §37). */
  const presetMl: number | undefined = route.params?.amount;

  const [goalLabel, setGoalLabel] = useState(
    GOAL_OPTIONS.includes(mlToGoalLabel(goalMl)) ? mlToGoalLabel(goalMl) : 'Custom goal',
  );
  const [customGoalMl, setCustomGoalMl] = useState(String(goalMl));
  const [amount, setAmount] = useState(existing?.amountMl ?? presetMl ?? DEFAULT_AMOUNT_ML);
  const [time, setTime] = useState(existing?.time ?? nowHHMM());
  const [date, setDate] = useState(existing?.date ?? route.params?.date ?? todayISO());
  const [reminderEnabled, setReminderEnabled] = useState(settings?.reminderEnabled ?? false);
  const [reminderTime, setReminderTime] = useState(settings?.reminderTime ?? '08:30');
  const [reminderFreq, setReminderFreq] = useState<WaterReminderFrequency>(settings?.reminderFrequency ?? 'daily');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const [amountSheet, setAmountSheet] = useState(false);
  const [goalSheet, setGoalSheet] = useState(false);
  const [freqSheet, setFreqSheet] = useState(false);
  const [timeSheet, setTimeSheet] = useState(false);
  const [reminderTimeSheet, setReminderTimeSheet] = useState(false);
  const [dateSheet, setDateSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const resolvedGoalMl = goalLabel === 'Custom goal' ? Number(customGoalMl) : goalToMl(goalLabel);
  /** A preset amount shows its label; anything else is a custom figure. */
  const amountLabel = AMOUNT_PRESETS.includes(amount) ? fmtAmount(amount) : CUSTOM_AMOUNT;

  const onSave = async () => {
    const amountErr = validateEntry(amount, date);
    if (amountErr) { setErr(amountErr); return; }
    const goalErr = validateGoal(resolvedGoalMl);
    if (goalErr) { setErr(goalErr); return; }

    // §28 — the guard against a double-tap writing two records.
    if (saving) return;

    setErr(null);
    setSaving(true);
    try {
      // Goal + reminder are shared settings; only write them when they changed,
      // so logging a glass doesn't rewrite the user's preferences every time.
      const settingsChanged =
        resolvedGoalMl !== goalMl
        || reminderEnabled !== (settings?.reminderEnabled ?? false)
        || (reminderEnabled && reminderTime !== settings?.reminderTime)
        || (reminderEnabled && reminderFreq !== settings?.reminderFrequency);

      if (settingsChanged) {
        await setGoal(
          resolvedGoalMl,
          reminderEnabled,
          reminderEnabled ? reminderTime : undefined,
          reminderEnabled ? reminderFreq : 'none',
        );
      }

      if (existing) {
        await editLog(existing.id, { amountMl: amount, date, time, notes: notes.trim() || undefined });
      } else {
        await logWater(amount, date, time, notes.trim() || undefined);
      }
      navigation.goBack();
    } catch {
      setErr('Could not save. Check your connection.');
      setSaving(false);
    }
  };

  /** §14 — deletion is destructive and dated, so it confirms first. */
  const onDelete = () => {
    if (!existing) return;
    Alert.alert(
      'Delete water entry?',
      'This water record will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeLog(existing.id);
              navigation.goBack();
            } catch {
              setErr('Could not delete. Check your connection.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>{existing ? 'Edit water entry' : 'Log water'}</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Select amount (§6.1) ── */}
        <SectionCard title={<AppText style={s.cardTitle}>Select Amount</AppText>}>
          <TouchableOpacity style={s.innerRow} activeOpacity={0.85} onPress={() => setAmountSheet(true)}>
            <View style={s.innerRowInner}>
              <View style={s.innerLeft}>
                <DropGlyph />
                <AppText style={s.innerValue} numberOfLines={1}>{amountLabel}</AppText>
              </View>
              <CaretGlyph />
            </View>
          </TouchableOpacity>
        </SectionCard>

        {/* ── Custom amount (§6.2) ──
            Always visible: it doubles as confirmation of what a preset resolved
            to, and it's the only way to nudge 250 up to 275. */}
        <SectionCard title={<AppText style={s.cardTitle}>Custom Amount</AppText>}>
          <View style={s.stepperRow}>
            <TouchableOpacity
              style={s.stepperBtn}
              activeOpacity={0.7}
              // Floors at one step rather than 0 — a zero-ml drink can't be saved.
              onPress={() => setAmount(a => Math.max(AMOUNT_STEP, a - AMOUNT_STEP))}
            >
              <MinusGlyph />
            </TouchableOpacity>

            <View style={s.amountGroup}>
              <TextInput
                style={s.amountInput as any}
                keyboardType="number-pad"
                value={String(amount)}
                onChangeText={v => setAmount(Math.max(0, Number(v.replace(/\D/g, '')) || 0))}
              />
              <AppText style={s.amountUnit}>ml</AppText>
            </View>

            <TouchableOpacity
              style={s.stepperBtn}
              activeOpacity={0.7}
              onPress={() => setAmount(a => a + AMOUNT_STEP)}
            >
              <PlusGlyph />
            </TouchableOpacity>
          </View>
        </SectionCard>

        {/* ── Time ── */}
        <SectionCard title={<AppText style={s.cardTitle}>Select Time</AppText>}>
          <TouchableOpacity style={s.innerRow} activeOpacity={0.85} onPress={() => setTimeSheet(true)}>
            <View style={s.innerRowInner}>
              <View style={s.innerLeft}>
                <ClockGlyph />
                <AppText style={s.innerValue}>{fmtClock(time)}</AppText>
              </View>
              <CaretGlyph />
            </View>
          </TouchableOpacity>
        </SectionCard>

        {/* ── Date ── */}
        <View style={s.card}>
          <TouchableOpacity style={s.inlineRow} activeOpacity={0.85} onPress={() => setDateSheet(true)}>
            <AppText style={s.cardTitle}>Date</AppText>
            <View style={s.inlineRight}>
              <AppText style={s.inlineValue}>{fmtDate(date)}</AppText>
              <CalendarGlyph />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Daily goal (§15) ──
            A setting rather than part of the log, so it sits below the intake
            fields instead of competing with "Select Amount" for attention. */}
        <SectionCard title={<AppText style={s.cardTitle}>Daily Goal</AppText>}>
          <TouchableOpacity style={s.innerRow} activeOpacity={0.85} onPress={() => setGoalSheet(true)}>
            <View style={s.innerRowInner}>
              <View style={s.innerLeft}>
                <TargetGlyph />
                <AppText style={s.innerValue} numberOfLines={1}>{goalLabel}</AppText>
              </View>
              <CaretGlyph />
            </View>
          </TouchableOpacity>

          {goalLabel === 'Custom goal' ? (
            <View style={s.customGoalRow}>
              <TextInput
                style={s.customGoalInput as any}
                keyboardType="number-pad"
                placeholder="e.g. 2200"
                placeholderTextColor="#C4C4C4"
                value={customGoalMl}
                onChangeText={v => setCustomGoalMl(v.replace(/\D/g, ''))}
              />
              <AppText style={s.customGoalUnit}>ml / day</AppText>
            </View>
          ) : null}
        </SectionCard>

        {/* ── Reminder ── */}
        <View style={s.card}>
          <TouchableOpacity style={s.inlineRowPadded} activeOpacity={0.85} onPress={() => setFreqSheet(true)}>
            <AppText style={s.cardTitle}>Reminder</AppText>
            <View style={s.inlineRight}>
              <AppText style={s.inlineValue}>
                {reminderEnabled ? freqLabel(reminderFreq) : 'Off'}
              </AppText>
              <CaretGlyph />
            </View>
          </TouchableOpacity>

          <View style={s.innerRow}>
            <View style={s.innerRowInner}>
              <View style={s.innerLeft}>
                <BellGlyph />
                <AppText style={s.reminderLabel} numberOfLines={1}>Remind me to drink water</AppText>
              </View>
              <Toggle value={reminderEnabled} onChange={setReminderEnabled} />
            </View>
          </View>

          {reminderEnabled ? (
            <>
              <TouchableOpacity
                style={s.innerRow}
                activeOpacity={0.85}
                onPress={() => setReminderTimeSheet(true)}
              >
                <View style={s.innerRowInner}>
                  <View style={s.innerLeft}>
                    <ClockGlyph />
                    <AppText style={s.innerValue}>Reminder at {fmtClock(reminderTime)}</AppText>
                  </View>
                  <CaretGlyph />
                </View>
              </TouchableOpacity>
              {/* Stated plainly — the preference persists, but nothing schedules
                  a notification yet, and a silent no-op would be worse. */}
              <AppText style={s.reminderNote}>
                Saved as a preference — notification delivery isn't wired up yet.
              </AppText>
            </>
          ) : null}
        </View>

        {/* ── Notes ── */}
        <SectionCard
          title={
            <AppText style={s.cardTitle}>
              Notes <AppText style={s.cardTitleMuted}>(Optional)</AppText>
            </AppText>
          }
        >
          <View style={s.notesBox}>
            <TextInput
              style={s.notesInput as any}
              placeholder="Add notes about your water intake…"
              placeholderTextColor="rgba(70,69,82,0.50)"
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={NOTES_MAX}
            />
            <AppText style={s.notesCount}>{notes.length}/{NOTES_MAX}</AppText>
          </View>
        </SectionCard>

        {err ? (
          <View style={s.errBanner}>
            <AppText variant="caption" color={Colors.error}>{err}</AppText>
          </View>
        ) : null}

        <TouchableOpacity style={s.saveBtn} activeOpacity={0.9} disabled={saving} onPress={onSave}>
          <AppText style={s.saveText}>{saving ? 'Saving…' : 'Save'}</AppText>
        </TouchableOpacity>

        {/* §14 — delete belongs with the entry it deletes, so it only exists
            in edit mode. */}
        {existing ? (
          <TouchableOpacity style={s.deleteBtn} activeOpacity={0.9} disabled={saving} onPress={onDelete}>
            <AppText style={s.deleteText}>Delete entry</AppText>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <PickerSheet
        visible={amountSheet} title="Amount" options={AMOUNT_OPTIONS}
        value={amountLabel}
        onSelect={label => {
          const i = AMOUNT_OPTIONS.indexOf(label);
          // "Custom amount" is the last option: it keeps whatever's in the
          // stepper rather than overwriting it with a preset.
          if (i >= 0 && i < AMOUNT_PRESETS.length) setAmount(AMOUNT_PRESETS[i]);
        }}
        onClose={() => setAmountSheet(false)}
      />
      <PickerSheet
        visible={goalSheet} title="Daily goal" options={GOAL_OPTIONS}
        value={goalLabel} onSelect={setGoalLabel} onClose={() => setGoalSheet(false)}
      />
      <PickerSheet
        visible={freqSheet} title="Reminder frequency"
        options={REMINDER_FREQS.map(f => f.label)}
        value={freqLabel(reminderFreq)}
        onSelect={label => {
          const hit = REMINDER_FREQS.find(f => f.label === label);
          if (!hit) return;
          setReminderFreq(hit.key);
          // Picking a real cadence implies wanting reminders on; "None" implies off.
          setReminderEnabled(hit.key !== 'none');
        }}
        onClose={() => setFreqSheet(false)}
      />
      <AddTimeSheet visible={timeSheet} onAdd={setTime} onClose={() => setTimeSheet(false)} />
      <AddTimeSheet visible={reminderTimeSheet} onAdd={setReminderTime} onClose={() => setReminderTimeSheet(false)} />
      <DatePickerSheet visible={dateSheet} title="Date" value={date} onConfirm={setDate} onClose={() => setDateSheet(false)} />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.10,
  shadowRadius: 20,
  elevation: 5,
} as const;
const HAIRLINE = 'rgba(153,153,153,0.20)';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },

  // ── Cards ──
  card: {
    backgroundColor: Colors.white, borderRadius: 30, padding: 10, gap: 10,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  cardHead: { paddingHorizontal: 10, paddingVertical: 5 },
  cardTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: '#141414' },
  cardTitleMuted: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#999999' },

  // Nested card, per the design's card-inside-a-card rows.
  innerRow: {
    backgroundColor: Colors.white, borderRadius: 30, padding: 10,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  innerRowInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: 10, paddingRight: 14, paddingVertical: 5, gap: 8,
  },
  innerLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  innerValue: { flexShrink: 1, fontFamily: 'DMSans-SemiBold', fontSize: 19, color: '#141414' },
  reminderLabel: { flexShrink: 1, fontFamily: 'DMSans-Medium', fontSize: 14, color: '#141414' },
  reminderNote: {
    paddingHorizontal: 10, fontFamily: 'DMSans-Regular', fontSize: 11, color: '#9CA3AF',
  },

  inlineRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: 10, paddingRight: 14, paddingVertical: 5,
  },
  inlineRowPadded: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 10,
  },
  inlineRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inlineValue: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: '#141414' },

  // ── Custom goal ──
  customGoalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 10, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 20, borderWidth: 1, borderColor: HAIRLINE,
  },
  customGoalInput: {
    flex: 1, padding: 0,
    fontFamily: 'DMSans-SemiBold', fontSize: 18, color: '#141414',
  } as any,
  customGoalUnit: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#999999' },

  // ── Stepper ──
  stepperRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: 10, paddingRight: 14, paddingVertical: 5, minHeight: 84,
  },
  stepperBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  amountGroup: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  amountInput: {
    padding: 0, minWidth: 90, textAlign: 'right',
    fontFamily: 'DMSans-SemiBold', fontSize: 46, color: '#141414',
  } as any,
  amountUnit: { fontFamily: 'DMSans-SemiBold', fontSize: 22, color: '#999999' },

  // ── Toggle ──
  toggle: {
    width: 50, height: 28, borderRadius: 26, padding: 3, justifyContent: 'center',
    backgroundColor: Colors.white, borderWidth: 1, borderColor: 'rgba(153,153,153,0.30)',
  },
  toggleOn: { backgroundColor: '#3A80FA', borderColor: '#3A80FA' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#999999' },
  toggleThumbOn: { alignSelf: 'flex-end', backgroundColor: Colors.white },

  // ── Notes ──
  notesBox: {
    marginHorizontal: 0, height: 128, padding: 16, borderRadius: 20,
    backgroundColor: '#F6F7F8', borderWidth: 1, borderColor: '#C7C5D4',
  },
  notesInput: {
    flex: 1, textAlignVertical: 'top', padding: 0,
    fontFamily: 'DMSans-Regular', fontSize: 16, lineHeight: 24, color: '#141414',
  } as any,
  notesCount: {
    alignSelf: 'flex-end', fontFamily: 'DMSans-Regular', fontSize: 11, color: '#9CA3AF',
  },

  errBanner: { backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12 },

  saveBtn: {
    paddingVertical: 20, paddingHorizontal: 30, borderRadius: 9999,
    backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', ...CARD_SHADOW,
  },
  saveText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 24, color: Colors.white },
  deleteBtn: {
    paddingVertical: 16, paddingHorizontal: 30, borderRadius: 9999,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(220,38,38,0.35)',
  },
  deleteText: { fontFamily: 'DMSans-SemiBold', fontSize: 17, color: '#DC2626' },
});
