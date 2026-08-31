/**
 * EditCycleScreen — cycle length, period length, start/end dates, symptoms and
 * notes (§3.4), plus Reset and Delete.
 *
 * The start date and the two lengths anchor every prediction in the feature
 * (cycle day, phase, ovulation, fertile window, next period, insights), so
 * changing them here recalculates all of it at once — there's no second copy
 * of the data to keep in sync. Both destructive actions confirm first.
 */
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { DatePickerSheet, ConfirmDialog } from '../../components/HabitOverlays';
import { usePeriodTracker } from '../../hooks/useTrackers';
import { daysBetween, todayISO, validateCycleEdit } from '../../utils/periodAnalytics';

type Props = NativeStackScreenProps<any, 'EditCycle'>;

const NOTES_MAX = 500;

/** Same vocabulary as Log Today, so the two screens agree on symptom names. */
const SYMPTOMS = [
  'Cramps', 'Bloating', 'Headache', 'Back Pain', 'Fatigue',
  'Acne', 'Mood Swings', 'Cravings', 'Nausea',
];

const fmtLong = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

const CalendarGlyph = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={5} width={16} height={15} rx={3} stroke="#9CA3AF" strokeWidth={1.5} />
    <Path d="M4 10h16M8.5 3v4M15.5 3v4" stroke="#9CA3AF" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);
const InfoGlyph = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9.2} stroke="#9CA3AF" strokeWidth={1.6} />
    <Path d="M12 11v5.5" stroke="#9CA3AF" strokeWidth={1.8} strokeLinecap="round" />
    <Circle cx={12} cy={7.8} r={1.1} fill="#9CA3AF" />
  </Svg>
);

export function EditCycleScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const {
    entries, currentCycle, cycleConfig, updateCycle, removeCycle, resetCycle, setCycleStart,
  } = usePeriodTracker();

  const paramId: string | undefined = route.params?.id;
  const cycle = entries.find(e => e.id === paramId) ?? currentCycle ?? null;

  const [startDate, setStartDate] = useState(cycle?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState<string | null>(cycle?.endDate ?? null);
  // Seeded from the effective value, so the field shows what predictions are
  // actually using rather than an empty box the user has to guess at.
  const [cycleLength, setCycleLength] = useState(String(cycleConfig.cycle.length));
  const [periodLength, setPeriodLength] = useState(String(cycleConfig.period.length));
  const [symptoms, setSymptoms] = useState<string[]>(cycle?.symptoms ?? []);
  const [notes, setNotes] = useState(cycle?.notes ?? '');

  const [startSheet, setStartSheet] = useState(false);
  const [endSheet, setEndSheet] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const periodDays = endDate ? daysBetween(startDate, endDate) + 1 : null;

  const toggleSymptom = (sym: string) =>
    setSymptoms(cur => (cur.includes(sym) ? cur.filter(s => s !== sym) : [...cur, sym]));

  const step = (
    value: string, set: (v: string) => void, delta: number, min: number, max: number,
  ) => {
    const next = Math.max(min, Math.min(max, (Number(value) || min) + delta));
    set(String(next));
  };

  const onSave = async () => {
    const problem = validateCycleEdit(
      entries, cycle?.id ?? null, startDate, endDate,
      Number(cycleLength), Number(periodLength),
    );
    if (problem) { setErr(problem); return; }
    if (saving) return;                 // §11 — no double-write on a double tap

    setErr(null);
    setSaving(true);
    try {
      const patch = {
        startDate, endDate,
        cycleLength: Number(cycleLength),
        periodLength: Number(periodLength),
        symptoms,
        notes: notes.trim() || undefined,
      };
      if (cycle) await updateCycle(cycle.id, patch);
      else await setCycleStart(startDate);
      navigation.goBack();
    } catch {
      setErr('Could not save. Check your connection and try again.');
      setSaving(false);
    }
  };

  const onReset = async () => {
    if (!cycle) return;
    setResetting(false);
    setSaving(true);
    try {
      await resetCycle(cycle.id);
      navigation.goBack();
    } catch {
      setErr('Could not reset. Check your connection and try again.');
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!cycle) return;
    setConfirming(false);
    setSaving(true);
    try {
      await removeCycle(cycle.id);
      navigation.goBack();
    } catch {
      setErr('Could not delete. Check your connection and try again.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>Edit Cycle</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cycle length (§3.4) ── */}
        <View style={s.card}>
          <AppText style={s.cardTitle}>Cycle Length</AppText>
          <Stepper
            value={cycleLength}
            unit="days"
            onChange={setCycleLength}
            onStep={d => step(cycleLength, setCycleLength, d, 15, 60)}
          />
          <AppText style={s.fieldHint}>
            {cycleConfig.cycle.source === 'measured' && cycleLength === String(cycleConfig.cycle.length)
              ? `Averaged from your logged cycles. Changing this overrides it.`
              : 'Days from one period start to the next. Drives your next-period estimate.'}
          </AppText>
        </View>

        {/* ── Period length ── */}
        <View style={s.card}>
          <AppText style={s.cardTitle}>Period Length</AppText>
          <Stepper
            value={periodLength}
            unit="days"
            onChange={setPeriodLength}
            onStep={d => step(periodLength, setPeriodLength, d, 1, 15)}
          />
          <AppText style={s.fieldHint}>Days of bleeding. Sets how many days are shaded as predicted.</AppText>
        </View>

        <View style={s.card}>
          <AppText style={s.cardTitle}>Period start</AppText>
          <TouchableOpacity style={s.field} activeOpacity={0.85} onPress={() => setStartSheet(true)}>
            <AppText style={s.fieldValue}>{fmtLong(startDate)}</AppText>
            <CalendarGlyph />
          </TouchableOpacity>
          <AppText style={s.fieldHint}>Day 1 of this cycle.</AppText>
        </View>

        <View style={s.card}>
          <AppText style={s.cardTitle}>Period end</AppText>
          <TouchableOpacity style={s.field} activeOpacity={0.85} onPress={() => setEndSheet(true)}>
            <AppText style={[s.fieldValue, !endDate && s.fieldPlaceholder]}>
              {endDate ? fmtLong(endDate) : 'Still ongoing'}
            </AppText>
            <CalendarGlyph />
          </TouchableOpacity>
          <View style={s.endFooter}>
            <AppText style={s.fieldHint}>
              {periodDays != null ? `${periodDays} day${periodDays === 1 ? '' : 's'} of bleeding.` : 'Leave blank while your period is ongoing.'}
            </AppText>
            {endDate ? (
              <TouchableOpacity onPress={() => setEndDate(null)} hitSlop={8}>
                <AppText style={s.clearLink}>Clear</AppText>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ── Symptoms ── */}
        <View style={s.card}>
          <AppText style={s.cardTitle}>Symptoms</AppText>
          <View style={s.chipWrap}>
            {SYMPTOMS.map(sym => {
              const on = symptoms.includes(sym);
              return (
                <TouchableOpacity
                  key={sym}
                  style={[s.chip, on && s.chipOn]}
                  activeOpacity={0.85}
                  onPress={() => toggleSymptom(sym)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={sym}
                >
                  {/* A tick as well as the fill — §16 asks that colour never be
                      the only indicator of a selected state. */}
                  {on ? <AppText style={s.chipTick}>✓</AppText> : null}
                  <AppText style={[s.chipText, on && s.chipTextOn]}>{sym}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Notes ── */}
        <View style={s.card}>
          <AppText style={s.cardTitle}>
            Notes <AppText style={s.cardTitleMuted}>(Optional)</AppText>
          </AppText>
          <View style={s.notesBox}>
            <TextInput
              style={s.notesInput as any}
              placeholder="Anything worth remembering about this cycle…"
              placeholderTextColor="rgba(70,69,82,0.50)"
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={NOTES_MAX}
            />
          </View>
          <AppText style={s.notesCount}>{notes.length}/{NOTES_MAX}</AppText>
        </View>

        <View style={s.infoCard}>
          <InfoGlyph />
          <AppText style={s.infoText}>
            Changing these values recalculates your cycle day, phase, fertile window, ovulation
            and next-period estimate across every screen. Predictions are estimates from your
            logged history, not medical advice.
          </AppText>
        </View>

        {err ? (
          <View style={s.errBanner}><AppText variant="caption" color={Colors.error}>{err}</AppText></View>
        ) : null}

        <TouchableOpacity style={s.cta} activeOpacity={0.9} disabled={saving} onPress={onSave}>
          <AppText style={s.ctaText}>{saving ? 'Saving…' : 'Save Changes'}</AppText>
        </TouchableOpacity>

        {/* Reset clears the configuration; Delete removes the cycle itself.
            Kept as two buttons because they do very different amounts of
            damage, and "reset" is widely read as the milder of the two. */}
        {cycle ? (
          <>
            <TouchableOpacity
              style={s.resetBtn}
              activeOpacity={0.9}
              disabled={saving}
              onPress={() => setResetting(true)}
            >
              <AppText style={s.resetText}>Reset Cycle</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.deleteBtn}
              activeOpacity={0.9}
              disabled={saving}
              onPress={() => setConfirming(true)}
            >
              <AppText style={s.deleteText}>Delete Cycle</AppText>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>

      <DatePickerSheet
        visible={startSheet}
        title="Period start"
        value={startDate}
        onConfirm={setStartDate}
        onClose={() => setStartSheet(false)}
      />
      <DatePickerSheet
        visible={endSheet}
        title="Period end"
        value={endDate ?? startDate}
        min={startDate}
        onConfirm={setEndDate}
        onClose={() => setEndSheet(false)}
      />

      {/* §3.4 — the confirmation states plainly what survives, because
          "reset" gives no clue about whether months of logs are about to go. */}
      <ConfirmDialog
        visible={resetting}
        title="Reset this cycle?"
        message="Your cycle length and period length go back to being worked out from your logged history. The cycle itself and all of your daily logs are kept."
        confirmLabel="Reset Cycle"
        onCancel={() => setResetting(false)}
        onConfirm={onReset}
      />

      <ConfirmDialog
        visible={confirming}
        title="Delete this cycle?"
        message="This is a period start date, so deleting it will change your cycle day, phase and every prediction that depends on it. Your daily logs are kept."
        confirmLabel="Delete Cycle"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={onDelete}
      />
    </SafeAreaView>
  );
}

/** −/+ with a typable value between them, for the two length fields. */
function Stepper({
  value, unit, onChange, onStep,
}: {
  value: string; unit: string; onChange: (v: string) => void; onStep: (delta: number) => void;
}) {
  return (
    <View style={s.stepper}>
      <TouchableOpacity
        style={s.stepBtn}
        activeOpacity={0.7}
        onPress={() => onStep(-1)}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${unit}`}
      >
        <AppText style={s.stepSign}>−</AppText>
      </TouchableOpacity>

      <View style={s.stepValue}>
        <TextInput
          style={s.stepInput as any}
          keyboardType="number-pad"
          value={value}
          onChangeText={v => onChange(v.replace(/\D/g, ''))}
        />
        <AppText style={s.stepUnit}>{unit}</AppText>
      </View>

      <TouchableOpacity
        style={s.stepBtn}
        activeOpacity={0.7}
        onPress={() => onStep(1)}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${unit}`}
      >
        <AppText style={s.stepSign}>+</AppText>
      </TouchableOpacity>
    </View>
  );
}

const HAIRLINE = 'rgba(153,153,153,0.20)';
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.10,
  shadowRadius: 20,
  elevation: 5,
} as const;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  scroll: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },

  card: {
    padding: 18, borderRadius: 24, gap: 10, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  cardTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: '#141414' },
  cardTitleMuted: { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#9CA3AF' },

  // ── Length steppers ──
  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: HAIRLINE,
  },
  stepBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB',
  },
  stepSign: { fontFamily: 'DMSans-Bold', fontSize: 22, color: '#141414' },
  stepValue: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  stepInput: {
    padding: 0, minWidth: 52, textAlign: 'center',
    fontFamily: 'DMSans-Bold', fontSize: 30, color: '#141414',
  } as any,
  stepUnit: { fontFamily: 'DMSans-Medium', fontSize: 15, color: '#9CA3AF' },

  // ── Symptom chips ──
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9999,
    borderWidth: 1, borderColor: HAIRLINE, backgroundColor: Colors.white,
  },
  chipOn: { backgroundColor: '#FEF2F2', borderColor: '#FE5151' },
  chipTick: { fontFamily: 'DMSans-Bold', fontSize: 12, color: '#FE5151' },
  chipText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#6B7280' },
  chipTextOn: { fontFamily: 'DMSans-SemiBold', color: '#141414' },

  // ── Notes ──
  notesBox: {
    height: 110, padding: 14, borderRadius: 16,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: HAIRLINE,
  },
  notesInput: {
    flex: 1, textAlignVertical: 'top', padding: 0,
    fontFamily: 'DMSans-Regular', fontSize: 15, lineHeight: 22, color: '#141414',
  } as any,
  notesCount: {
    alignSelf: 'flex-end', fontFamily: 'DMSans-Regular', fontSize: 11, color: '#9CA3AF',
  },
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE,
  },
  fieldValue: { flex: 1, minWidth: 0, fontFamily: 'DMSans-SemiBold', fontSize: 15, color: '#141414' },
  fieldPlaceholder: { color: '#9CA3AF' },
  fieldHint: { flex: 1, minWidth: 0, fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 18, color: '#9CA3AF' },
  endFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  clearLink: { fontFamily: 'DMSans-SemiBold', fontSize: 12, color: '#FE5151' },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 14, borderRadius: 16, backgroundColor: '#F9FAFB',
  },
  infoText: { flex: 1, minWidth: 0, fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 18, color: '#6B7280' },

  errBanner: { backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12 },

  cta: {
    height: 60, borderRadius: 9999, backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { fontFamily: 'DMSans-Bold', fontSize: 16, color: Colors.white },
  resetBtn: {
    height: 56, borderRadius: 9999, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: HAIRLINE,
  },
  resetText: { fontFamily: 'DMSans-Bold', fontSize: 15, color: '#141414' },
  deleteBtn: {
    height: 56, borderRadius: 9999, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteText: { fontFamily: 'DMSans-Bold', fontSize: 15, color: '#EF4444' },
});
