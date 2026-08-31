/**
 * BMILogScreen — enter date/time/height/weight, tap Calculate BMI to run the
 * result animation, then Save Measurement to write it to records.
 *
 * The result panel is always on screen. Tapping Calculate sweeps the marker
 * across the scale a few times and counts the figures up, so the result reads
 * as something that was just worked out rather than a number that silently
 * changed. Editing an input resets it — otherwise Save could store a
 * measurement that doesn't match the BMI on screen.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet,
  Animated, Easing, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { RootState } from '../../../../store';
import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { DatePickerSheet, AddTimeSheet } from '../../components/HabitOverlays';
import { useBMITracker, computeBMI, idealWeightRangeFor } from '../../hooks/useTrackers';
import { cmToFtIn, ftInToCm, kgToLbs, lbsToKg } from '../../utils/bodyComposition';
import { BMI_CATEGORY_META, bmiStatusMessage } from './bmiMeta';
import { BMICategory, BODY_COMP_BOUNDS, BodyCompField } from '../../types';

type Props = NativeStackScreenProps<any, 'BMILog'>;

const todayISO = () => new Date().toISOString().split('T')[0];
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const fmtDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const fmtTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

/** Equal-width bands, matching the labels beneath the track. */
const BANDS: { key: BMICategory; range: string; name: string; color: string }[] = [
  { key: 'underweight',    range: '< 18.5',      name: 'Underweight',    color: '#3B82F6' },
  { key: 'normal',         range: '18.5 – 24.9', name: 'Normal',         color: '#22C55E' },
  { key: 'overweight',     range: '25 – 29.9',   name: 'Overweight',     color: '#EAB308' },
  { key: 'obese',          range: '30 – 34.9',   name: 'Obese',          color: '#F97316' },
  { key: 'severely_obese', range: '35+',         name: 'Severely Obese', color: '#EF4444' },
];

/**
 * Position along the track as a 0–1 fraction, mapped band-by-band rather than
 * linearly across a BMI range. The bands are drawn equal width, so a linear
 * 10→40 mapping would park the marker over the wrong colour.
 */
function markerFraction(bmi: number): number {
  const seg = 1 / BANDS.length;
  const within = (v: number, lo: number, hi: number) =>
    Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  if (bmi < 18.5) return within(bmi, 13, 18.5) * seg;
  if (bmi < 25)   return seg + within(bmi, 18.5, 25) * seg;
  if (bmi < 30)   return seg * 2 + within(bmi, 25, 30) * seg;
  if (bmi < 35)   return seg * 3 + within(bmi, 30, 35) * seg;
  return seg * 4 + within(bmi, 35, 45) * seg;
}

/**
 * A single 0→1 eased ramp that every counted figure is scaled by.
 *
 * One ramp rather than one per number: independent counters drift apart, so
 * the ideal-weight range would briefly render as nonsense like "31.2 - 37.1 kg"
 * on its way up. Sharing the progress keeps every figure proportional and lands
 * them all on their exact targets on the same frame.
 */
function useCountProgress(run: boolean, duration = 800): number {
  const [p, setP] = useState(0);

  useEffect(() => {
    if (!run) { setP(0); return; }

    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setP(t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, duration]);

  return p;
}

const CalendarGlyph = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Rect x={2.25} y={3.75} width={13.5} height={12} rx={2} stroke="#9CA3AF" strokeWidth={1.5} />
    <Path d="M2.25 7.5h13.5M6 2.25v3M12 2.25v3" stroke="#9CA3AF" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);
const ClockGlyph = ({ color = '#9CA3AF' }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Circle cx={9} cy={9} r={7.5} stroke={color} strokeWidth={1.5} />
    <Path d="M9 5.25V9.4l2.6 1.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

interface CalcResult {
  bmi: number;
  category: BMICategory;
  heightCm: number;
  weightKg: number;
  ideal: { min: number; max: number } | null;
}

type Phase = 'idle' | 'calculating' | 'done';

export function BMILogScreen({ navigation, route }: Props) {
  const editingId: string | undefined = route.params?.id;
  const existing = useSelector((st: RootState) => st.trackers.bmiEntries.find(e => e.id === editingId));
  const { logBMI, editBMI } = useBMITracker();

  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [time, setTime] = useState(existing?.time ?? nowHHMM());
  const [height, setHeight] = useState(existing ? String(existing.heightCm) : '');
  const [weight, setWeight] = useState(existing ? String(existing.weightKg) : '');

  // Units are display-only: values are always stored in cm/kg.
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ftin'>('cm');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [heightIn, setHeightIn] = useState('');

  const [dateSheet, setDateSheet] = useState(false);
  const [timeSheet, setTimeSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [result, setResult] = useState<CalcResult | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  /**
   * Optional body-composition readings (§3).
   *
   * Held as strings so a half-typed "1" isn't coerced to a number, and folded
   * away by default: none of it feeds the BMI calculation, so it must never
   * look like something standing between the user and their result.
   */
  const [bodyOpen, setBodyOpen] = useState(
    !!(existing?.bodyFatPct || existing?.muscleMassKg || existing?.visceralFat
      || existing?.bodyWaterPct || existing?.boneMassKg),
  );
  const [body, setBody] = useState<Record<BodyCompField, string>>({
    bodyFatPct:   existing?.bodyFatPct   != null ? String(existing.bodyFatPct)   : '',
    muscleMassKg: existing?.muscleMassKg != null ? String(existing.muscleMassKg) : '',
    visceralFat:  existing?.visceralFat  != null ? String(existing.visceralFat)  : '',
    bodyWaterPct: existing?.bodyWaterPct != null ? String(existing.bodyWaterPct) : '',
    boneMassKg:   existing?.boneMassKg   != null ? String(existing.boneMassKg)   : '',
  });

  const setBodyField = (key: BodyCompField, v: string) =>
    // One decimal point, digits only — these are all small positive measures.
    setBody(cur => ({ ...cur, [key]: v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') }));

  /** Parsed values for the fields the user actually filled in. */
  const bodyValues = (): Partial<Record<BodyCompField, number>> => {
    const out: Partial<Record<BodyCompField, number>> = {};
    (Object.keys(BODY_COMP_BOUNDS) as BodyCompField[]).forEach(k => {
      const raw = body[k].trim();
      if (!raw) return;
      const n = Number(raw);
      if (Number.isFinite(n)) out[k] = Math.round(n * 10) / 10;
    });
    return out;
  };

  /** Range-check only what was entered; blanks are always fine. */
  const validateBody = (): string | null => {
    const vals = bodyValues();
    for (const k of Object.keys(BODY_COMP_BOUNDS) as BodyCompField[]) {
      if (body[k].trim() && vals[k] == null) {
        return `${BODY_COMP_BOUNDS[k].label} isn't a number — fix it or clear it.`;
      }
      const v = vals[k];
      const b = BODY_COMP_BOUNDS[k];
      if (v != null && (v < b.min || v > b.max)) {
        return `${b.label} should be between ${b.min} and ${b.max}${b.unit}.`;
      }
    }
    return null;
  };

  const sweep = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  // Normalise whatever was typed back to cm/kg for calculation and storage.
  const h = heightUnit === 'cm' ? Number(height) : ftInToCm(Number(height) || 0, Number(heightIn) || 0);
  const w = weightUnit === 'kg' ? Number(weight) : lbsToKg(Number(weight) || 0);

  // Any edit invalidates the shown result.
  useEffect(() => {
    anim.current?.stop();
    setResult(null);
    setPhase('idle');
    sweep.setValue(0);
  }, [height, weight, heightIn, heightUnit, weightUnit]);

  // Don't leave an animation running after the screen goes away.
  useEffect(() => () => anim.current?.stop(), []);

  const switchHeightUnit = (next: 'cm' | 'ftin') => {
    if (next === heightUnit) return;
    if (next === 'ftin') {
      const cm = Number(height);
      if (cm > 0) { const { ft, inch } = cmToFtIn(cm); setHeight(String(ft)); setHeightIn(String(inch)); }
    } else {
      const cm = ftInToCm(Number(height) || 0, Number(heightIn) || 0);
      if (cm > 0) setHeight(String(Math.round(cm)));
      setHeightIn('');
    }
    setHeightUnit(next);
  };
  const switchWeightUnit = (next: 'kg' | 'lbs') => {
    if (next === weightUnit) return;
    const cur = Number(weight);
    if (cur > 0) {
      setWeight(next === 'lbs'
        ? String(Math.round(kgToLbs(cur) * 10) / 10)
        : String(Math.round(lbsToKg(cur) * 10) / 10));
    }
    setWeightUnit(next);
  };

  /** Shared guard: the same checks gate Calculate and Save. */
  const validate = (): string | null => {
    if (!(h > 0)) return 'Enter a valid height.';
    if (!(w > 0)) return 'Enter a valid weight.';
    if (h < 80 || h > 250) return 'Height looks off — enter it between 80 and 250 cm.';
    if (w < 20 || w > 400) return 'Weight looks off — check the value and unit.';
    if (date > todayISO()) return "You can't log a measurement for a future date.";
    return null;
  };

  const onCalculate = () => {
    // The result renders below the fold — leaving the keyboard up hides it.
    Keyboard.dismiss();

    const problem = validate();
    if (problem) { setErr(problem); setResult(null); setPhase('idle'); return; }

    setErr(null);
    const r = computeBMI(h, w);
    const ideal = idealWeightRangeFor(h);
    const next: CalcResult = {
      bmi: r.bmi, category: r.category,
      heightCm: Math.round(h * 10) / 10,
      weightKg: Math.round(w * 10) / 10,
      ideal: ideal ? { min: ideal.min, max: ideal.max } : null,
    };

    setResult(next);
    setPhase('calculating');

    // Three passes across the scale, then ease onto the real position.
    const pass = (to: number, duration: number) =>
      Animated.timing(sweep, {
        toValue: to, duration,
        easing: Easing.inOut(Easing.quad),
        // Percentage `left` is a layout prop — the native driver can't animate it.
        useNativeDriver: false,
      });

    anim.current?.stop();
    sweep.setValue(0);
    anim.current = Animated.sequence([
      pass(1, 340), pass(0, 340),
      pass(1, 300), pass(0, 300),
      pass(1, 260),
      Animated.timing(sweep, {
        toValue: markerFraction(next.bmi),
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);
    anim.current.start(({ finished }) => { if (finished) setPhase('done'); });
  };

  const onSave = async () => {
    const problem = validate();
    if (problem) { setErr(problem); return; }
    if (!result) { setErr('Tap Calculate BMI first, then save.'); return; }
    // Only checked at save, and only for fields that were filled in — a typo
    // in an optional box shouldn't have blocked the calculation.
    const bodyProblem = validateBody();
    if (bodyProblem) { setErr(bodyProblem); setBodyOpen(true); return; }
    if (saving) return;

    setErr(null);
    setSaving(true);
    try {
      const data = {
        date, time,
        heightCm: result.heightCm,
        weightKg: result.weightKg,
        ...bodyValues(),
      };
      if (editingId) await editBMI(editingId, data); else await logBMI(data);
      Alert.alert(
        editingId ? 'Measurement updated' : 'Measurement saved',
        'It now appears in your BMI records, and your dashboard, insights and goal progress have been updated.',
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch {
      setErr('Could not save. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  // ── Animated display values ──
  const settled = phase === 'done' && !!result;
  const meta = result ? BMI_CATEGORY_META[result.category] : null;

  const progress = useCountProgress(settled);

  const rawDiff = result?.ideal
    ? result.weightKg > result.ideal.max ? result.weightKg - result.ideal.max
      : result.weightKg < result.ideal.min ? result.ideal.min - result.weightKg
        : 0
    : 0;

  const bmiCount    = (result?.bmi ?? 0) * progress;
  const weightCount = (result?.weightKg ?? 0) * progress;
  const idealMin    = (result?.ideal?.min ?? 0) * progress;
  const idealMax    = (result?.ideal?.max ?? 0) * progress;
  const diffCount   = rawDiff * progress;

  const markerLeft = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const markerColor = settled && meta ? meta.color : '#9CA3AF';
  const one = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
  const whole = (n: number) => String(Math.round(n));

  const diffText = (() => {
    if (!settled || !result?.ideal) return '—';
    if (result.category === 'normal') return 'Perfect Range';
    return result.weightKg > result.ideal.max ? `-${one(diffCount)} kg` : `+${one(diffCount)} kg`;
  })();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>BMI log</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Your details ── */}
        <View style={s.detailsPanel}>
          <View style={s.detailsHead}>
            <AppText style={s.detailsAvatar}>🧍</AppText>
            <View>
              <AppText style={s.detailsTitle}>Your Details</AppText>
              <AppText style={s.detailsSub}>Enter your details to calculate BMI</AppText>
            </View>
          </View>

          <View style={s.twoCol}>
            <TouchableOpacity style={s.stampCard} activeOpacity={0.85} onPress={() => setDateSheet(true)}>
              <AppText style={s.stampLabel}>Date</AppText>
              <View style={s.rowBetween}>
                <AppText style={s.stampValue}>{fmtDate(date)}</AppText>
                <CalendarGlyph />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={s.stampCard} activeOpacity={0.85} onPress={() => setTimeSheet(true)}>
              <AppText style={s.stampLabel}>Time</AppText>
              <View style={s.rowBetween}>
                <AppText style={s.stampValue}>{fmtTime(time)}</AppText>
                <ClockGlyph />
              </View>
            </TouchableOpacity>
          </View>

          {/* Height — the unit chip doubles as the cm ⇄ ft/in switch. */}
          <View style={s.measureRow}>
            <AppText style={s.measureLabel}>Height</AppText>
            <View style={s.inputPill}>
              <TextInput
                style={s.pillInput as any}
                keyboardType="decimal-pad"
                placeholder={heightUnit === 'cm' ? '165' : '5'}
                placeholderTextColor="#C4C4C4"
                value={height}
                onChangeText={setHeight}
              />
              {heightUnit === 'ftin' ? (
                <TextInput
                  style={[s.pillInput as any, s.pillInputSmall]}
                  keyboardType="decimal-pad"
                  placeholder="in"
                  placeholderTextColor="#C4C4C4"
                  value={heightIn}
                  onChangeText={setHeightIn}
                />
              ) : null}
              <TouchableOpacity onPress={() => switchHeightUnit(heightUnit === 'cm' ? 'ftin' : 'cm')} hitSlop={10}>
                <AppText style={s.pillUnit}>{heightUnit === 'cm' ? 'CM' : 'FT/IN'}</AppText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.measureRow}>
            <AppText style={s.measureLabel}>Weight</AppText>
            <View style={s.inputPill}>
              <TextInput
                style={s.pillInput as any}
                keyboardType="decimal-pad"
                placeholder={weightUnit === 'kg' ? '56.8' : '125'}
                placeholderTextColor="#C4C4C4"
                value={weight}
                onChangeText={setWeight}
              />
              <TouchableOpacity onPress={() => switchWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')} hitSlop={10}>
                <AppText style={s.pillUnit}>{weightUnit.toUpperCase()}</AppText>
              </TouchableOpacity>
            </View>
          </View>

          {heightUnit === 'ftin' || weightUnit === 'lbs' ? (
            <AppText style={s.storedNote}>
              Stored as {h > 0 ? `${Math.round(h)} cm` : '— cm'}
              {w > 0 ? ` · ${Math.round(w * 10) / 10} kg` : ' · — kg'}
            </AppText>
          ) : null}
        </View>

        {/* ── Calculate ── */}
        <TouchableOpacity
          style={[s.calcBtn, phase === 'calculating' && s.calcBtnBusy]}
          activeOpacity={0.9}
          disabled={phase === 'calculating'}
          onPress={onCalculate}
        >
          <AppText style={s.calcText}>
            {phase === 'calculating' ? 'Calculating…' : 'Calculate BMI'}
          </AppText>
        </TouchableOpacity>

        {err ? (
          <View style={s.errBanner}>
            <AppText variant="caption" color={Colors.error}>{err}</AppText>
          </View>
        ) : null}

        {/* ── Result (always on screen) ── */}
        <View style={s.resultPanel}>
          <View style={s.rowBetween}>
            <AppText style={s.resultTitle}>Your BMI Result</AppText>
            <TouchableOpacity
              style={s.guideChip}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('BMIGuide')}
            >
              <ClockGlyph color="#7C5CFC" />
              <AppText style={s.guideText}>BMI Guide</AppText>
            </TouchableOpacity>
          </View>

          <View style={s.resultTop}>
            <View style={s.resultNumber}>
              <AppText style={s.bmiValue}>{settled ? one(bmiCount) : '—'}</AppText>
              <AppText style={s.bmiCaption}>Your BMI</AppText>
            </View>

            <View style={s.resultCopy}>
              {settled && meta ? (
                <>
                  <View style={[s.categoryPill, { backgroundColor: meta.color + '26' }]}>
                    <AppText style={[s.categoryPillText, { color: meta.color }]}>{meta.label}</AppText>
                  </View>
                  <AppText style={s.resultMessage}>{bmiStatusMessage(result!.category)}</AppText>
                </>
              ) : (
                <AppText style={s.resultPending}>
                  {phase === 'calculating'
                    ? 'Working it out…'
                    : 'Enter your height and weight, then tap Calculate BMI.'}
                </AppText>
              )}
              <AppText style={s.resultRange}>Healthy range: 18.5 – 24.9</AppText>
            </View>
          </View>

          {/* Scale */}
          <View style={s.scaleWrap}>
            <View style={s.scaleTrack}>
              {BANDS.map(b => (
                <View
                  key={b.key}
                  style={[
                    s.scaleSeg,
                    { backgroundColor: b.color },
                    // Bands stay muted until there's a result to point at.
                    phase !== 'done' && { opacity: 0.35 },
                  ]}
                />
              ))}
            </View>

            {phase !== 'idle' ? (
              <Animated.View style={[s.marker, { left: markerLeft }]} pointerEvents="none">
                <View style={[s.markerHead, { backgroundColor: markerColor }]} />
                <View style={[s.markerStem, { backgroundColor: markerColor }]} />
              </Animated.View>
            ) : null}

            <View style={s.scaleLabels}>
              {BANDS.map(b => {
                const on = settled && b.key === result?.category;
                return (
                  <View key={b.key} style={s.scaleLabelCol}>
                    <AppText style={[s.scaleRange, on && { color: b.color }]} numberOfLines={1}>
                      {b.range}
                    </AppText>
                    <AppText style={[s.scaleName, on && { color: b.color }]} numberOfLines={1}>
                      {b.name}
                    </AppText>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Mini stats — count up once the marker settles */}
        <View style={s.miniRow}>
          <MiniStat label="Current Weight" value={settled ? `${one(weightCount)} kg` : '—'} />
          <MiniStat
            label="Ideal Weight"
            value={settled && result?.ideal ? `${whole(idealMin)} - ${whole(idealMax)} kg` : '—'}
          />
          <MiniStat
            label="Weight Difference"
            value={diffText}
            color={settled ? (result?.category === 'normal' ? '#15803D' : '#B45309') : undefined}
          />
        </View>

        {/* Verdict banner, tinted to the category */}
        {settled && result ? (
          <View
            style={[
              s.verdict,
              result.category === 'normal'
                ? { backgroundColor: '#DCFFE7', borderColor: '#DCFCE7' }
                : { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' },
            ]}
          >
            <AppText style={[s.verdictTitle, result.category !== 'normal' && { color: '#9A3412' }]}>
              {result.category === 'normal'
                ? "You're maintaining a healthy BMI!"
                : 'Your BMI is outside the healthy range'}
            </AppText>
            <AppText style={[s.verdictSub, result.category !== 'normal' && { color: '#C2410C' }]}>
              {result.category === 'normal'
                ? 'Keep up the great work.'
                : 'Small, consistent changes make the difference.'}
            </AppText>
          </View>
        ) : null}

        {/* ── Optional body composition (§3) ──
            Below the result and collapsed by default. None of it affects the
            BMI, so it sits after the answer rather than in front of it — the
            core flow is height + weight → calculate → save, and that has to
            stay true with every one of these left blank. */}
        <View style={s.bodyCard}>
          <TouchableOpacity
            style={s.bodyHead}
            activeOpacity={0.8}
            onPress={() => setBodyOpen(o => !o)}
            accessibilityRole="button"
            accessibilityState={{ expanded: bodyOpen }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText style={s.bodyTitle}>
                Body composition <AppText style={s.bodyTitleMuted}>(Optional)</AppText>
              </AppText>
              <AppText style={s.bodyHint}>
                From a smart scale, if you have one. Not needed for your BMI.
              </AppText>
            </View>
            <AppText style={s.bodyChevron}>{bodyOpen ? '⌃' : '⌄'}</AppText>
          </TouchableOpacity>

          {bodyOpen ? (
            <View style={s.bodyFields}>
              {(Object.keys(BODY_COMP_BOUNDS) as BodyCompField[]).map(key => {
                const meta = BODY_COMP_BOUNDS[key];
                return (
                  <View key={key} style={s.bodyRow}>
                    <AppText style={s.bodyLabel}>{meta.label}</AppText>
                    <View style={s.bodyInputWrap}>
                      <TextInput
                        style={s.bodyInput as any}
                        keyboardType="decimal-pad"
                        placeholder="—"
                        placeholderTextColor="#C4C4C4"
                        value={body[key]}
                        onChangeText={v => setBodyField(key, v)}
                        accessibilityLabel={`${meta.label}${meta.unit ? ` in ${meta.unit}` : ''}, optional`}
                      />
                      {meta.unit ? <AppText style={s.bodyUnit}>{meta.unit}</AppText> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[s.saveBtn, !settled && s.saveBtnDisabled]}
          activeOpacity={0.9}
          disabled={saving || !settled}
          onPress={onSave}
        >
          <AppText style={s.saveText}>{saving ? 'Saving…' : 'Save Measurement'}</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.ghostBtn}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('BMIProgress')}
        >
          <AppText style={s.ghostText}>View Progress</AppText>
        </TouchableOpacity>
      </ScrollView>

      <DatePickerSheet visible={dateSheet} title="Date" value={date} onConfirm={setDate} onClose={() => setDateSheet(false)} />
      <AddTimeSheet visible={timeSheet} onAdd={setTime} onClose={() => setTimeSheet(false)} />
    </SafeAreaView>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.miniCard}>
      <AppText style={s.miniLabel} numberOfLines={2}>{label}</AppText>
      <AppText style={[s.miniValue, color ? { color } : null]} numberOfLines={1}>{value}</AppText>
    </View>
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
  safe: { flex: 1, backgroundColor: '#F1F1F1' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // ── Details ──
  detailsPanel: { paddingVertical: 20, gap: 16 },
  detailsHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailsAvatar: { fontSize: 32, lineHeight: 40, includeFontPadding: false },
  detailsTitle: { fontFamily: 'DMSans-Bold', fontSize: 18, lineHeight: 23, color: '#1A1C1E' },
  detailsSub: { fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 16, color: '#6B7280' },

  twoCol: { flexDirection: 'row', gap: 16 },
  stampCard: {
    flex: 1, minWidth: 0, padding: 16, gap: 12,
    backgroundColor: Colors.white, borderRadius: 30,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  stampLabel: { fontFamily: 'DMSans-Bold', fontSize: 20, lineHeight: 22, color: '#141414' },
  stampValue: { fontFamily: 'DMSans-Medium', fontSize: 14, lineHeight: 20, color: '#141414' },

  measureRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  measureLabel: { width: 58, fontFamily: 'DMSans-SemiBold', fontSize: 16, lineHeight: 20, color: '#141414' },
  inputPill: {
    flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: Colors.white, borderRadius: 30,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  pillInput: {
    flex: 1, minWidth: 0, padding: 0,
    fontFamily: 'DMSans-Medium', fontSize: 16, lineHeight: 24, color: '#141414',
  } as any,
  pillInputSmall: { flex: 0, width: 44 },
  pillUnit: { fontFamily: 'DMSans-SemiBold', fontSize: 16, lineHeight: 24, color: '#999999' },
  storedNote: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#9CA3AF' },

  // ── Calculate ──
  calcBtn: {
    paddingVertical: 16, borderRadius: 30, backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  calcBtnBusy: { opacity: 0.7 },
  calcText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 24, color: Colors.white },

  errBanner: { backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12, marginTop: 16 },

  // ── Result ──
  resultPanel: { paddingVertical: 24, gap: 24 },
  resultTitle: { fontFamily: 'DMSans-Bold', fontSize: 18, lineHeight: 28, color: '#1A1C1E' },
  guideChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: '#EDEBFF', borderRadius: 9999,
  },
  guideText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, lineHeight: 16, color: '#7C5CFC' },

  resultTop: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  resultNumber: {
    width: 100, alignItems: 'center', gap: 8,
    borderRightWidth: 1, borderRightColor: '#E5E7EB',
  },
  bmiValue: { fontFamily: 'DMSans-Bold', fontSize: 40, lineHeight: 44, color: '#1A1C1E' },
  bmiCaption: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 16, color: '#6B7280' },
  // Fixed height so the panel doesn't jump between the pending line and the
  // pill-plus-message it's replaced by.
  resultCopy: { flex: 1, minWidth: 0, gap: 6, minHeight: 74, justifyContent: 'center' },
  resultPending: { fontFamily: 'DMSans-Medium', fontSize: 13, lineHeight: 18, color: '#9CA3AF' },
  categoryPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 },
  categoryPillText: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 16 },
  resultMessage: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 20, color: '#1A1C1E' },
  resultRange: { fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 16, color: '#6B7280' },

  scaleWrap: { paddingTop: 22 },
  scaleTrack: { flexDirection: 'row', height: 8, borderRadius: 9999, overflow: 'hidden' },
  scaleSeg: { flex: 1 },
  // Centred on its own position so the head sits over the value, not beside it.
  marker: { position: 'absolute', top: 0, marginLeft: -10, alignItems: 'center' },
  markerHead: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.white },
  markerStem: { width: 2, height: 14 },
  scaleLabels: { flexDirection: 'row', marginTop: 12 },
  scaleLabelCol: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4 },
  scaleRange: { fontFamily: 'DMSans-Bold', fontSize: 12, lineHeight: 15, color: '#1A1C1E', textAlign: 'center' },
  scaleName: { fontFamily: 'DMSans-Medium', fontSize: 10, lineHeight: 12, color: '#6B7280', textAlign: 'center' },

  // ── Mini stats ──
  miniRow: { flexDirection: 'row', gap: 12 },
  miniCard: {
    flex: 1, minWidth: 0, minHeight: 90, padding: 14, gap: 8,
    backgroundColor: Colors.white, borderRadius: 16,
    alignItems: 'center', justifyContent: 'space-between',
  },
  miniLabel: {
    fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 16,
    color: '#999999', textAlign: 'center',
  },
  miniValue: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 18, color: '#141414', textAlign: 'center' },

  // ── Verdict ──
  verdict: { marginTop: 20, padding: 20, borderRadius: 30, borderWidth: 1, gap: 3 },
  verdictTitle: {
    fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 20,
    color: '#166534', textAlign: 'center',
  },
  verdictSub: {
    fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 20,
    color: '#16A34A', textAlign: 'center',
  },

  // ── Actions ──
  // ── Optional body composition (§3) ──
  bodyCard: {
    borderRadius: 20, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: HAIRLINE, overflow: 'hidden',
  },
  bodyHead: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  bodyTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: '#141414' },
  bodyTitleMuted: { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#9CA3AF' },
  bodyHint: {
    fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 17, color: '#9CA3AF', marginTop: 2,
  },
  bodyChevron: { fontFamily: 'DMSans-Bold', fontSize: 18, color: '#9CA3AF' },
  bodyFields: { paddingHorizontal: 16, paddingBottom: 14, gap: 2 },
  bodyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: HAIRLINE,
  },
  bodyLabel: { flex: 1, minWidth: 0, fontFamily: 'DMSans-Medium', fontSize: 14, color: '#141414' },
  bodyInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    minWidth: 104, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: HAIRLINE, backgroundColor: '#F9FAFB',
  },
  bodyInput: {
    flex: 1, padding: 0, textAlign: 'right',
    fontFamily: 'DMSans-SemiBold', fontSize: 15, color: '#141414',
  } as any,
  bodyUnit: { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#9CA3AF' },

  saveBtn: {
    marginTop: 24, paddingVertical: 16, borderRadius: 30,
    backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 24, color: Colors.white },
  ghostBtn: {
    marginTop: 12, paddingVertical: 16, borderRadius: 30,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  ghostText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 24, color: '#1E293B' },
});
