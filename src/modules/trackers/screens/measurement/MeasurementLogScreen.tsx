/**
 * MeasurementLogScreen — date + all body-measurement fields + optional
 * notes. Supports create and edit (route.params.id).
 *
 * Every field is optional; only one measurement is needed to save (§32). A
 * date that already has a record offers to update it rather than silently
 * duplicating the day (§8).
 */
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { RootState } from '../../../../store';
import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { DatePickerSheet } from '../../components/HabitOverlays';
import { useMeasurementTracker } from '../../hooks/useTrackers';
import { kgToLbs, lbsToKg, CM_PER_IN } from '../../utils/bodyComposition';
import { MEASUREMENT_FIELDS, MeasurementField } from '../../types';

type Props = NativeStackScreenProps<any, 'MeasurementLog'>;

const todayISO = () => new Date().toISOString().split('T')[0];
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const fmtDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const NOTES_MAX = 1000;

// Plausible ranges in canonical units (kg / cm) — catches unit mix-ups.
const RANGES: Record<MeasurementField, [number, number]> = {
  weightKg:     [20, 400],
  heightCm:     [80, 250],
  bustCm:       [40, 200],
  chestCm:      [40, 200],
  waistCm:      [30, 200],
  hipCm:        [40, 220],
  thighLeftCm:  [20, 120],
  thighRightCm: [20, 120],
  armLeftCm:    [10, 80],
  armRightCm:   [10, 80],
};

const CalendarGlyph = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={5} width={16} height={15} rx={3} stroke="#9CA3AF" strokeWidth={1.5} />
    <Path d="M4 10h16M8.5 3v4M15.5 3v4" stroke="#9CA3AF" strokeWidth={1.5} strokeLinecap="round" />
    {[8, 12, 16].map(cx => (
      <React.Fragment key={cx}>
        <Circle cx={cx} cy={13.5} r={0.8} fill="#9CA3AF" />
        <Circle cx={cx} cy={16.5} r={0.8} fill="#9CA3AF" />
      </React.Fragment>
    ))}
  </Svg>
);

export function MeasurementLogScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const editingId: string | undefined = route.params?.id;
  const existing = useSelector((st: RootState) => st.trackers.measurements.find(e => e.id === editingId));
  const { entries, logMeasurement, editMeasurement } = useMeasurementTracker();

  /** A record already on a date — drives the §8 update-or-duplicate prompt. */
  const entryOn = (d: string) => entries.find(e => e.date === d && e.id !== editingId) ?? null;

  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [values, setValues] = useState<Record<MeasurementField, string>>(() => {
    const init: any = {};
    MEASUREMENT_FIELDS.forEach(f => { init[f.key] = existing?.[f.key] != null ? String(existing[f.key]) : ''; });
    return init;
  });
  const [notes, setNotes] = useState(existing?.notes ?? '');

  // Not on this screen; kept so editing never blanks the recorded time.
  const [time] = useState(existing?.time ?? nowHHMM());

  // Units are display-only: values are always stored in kg / cm. Tapping the
  // unit inside an input flips it — the design has no unit toggle, but dropping
  // it entirely would lock out anyone working in lbs or inches.
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [lengthUnit, setLengthUnit] = useState<'cm' | 'in'>('cm');

  const [dateSheet, setDateSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const setField = (key: MeasurementField, v: string) => setValues(cur => ({ ...cur, [key]: v }));
  const unitFor = (key: MeasurementField) => (key === 'weightKg' ? weightUnit : lengthUnit);

  /** Convert a displayed value into the canonical kg/cm we store. */
  const toCanonical = (key: MeasurementField, n: number) =>
    key === 'weightKg'
      ? (weightUnit === 'kg' ? n : lbsToKg(n))
      : (lengthUnit === 'cm' ? n : n * CM_PER_IN);

  /** Rewrite every entered value when a unit flips, so nothing is lost. */
  const toggleWeightUnit = () => {
    const next = weightUnit === 'kg' ? 'lbs' : 'kg';
    setValues(cur => {
      const raw = Number(cur.weightKg);
      if (!raw) return cur;
      const conv = next === 'lbs' ? kgToLbs(raw) : lbsToKg(raw);
      return { ...cur, weightKg: String(Math.round(conv * 10) / 10) };
    });
    setWeightUnit(next);
  };
  const toggleLengthUnit = () => {
    const next = lengthUnit === 'cm' ? 'in' : 'cm';
    setValues(cur => {
      const out = { ...cur };
      MEASUREMENT_FIELDS.filter(f => f.key !== 'weightKg').forEach(f => {
        const raw = Number(cur[f.key]);
        if (!raw) return;
        out[f.key] = String(Math.round((next === 'in' ? raw / CM_PER_IN : raw * CM_PER_IN) * 10) / 10);
      });
      return out;
    });
    setLengthUnit(next);
  };

  const onSave = async () => {
    const numeric: Record<string, number> = {};

    /**
     * At least one measurement — not weight specifically.
     *
     * §32 says not to force every measurement on every log, and someone
     * tracking only their waist, or deliberately staying off the scale,
     * shouldn't be locked out of their own tracker by a required weight field.
     */
    const anyValue = MEASUREMENT_FIELDS.some(f => values[f.key].trim());
    if (!anyValue) { setErr('Enter at least one measurement.'); return; }

    for (const f of MEASUREMENT_FIELDS) {
      const raw = values[f.key].trim();
      if (!raw) continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) { setErr(`Enter a valid ${f.label.toLowerCase()}`); return; }
      const canonical = Math.round(toCanonical(f.key, n) * 10) / 10;
      const [lo, hi] = RANGES[f.key];
      if (canonical < lo || canonical > hi) {
        setErr(`${f.label} looks off — check the value and unit.`);
        return;
      }
      numeric[f.key] = canonical;
    }

    if (date > todayISO()) { setErr("You can't log a measurement for a future date."); return; }
    if (saving) return;

    const data = { date, time, ...numeric, notes: notes.trim() || undefined } as any;

    const persist = async (targetId?: string) => {
      setErr(null); setSaving(true);
      try {
        if (targetId) await editMeasurement(targetId, data);
        else await logMeasurement(data);
        navigation.goBack();
      } catch {
        setErr('Could not save. Check your connection.');
        setSaving(false);
      }
    };

    /**
     * §8/§24 — a date that already holds a record offers to update it.
     *
     * Two records on one date would silently double that day in history and
     * skew every trend and extreme built from it, so this asks rather than
     * quietly creating a duplicate.
     */
    const clash = !editingId ? entryOn(date) : null;
    if (clash) {
      Alert.alert(
        'Measurements already logged for this date',
        `You recorded measurements on ${fmtDate(date)}. Update that record, or keep both?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Keep both', onPress: () => { void persist(); } },
          { text: 'Update existing', onPress: () => { void persist(clash.id); } },
        ],
      );
      return;
    }

    void persist(editingId);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>Measurement log</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Date ── */}
        <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => setDateSheet(true)}>
          <AppText style={s.cardTitle}>Date</AppText>
          <View style={s.dateRow}>
            <AppText style={s.dateValue}>{fmtDate(date)}</AppText>
            <CalendarGlyph />
          </View>
        </TouchableOpacity>

        <AppText style={s.sectionTitle}>Enter measurement</AppText>

        {/* ── Fields ── */}
        <View style={s.fieldsCard}>
          {MEASUREMENT_FIELDS.map(f => (
            <View key={f.key} style={s.fieldRow}>
              <AppText style={s.fieldLabel} numberOfLines={1}>{f.label}</AppText>
              <View style={s.inputPill}>
                <TextInput
                  style={s.input as any}
                  placeholder="0"
                  placeholderTextColor="rgba(20,20,20,0.30)"
                  keyboardType="decimal-pad"
                  value={values[f.key]}
                  onChangeText={v => setField(f.key, v)}
                />
                <TouchableOpacity
                  onPress={f.key === 'weightKg' ? toggleWeightUnit : toggleLengthUnit}
                  hitSlop={10}
                >
                  <AppText style={s.unit}>{unitFor(f.key).toUpperCase()}</AppText>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* ── Notes ── */}
        <View style={s.card}>
          <AppText style={s.cardTitle}>
            Notes <AppText style={s.cardTitleMuted}>(Optional)</AppText>
          </AppText>
          <View style={s.notesBox}>
            <TextInput
              style={s.notesInput as any}
              placeholder="Write about today's measurements…"
              placeholderTextColor="rgba(70,69,82,0.50)"
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={NOTES_MAX}
            />
          </View>
        </View>

        {err ? (
          <View style={s.errBanner}>
            <AppText variant="caption" color={Colors.error}>{err}</AppText>
          </View>
        ) : null}

        <TouchableOpacity style={s.saveBtn} onPress={onSave} disabled={saving} activeOpacity={0.9}>
          <AppText style={s.saveText}>{saving ? 'Saving…' : 'Save'}</AppText>
        </TouchableOpacity>
      </ScrollView>

      <DatePickerSheet visible={dateSheet} title="Date" value={date} onConfirm={setDate} onClose={() => setDateSheet(false)} />
    </SafeAreaView>
  );
}

const HAIRLINE = 'rgba(153,153,153,0.20)';
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.10,
  shadowRadius: 20,
  elevation: 4,
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

  scroll: { paddingHorizontal: 20, paddingTop: 12, gap: 20 },

  card: {
    padding: 16, borderRadius: 30, gap: 12, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  cardTitle: { fontFamily: 'DMSans-Bold', fontSize: 20, lineHeight: 24, color: '#141414' },
  cardTitleMuted: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#999999' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateValue: { fontFamily: 'DMSans-Medium', fontSize: 14, lineHeight: 20, color: '#141414' },

  sectionTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 24, color: '#141414' },

  // ── Measurement fields ──
  fieldsCard: {
    padding: 16, borderRadius: 30, gap: 14, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fieldLabel: { flex: 1, minWidth: 0, fontFamily: 'DMSans-SemiBold', fontSize: 15, lineHeight: 20, color: '#141414' },
  inputPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 30,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  input: {
    flex: 1, minWidth: 0, padding: 0,
    fontFamily: 'DMSans-Medium', fontSize: 16, lineHeight: 22, color: '#141414',
  } as any,
  unit: { fontFamily: 'DMSans-SemiBold', fontSize: 15, lineHeight: 22, color: '#999999' },

  // ── Notes ──
  notesBox: {
    height: 128, padding: 16, borderRadius: 20,
    backgroundColor: '#F6F7F8', borderWidth: 1, borderColor: '#C7C5D4',
  },
  notesInput: {
    flex: 1, textAlignVertical: 'top', padding: 0,
    fontFamily: 'DMSans-Regular', fontSize: 16, lineHeight: 24, color: '#141414',
  } as any,

  errBanner: { backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12 },

  saveBtn: {
    paddingVertical: 20, borderRadius: 999, backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center', ...CARD_SHADOW,
  },
  saveText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 24, color: Colors.white },
});
