/**
 * BMIHomeScreen — weight-goal progress ring, weight/height/BMI overview with
 * vs-last-week deltas, Body Insights (estimates from published formulas; rows
 * that need age/sex prompt for them, and rows that need bioimpedance hardware
 * say so rather than showing an invented number), recent records, and a Stay
 * Hydrated cross-link to Water.
 */
import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput, RefreshControl, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { Spacing, Radius } from '../../../../shared/theme/spacing';
import { BottomSheet } from '../../components/HabitOverlays';
import { useBMITracker } from '../../hooks/useTrackers';
import { buildBodyInsights, BodyMetric, ageFromDob } from '../../utils/bodyComposition';
import { BMI_CATEGORY_META } from './bmiMeta';
import { BMIEntry, WeightGoalType } from '../../types';

/** §4's three goal types. */
const GOAL_TYPES: { key: WeightGoalType; label: string }[] = [
  { key: 'lose', label: 'Lose weight' },
  { key: 'maintain', label: 'Maintain weight' },
  { key: 'gain', label: 'Gain weight' },
];
const GOAL_TYPE_LABEL: Record<WeightGoalType, string> = {
  lose: 'Lose', maintain: 'Maintain', gain: 'Gain',
};

type Props = NativeStackScreenProps<any, 'BMIHome'>;

/**
 * Sample figures shown before the first entry, so the cards read as populated
 * rather than as a wall of dashes.
 *
 * Internally consistent for a 165 cm / 58.6 kg body (BMI 21.5) — total body
 * water is ~52% of mass and muscle mass ~74%, which is where real values for
 * that build actually sit. Every sample is rendered muted and under a
 * Rendered muted so they read as placeholders rather than the user's own
 * measurements.
 */
const SAMPLE_OVERVIEW = { weightKg: '58.6', heightCm: '165', bmi: '21.5', label: 'Normal' };
const SAMPLE_INSIGHTS: { label: string; value: string }[] = [
  { label: 'BMI Status',           value: 'Normal' },
  { label: 'Ideal Weight Range',   value: '50 – 68 kg' },
  { label: 'Body Fat',             value: '26.4 %' },
  { label: 'Basal Metabolic Rate', value: '1364 kcal' },
  { label: 'Muscle Mass',          value: '43.1 kg' },
  { label: 'Visceral Fat Level',   value: '7' },
  { label: 'Total Body Water',     value: '30.2 L' },
  { label: 'Bone Mass',            value: '2.4 kg' },
];

const STATUS_COLOR: Record<BodyMetric['status'], string> = {
  low:    '#F59E0B',
  normal: '#16A34A',
  high:   '#DC2626',
  info:   '#1F2937',
};

/** Human-readable age of a record, for the chip beside the timestamp. */
function relativeDay(dateISO: string): string {
  const then = new Date(dateISO + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.round((now.getTime() - then.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'A week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return 'A month ago';
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)}y ago`;
}

const fmtStamp = (e: BMIEntry) => {
  const d = new Date(e.date + 'T00:00:00');
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (!e.time) return date;
  const [h, m] = e.time.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${date} • ${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

// ── Small vector glyphs (no icon components supplied for these) ──────────────
const ClockGlyph = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx={8} cy={8} r={6} stroke="#141414" strokeWidth={1.33} />
    <Path d="M8 5v3.2l2 1.2" stroke="#141414" strokeWidth={1.33} strokeLinecap="round" />
  </Svg>
);
const ScaleGlyph = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M2.7 4.7h10.6a1.3 1.3 0 0 1 1.3 1.5l-.8 6a1.3 1.3 0 0 1-1.3 1.1H3.5a1.3 1.3 0 0 1-1.3-1.1l-.8-6a1.3 1.3 0 0 1 1.3-1.5Z"
      stroke="#4F75FF" strokeWidth={1.33} strokeLinejoin="round" />
    <Path d="M8 7.3V9" stroke="#4F75FF" strokeWidth={1.33} strokeLinecap="round" />
  </Svg>
);
const RulerGlyph = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M11.3 1.6 14.4 4.7 4.7 14.4 1.6 11.3 11.3 1.6Z" stroke="#818CF8" strokeWidth={1.33} strokeLinejoin="round" />
    <Path d="M9.6 3.3 11 4.7M7.5 5.4 8.9 6.8M5.4 7.5l1.4 1.4M3.3 9.6l1.4 1.4" stroke="#818CF8" strokeWidth={1.1} strokeLinecap="round" />
  </Svg>
);
const HeartGlyph = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M8 13.6S2 10.2 2 6.4a3 3 0 0 1 5.3-1.9L8 5.3l.7-.8A3 3 0 0 1 14 6.4c0 3.8-6 7.2-6 7.2Z"
      stroke="#F87171" strokeWidth={1.33} strokeLinejoin="round" />
  </Svg>
);
const PersonGlyph = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx={8} cy={4.4} r={2.4} stroke="#A684FF" strokeWidth={1.33} />
    <Path d="M3.7 14v-.9A4.1 4.1 0 0 1 7.8 9h.4a4.1 4.1 0 0 1 4.1 4.1v.9" stroke="#A684FF" strokeWidth={1.33} strokeLinecap="round" />
  </Svg>
);
const KebabGlyph = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    {[6, 12, 18].map(cy => <Circle key={cy} cx={12} cy={cy} r={1.6} fill="#9CA3AF" />)}
  </Svg>
);
const CalendarGlyph = () => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Path d="M3.5 5.5h17v15h-17z" stroke="#F87171" strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M3.5 10h17M8 3.5v4M16 3.5v4" stroke="#F87171" strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

function GoalRing({ pct, size = 92, stroke = 9 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(92,92,92,0.35)" strokeWidth={stroke} fill="none" />
        {p > 0 ? (
          <Circle
            cx={size / 2} cy={size / 2} r={r} stroke="#34C759" strokeWidth={stroke} fill="none"
            strokeDasharray={c} strokeDashoffset={c * (1 - p)}
            strokeLinecap={p >= 0.999 ? 'butt' : 'round'}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, s.ringCentre]}>
        <AppText style={s.ringPct}>{Math.round(p * 100)}%</AppText>
        <AppText style={s.ringLabel}>OF YOUR GOAL</AppText>
      </View>
    </View>
  );
}

export function BMIHomeScreen({ navigation }: Props) {
  const {
    entries, refreshing, refresh, error, latest, deltaHeight, idealWeightRange,
    weightGoal, goalProgressPct, goalRemainingKg, goalAchieved,
    weeklyWeightDelta, setBodyProfile, setGoal,
  } = useBMITracker();

  const [profileOpen, setProfileOpen] = useState(false);
  const [dobInput, setDobInput] = useState(weightGoal?.dob ?? '');
  const [sexInput, setSexInput] = useState<'female' | 'male' | undefined>(weightGoal?.sex);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const category = latest ? BMI_CATEGORY_META[latest.category] : null;

  const insights = latest ? buildBodyInsights({
    bmi: latest.bmi,
    bmiLabel: category?.label ?? '—',
    bmiStatus: latest.category === 'normal' ? 'normal' : latest.category === 'underweight' ? 'low' : 'high',
    idealRange: idealWeightRange ? { minKg: idealWeightRange.min, maxKg: idealWeightRange.max } : null,
    heightCm: latest.heightCm,
    weightKg: latest.weightKg,
    dob: weightGoal?.dob,
    sex: weightGoal?.sex,
    // Readings entered on the latest measurement take precedence over the
    // formula estimates (§3, §9) — they're measurements of this person rather
    // than a population regression.
    measured: {
      bodyFatPct:   latest.bodyFatPct,
      muscleMassKg: latest.muscleMassKg,
      visceralFat:  latest.visceralFat,
      bodyWaterPct: latest.bodyWaterPct,
      boneMassKg:   latest.boneMassKg,
    },
  }) : [];

  /**
   * Suggested weight target, derived from the latest BMI rather than asked for.
   *
   * The healthy BMI band (18.5–24.9) converts to a weight range at the user's
   * height, so the nearest edge of that band is the smallest change that gets
   * them into range — a more honest target than an arbitrary round number.
   * Someone already in range is told to maintain, not to lose weight.
   */
  const suggestion = (() => {
    if (!latest || !idealWeightRange) return null;
    const w = latest.weightKg;
    const round1 = (n: number) => Math.round(n * 10) / 10;

    if (w > idealWeightRange.max) {
      const target = round1(idealWeightRange.max);
      return { direction: 'lose' as const, deltaKg: round1(w - target), target };
    }
    if (w < idealWeightRange.min) {
      const target = round1(idealWeightRange.min);
      return { direction: 'gain' as const, deltaKg: round1(target - w), target };
    }
    return { direction: 'maintain' as const, deltaKg: 0, target: round1(w) };
  })();

  /** Whether recent movement is toward the suggested target or away from it. */
  const trendNote = (() => {
    if (!suggestion || weeklyWeightDelta == null || weeklyWeightDelta === 0) return null;
    const movingDown = weeklyWeightDelta < 0;
    const amount = `${Math.abs(weeklyWeightDelta)} kg this week`;
    if (suggestion.direction === 'maintain') {
      return `${movingDown ? 'Down' : 'Up'} ${amount} · still in range`;
    }
    const onTrack = (suggestion.direction === 'lose') === movingDown;
    return onTrack
      ? `${movingDown ? 'Down' : 'Up'} ${amount} · on track`
      : `${movingDown ? 'Down' : 'Up'} ${amount} · moving away from target`;
  })();

  /**
   * Goal editor (§4). Opens seeded from the current goal, or from the
   * suggestion when there isn't one — so the sheet never starts on an empty
   * field the user has to invent a number for.
   */
  const [goalSheet, setGoalSheet] = useState(false);
  const [goalType, setGoalType] = useState<WeightGoalType>('maintain');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalErr, setGoalErr] = useState<string | null>(null);

  const openGoalSheet = () => {
    setGoalType(weightGoal?.goalType ?? suggestion?.direction ?? 'maintain');
    setGoalTarget(
      weightGoal ? String(weightGoal.targetWeightKg)
        : suggestion ? String(suggestion.target)
          : latest ? String(latest.weightKg) : '',
    );
    setGoalErr(null);
    setGoalSheet(true);
  };

  const saveGoal = async () => {
    const target = Number(goalTarget);
    if (!Number.isFinite(target) || target <= 0) { setGoalErr('Enter a target weight.'); return; }
    // Same bounds as a logged weight — a goal outside them is a typo.
    if (target < 20 || target > 400) { setGoalErr('Enter a target between 20 and 400 kg.'); return; }
    if (goalSaving) return;

    setGoalErr(null);
    setGoalSaving(true);
    try {
      await setGoal(Math.round(target * 10) / 10, goalType);
      setGoalSheet(false);
    } catch {
      setGoalErr('Could not save. Check your connection.');
    } finally {
      setGoalSaving(false);
    }
  };

  /**
   * Accept the suggested target in one tap, confirming first — setting
   * someone's weight goal silently isn't a decision to make for them.
   *
   * The suggestion's direction doubles as the goal type (§4), so accepting it
   * records both. "Change it" opens the editor for a different number or type.
   */
  const acceptSuggestion = () => {
    if (!suggestion) { openGoalSheet(); return; }
    Alert.alert(
      'Set weight goal',
      suggestion.direction === 'maintain'
        ? `Set ${suggestion.target} kg as your goal and keep maintaining?`
        : `Set ${suggestion.target} kg as your goal? That's ${suggestion.deltaKg} kg to ${suggestion.direction}.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Change it', onPress: openGoalSheet },
        { text: 'Set goal', onPress: () => { void setGoal(suggestion.target, suggestion.direction); } },
      ],
    );
  };

  const saveProfile = async () => {
    const age = dobInput ? ageFromDob(dobInput) : null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dobInput) || age == null) {
      setProfileErr('Enter your date of birth as YYYY-MM-DD.');
      return;
    }
    if (age < 13 || age > 100) { setProfileErr('Enter a date of birth between 13 and 100 years old.'); return; }
    if (!sexInput) { setProfileErr('Select a sex — the formulas need it.'); return; }
    setProfileErr(null);
    setSavingProfile(true);
    try {
      await setBodyProfile(dobInput, sexInput);
      setProfileOpen(false);
    } catch {
      setProfileErr('Could not save. Check your connection.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.trackers} />
        }
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
            <AppText style={s.backArrow}>←</AppText>
          </TouchableOpacity>
          <AppText style={s.headerTitle}>BMI</AppText>
          <View style={s.hBtn} />
        </View>

        {error ? (
          <View style={s.errorBanner}>
            <AppText variant="caption" color={Colors.error}>{error}</AppText>
          </View>
        ) : null}

        {/* ── Weight goal ── */}
        {weightGoal ? (
          <TouchableOpacity style={s.goalCard} activeOpacity={0.9} onPress={openGoalSheet}>
            <View style={s.goalLeft}>
              <View style={s.goalTitleRow}>
                <View style={s.goalIcon}><ClockGlyph /></View>
                <AppText style={s.goalTitle}>
                  Weight goal
                  {weightGoal.goalType ? ` · ${GOAL_TYPE_LABEL[weightGoal.goalType]}` : ''}
                </AppText>
              </View>
              <View>
                <AppText style={s.goalTarget}>
                  Target: <AppText style={s.goalTargetBold}>{weightGoal.targetWeightKg} kg</AppText>
                </AppText>
                <AppText style={[s.goalNote, goalAchieved && { color: '#6EE7B7' }]}>
                  {goalAchieved
                    ? 'Goal reached — brilliant work! 🎉'
                    : goalRemainingKg != null && goalRemainingKg > 0
                      ? `${goalRemainingKg} kg to go · You're doing great! 💙`
                      : goalProgressPct != null ? "You're doing great! 💙" : 'Log a few entries to track progress'}
                </AppText>
              </View>
            </View>
            {goalProgressPct != null ? <GoalRing pct={goalProgressPct / 100} /> : null}
          </TouchableOpacity>
        ) : (
          // No goal set yet: the card proposes one derived from the current
          // BMI instead of asking the user to invent a number.
          <TouchableOpacity
            style={s.goalCard}
            activeOpacity={0.9}
            onPress={suggestion ? acceptSuggestion : () => navigation.navigate('BMILog')}
          >
            <View style={s.goalLeft}>
              <View style={s.goalTitleRow}>
                <View style={s.goalIcon}><ClockGlyph /></View>
                <AppText style={s.goalTitle}>Weight goal</AppText>
              </View>

              {suggestion ? (
                <View>
                  <AppText style={s.goalTarget}>
                    {suggestion.direction === 'maintain'
                      ? 'Suggested: '
                      : `${suggestion.direction === 'lose' ? 'Lose' : 'Gain'} ${suggestion.deltaKg} kg → `}
                    <AppText style={s.goalTargetBold}>{suggestion.target} kg</AppText>
                  </AppText>
                  <AppText style={s.goalNote}>
                    {trendNote
                      ?? (suggestion.direction === 'maintain'
                        ? "You're in the healthy range 💙"
                        : 'Based on a healthy BMI for your height')}
                  </AppText>
                  <AppText style={s.goalCta}>Tap to set this goal ›</AppText>
                </View>
              ) : (
                <View>
                  <AppText style={s.goalTarget}>No entries yet</AppText>
                  <AppText style={s.goalNote}>
                    Log your height and weight and a target is suggested for you.
                  </AppText>
                  <AppText style={s.goalCta}>Tap to log your first entry ›</AppText>
                </View>
              )}
            </View>

            {latest ? <GoalRing pct={0} /> : null}
          </TouchableOpacity>
        )}

        {/* The layout below renders whether or not anything is logged: the
            cards show placeholders rather than the whole screen collapsing
            into an empty state, so a first-time user can see what they'll get. */}
        <>
            {/* ── Overview ── */}
            <View style={s.overviewWrap}>
              <View style={s.overviewHead}>
                <AppText style={s.overviewTitle}>Your Overview</AppText>
              </View>
              <View style={s.overviewRow}>
                <OverviewCard
                  Glyph={ScaleGlyph} tint="#EFF6FF" label="Weight"
                  value={latest ? String(latest.weightKg) : SAMPLE_OVERVIEW.weightKg} unit="kg"
                  delta={weeklyWeightDelta} deltaUnit="kg" sample={!latest}
                />
                <OverviewCard
                  Glyph={RulerGlyph} tint="#EEF2FF" label="Height"
                  value={latest ? String(latest.heightCm) : SAMPLE_OVERVIEW.heightCm} unit="cm"
                  delta={deltaHeight} deltaUnit="cm" sample={!latest}
                />
                <OverviewCard
                  Glyph={HeartGlyph} tint="#FEF2F2" label="BMI"
                  value={latest ? String(latest.bmi) : SAMPLE_OVERVIEW.bmi}
                  badge={category?.label ?? SAMPLE_OVERVIEW.label}
                  badgeColor={category?.color ?? '#16A34A'}
                  footer={latest
                    ? (latest.category === 'normal' ? 'Healthy range' : 'Outside healthy range')
                    : 'Healthy range'}
                  sample={!latest}
                />
              </View>
            </View>

            {/* ── Body insights ── */}
            <View style={s.insightCard}>
              <View style={s.rowBetween}>
                <View style={s.insightHead}>
                  <View style={s.insightIcon}><PersonGlyph /></View>
                  <AppText style={s.insightTitle}>Body Insights</AppText>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('BMIGuide')} hitSlop={8}>
                  <AppText style={s.guideLink}>Guide ›</AppText>
                </TouchableOpacity>
              </View>

              {insights.length === 0 ? (
                <View>
                  {SAMPLE_INSIGHTS.map(row => (
                    <View key={row.label} style={s.insightRow}>
                      <View style={s.rowBetween}>
                        <AppText style={s.insightLabel} numberOfLines={2}>{row.label}</AppText>
                        <AppText style={s.insightSample}>{row.value}</AppText>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View>
                  {insights.map(m => (
                    <InsightRow
                      key={m.key}
                      metric={m}
                      onAddDetails={() => { setProfileErr(null); setProfileOpen(true); }}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* ── Records ── */}
            <View style={s.recordsHead}>
              <AppText style={s.recordsTitle}>BMI Records</AppText>
              <TouchableOpacity onPress={() => navigation.navigate('BMIRecords')} hitSlop={8}>
                <AppText style={s.viewAll}>View all</AppText>
              </TouchableOpacity>
            </View>

            <View style={s.recordList}>
              {/* No empty-state card here: sample *metrics* show what a card
                  will hold, but a sample *record* would look like an entry the
                  user had made. Nothing is shown until there's a real one. */}
              {entries.slice(0, 4).map(e => {
                const meta = BMI_CATEGORY_META[e.category];
                return (
                  <TouchableOpacity
                    key={e.id}
                    style={s.recordCard}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('BMIRecordDetail', { id: e.id })}
                  >
                    <View style={s.recordLeft}>
                      <View style={s.recordIcon}><CalendarGlyph /></View>
                      <View style={s.recordBody}>
                        <View style={s.recordStampRow}>
                          <AppText style={s.recordStamp} numberOfLines={1}>{fmtStamp(e)}</AppText>
                          <View style={s.recordChip}>
                            <AppText style={s.recordChipText}>{relativeDay(e.date)}</AppText>
                          </View>
                        </View>
                        <AppText style={s.recordMeasure} numberOfLines={1}>
                          {e.weightKg} kg · {e.heightCm} cm
                        </AppText>
                      </View>
                    </View>

                    <View style={s.recordRight}>
                      <AppText style={s.recordBmi}>BMI {e.bmi}</AppText>
                      <View style={[s.recordTag, { backgroundColor: meta.color + '1F' }]}>
                        <AppText style={[s.recordTagText, { color: meta.color }]} numberOfLines={1}>
                          {meta.label}
                        </AppText>
                      </View>
                    </View>
                    <KebabGlyph />
                  </TouchableOpacity>
                );
              })}
            </View>
        </>

        {/* ── Hydration cross-link ── */}
        <View style={s.hydrateCard}>
          <View style={s.hydrateLeft}>
            <AppText style={s.hydrateEmoji}>🧴</AppText>
            <View style={s.hydrateText}>
              <AppText style={s.hydrateTitle}>Stay Hydrated! 💧</AppText>
              <AppText style={s.hydrateSub}>
                Drinking enough water can boost your metabolism and overall well-being.
              </AppText>
            </View>
          </View>
          <TouchableOpacity
            style={s.logWaterBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('WaterHome')}
          >
            <AppText style={s.logWaterText}>Log Water</AppText>
            <AppText style={s.logWaterChevron}>›</AppText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.cta} activeOpacity={0.9} onPress={() => navigation.navigate('BMILog')}>
          <View style={s.ctaPlus}>
            <View style={s.ctaPlusH} />
            <View style={s.ctaPlusV} />
          </View>
          <AppText style={s.ctaText}>Quick log</AppText>
        </TouchableOpacity>
      </ScrollView>

      {/* Date of birth + sex — only used for body-composition estimates. */}
      <BottomSheet visible={profileOpen} onClose={() => setProfileOpen(false)} title="Your details">
        <AppText variant="caption" color={Colors.textMuted} style={{ marginTop: -8, marginBottom: Spacing.base }}>
          Body fat, BMR, muscle mass and body water are estimated from published formulas that need your age and sex.
          Nothing here is shared, and you can leave it blank — those rows just stay hidden.
        </AppText>

        <AppText variant="label" color={Colors.textSecondary}>Date of birth</AppText>
        <TextInput
          style={s.sheetInput as any}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textLight}
          value={dobInput}
          onChangeText={setDobInput}
          keyboardType="numbers-and-punctuation"
        />

        <AppText variant="label" color={Colors.textSecondary} style={{ marginTop: Spacing.base }}>Sex</AppText>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: 6 }}>
          {(['female', 'male'] as const).map(sx => (
            <TouchableOpacity
              key={sx}
              style={[s.sexBtn, sexInput === sx && s.sexBtnOn]}
              activeOpacity={0.85}
              onPress={() => setSexInput(sx)}
            >
              <AppText variant="body" color={sexInput === sx ? Colors.white : Colors.textPrimary}>
                {sx === 'female' ? 'Female' : 'Male'}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
        <AppText variant="caption" color={Colors.textLight} style={{ marginTop: 6 }}>
          The formulas only offer female/male coefficients — this is a limitation of the published research, not a
          statement about identity.
        </AppText>

        {profileErr ? (
          <View style={s.errorBanner}>
            <AppText variant="caption" color={Colors.error}>{profileErr}</AppText>
          </View>
        ) : null}

        <TouchableOpacity style={s.sheetSave} activeOpacity={0.9} disabled={savingProfile} onPress={saveProfile}>
          <AppText variant="button" color={Colors.white}>{savingProfile ? 'Saving…' : 'Save details'}</AppText>
        </TouchableOpacity>
      </BottomSheet>

      {/* ── Weight goal editor (§4) ──
          Optional throughout: the tracker works normally with no goal set, so
          this is reachable from the goal card and nothing forces it open. */}
      <BottomSheet visible={goalSheet} onClose={() => setGoalSheet(false)} title="Weight goal">
        <View style={s.goalSheet}>
          <AppText style={s.goalSheetLabel}>Goal type</AppText>
          <View style={s.goalTypeRow}>
            {GOAL_TYPES.map(t => {
              const on = goalType === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[s.goalTypeChip, on && s.goalTypeChipOn]}
                  activeOpacity={0.85}
                  onPress={() => setGoalType(t.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  {/* A tick as well as the fill — selection shouldn't rely on
                      colour alone. */}
                  {on ? <AppText style={s.goalTypeTick}>✓</AppText> : null}
                  <AppText style={[s.goalTypeText, on && s.goalTypeTextOn]}>{t.label}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          <AppText style={s.goalSheetLabel}>Target weight</AppText>
          <View style={s.goalInputRow}>
            <TextInput
              style={s.goalInput as any}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor="#C4C4C4"
              value={goalTarget}
              onChangeText={v => setGoalTarget(v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
              accessibilityLabel="Target weight in kilograms"
            />
            <AppText style={s.goalInputUnit}>kg</AppText>
          </View>

          {goalErr ? (
            <AppText style={s.goalErr}>{goalErr}</AppText>
          ) : (
            <AppText style={s.goalSheetHint}>
              Optional — your BMI, records and progress all work without a goal.
            </AppText>
          )}

          <TouchableOpacity
            style={s.goalSaveBtn}
            activeOpacity={0.9}
            disabled={goalSaving}
            onPress={saveGoal}
          >
            <AppText style={s.goalSaveText}>{goalSaving ? 'Saving…' : 'Save Goal'}</AppText>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function OverviewCard({
  Glyph, tint, label, value, unit, delta, deltaUnit, badge, badgeColor, footer, sample,
}: {
  Glyph: React.ComponentType; tint: string; label: string;
  value: string; unit?: string;
  delta?: number | null; deltaUnit?: string;
  badge?: string; badgeColor?: string; footer?: string;
  /** Muted rendering for illustrative values. */
  sample?: boolean;
}) {
  return (
    <View style={s.overviewCard}>
      <View style={s.overviewCardHead}>
        <View style={[s.overviewIcon, { backgroundColor: tint }]}><Glyph /></View>
        <AppText style={s.overviewLabel} numberOfLines={1}>{label}</AppText>
      </View>

      <View style={s.overviewValueRow}>
        <AppText style={[s.overviewValue, sample && s.sampleValue]}>{value}</AppText>
        {unit ? <AppText style={[s.overviewUnit, sample && s.sampleValue]}>{unit}</AppText> : null}
      </View>

      {badge ? (
        <View style={s.overviewFooter}>
          <View style={[
            s.overviewBadge,
            { backgroundColor: (badgeColor ?? '#16A34A') + (sample ? '14' : '22') },
          ]}>
            <AppText
              style={[s.overviewBadgeText, { color: sample ? '#9CA3AF' : (badgeColor ?? '#16A34A') }]}
              numberOfLines={1}
            >
              {badge}
            </AppText>
          </View>
          {footer ? <AppText style={s.overviewSub} numberOfLines={1}>{footer}</AppText> : null}
        </View>
      ) : (
        <View style={s.overviewFooter}>
          <AppText
            style={[
              s.overviewDelta,
              // Down is green for weight, but height has no "good" direction —
              // it's grey whenever there's nothing to compare.
              { color: delta == null || delta === 0 ? '#9CA3AF' : delta < 0 ? '#34C759' : '#DC2626' },
            ]}
            numberOfLines={1}
          >
            {sample
              ? 'No change yet'
              : delta == null || delta === 0
                ? '— No change'
                : `${delta < 0 ? '▼' : '▲'} ${Math.abs(delta)} ${deltaUnit ?? ''}`.trim()}
          </AppText>
          <AppText style={s.overviewSub}>vs last week</AppText>
        </View>
      )}
    </View>
  );
}

/**
 * One Body Insights row. Expands on tap to reveal the explanation and where the
 * number came from — important because these are population estimates, not
 * measurements.
 */
function InsightRow({ metric, onAddDetails }: { metric: BodyMetric; onAddDetails: () => void }) {
  const [open, setOpen] = useState(false);
  const isBadge = metric.key === 'bmiStatus';

  return (
    <TouchableOpacity
      style={s.insightRow}
      activeOpacity={0.7}
      onPress={() => (metric.state === 'needsProfile' ? onAddDetails() : setOpen(o => !o))}
    >
      <View style={s.rowBetween}>
        <AppText style={s.insightLabel} numberOfLines={2}>{metric.label}</AppText>

        {metric.value && isBadge ? (
          <View style={[s.statusPill, { backgroundColor: STATUS_COLOR[metric.status] + '1A' }]}>
            <AppText style={[s.statusPillText, { color: STATUS_COLOR[metric.status] }]}>
              {metric.value}
            </AppText>
          </View>
        ) : metric.value ? (
          <AppText style={s.insightValue}>{metric.value}</AppText>
        ) : metric.state === 'needsProfile' ? (
          <AppText style={s.addDetails}>Add details ›</AppText>
        ) : (
          <AppText style={s.needsScale}>Needs scale</AppText>
        )}
      </View>

      {(open || metric.state === 'unavailable') ? (
        <View style={s.insightExplain}>
          <AppText style={s.insightExplainText}>{metric.explain}</AppText>
          <AppText style={s.insightSource}>{metric.source}</AppText>
        </View>
      ) : null}
    </TouchableOpacity>
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

const GOAL_HAIRLINE = 'rgba(153,153,153,0.20)';

const s = StyleSheet.create({
  // ── Weight goal editor (§4) ──
  goalSheet: { paddingHorizontal: 4, paddingBottom: 8, gap: 10 },
  goalSheetLabel: {
    fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#141414', marginTop: 6,
  },
  goalTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalTypeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 9999,
    borderWidth: 1, borderColor: GOAL_HAIRLINE, backgroundColor: Colors.white,
  },
  goalTypeChipOn: { backgroundColor: '#EEF4FF', borderColor: '#3A80FA' },
  goalTypeTick: { fontFamily: 'DMSans-Bold', fontSize: 12, color: '#3A80FA' },
  goalTypeText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#6B7280' },
  goalTypeTextOn: { fontFamily: 'DMSans-SemiBold', color: '#141414' },
  goalInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16,
    borderWidth: 1, borderColor: GOAL_HAIRLINE, backgroundColor: '#F9FAFB',
  },
  goalInput: {
    flex: 1, padding: 0,
    fontFamily: 'DMSans-Bold', fontSize: 24, color: '#141414',
  } as any,
  goalInputUnit: { fontFamily: 'DMSans-Medium', fontSize: 15, color: '#9CA3AF' },
  goalSheetHint: {
    fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 17, color: '#9CA3AF',
  },
  goalErr: { fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 17, color: '#DC2626' },
  goalSaveBtn: {
    marginTop: 6, paddingVertical: 16, borderRadius: 9999,
    backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center',
  },
  goalSaveText: { fontFamily: 'DMSans-SemiBold', fontSize: 17, color: Colors.white },

  safe: { flex: 1, backgroundColor: '#F1F1F1' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorBanner: { backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12, marginBottom: 16 },
  chevron: { fontSize: 18, color: '#9CA3AF' },

  // ── Weight goal ──
  goalCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    backgroundColor: '#141414', borderRadius: 30, padding: 17,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  goalLeft: { flex: 1, minWidth: 0, gap: 12 },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalIcon: { padding: 6, borderRadius: 9999, backgroundColor: Colors.white },
  goalTitle: { fontFamily: 'DMSans-Bold', fontSize: 18, lineHeight: 20, color: '#CAD2DE' },
  goalTarget: { fontFamily: 'DMSans-Regular', fontSize: 11, lineHeight: 16, color: '#F1F1F1' },
  goalTargetBold: { fontFamily: 'DMSans-Bold', fontSize: 11, color: '#F1F1F1' },
  goalNote: { fontFamily: 'DMSans-Bold', fontSize: 11, lineHeight: 16, color: '#7A97FF' },

  ringCentre: { alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontFamily: 'DMSans-Bold', fontSize: 22, lineHeight: 28, color: Colors.white },
  ringLabel: {
    fontFamily: 'DMSans-Bold', fontSize: 7, lineHeight: 11,
    color: '#F4F4F4', letterSpacing: 0.3,
  },

  setGoalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: 24, padding: 16, ...CARD_SHADOW,
  },
  setGoalTitle: { fontFamily: 'DMSans-Bold', fontSize: 16, color: '#141414' },
  setGoalSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#6B7280' },
  goalCta: { fontFamily: 'DMSans-Bold', fontSize: 11, lineHeight: 16, color: '#CAD2DE', paddingTop: 2 },
  placeholderText: {
    fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 19,
    color: '#6B7280', textAlign: 'center', paddingVertical: 8,
  },
  recordEmpty: {
    padding: 20, backgroundColor: Colors.white, borderRadius: 20,
    borderWidth: 1, borderColor: HAIRLINE,
  },

  // ── Overview ──
  overviewWrap: { marginTop: 20, borderRadius: 30, padding: 10, gap: 10 },
  overviewHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  overviewTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: '#141414' },
  overviewRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  overviewCard: {
    flex: 1, minWidth: 0, padding: 12, gap: 10,
    backgroundColor: Colors.white, borderRadius: 20, ...CARD_SHADOW,
  },
  overviewCardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overviewIcon: { padding: 6, borderRadius: 6 },
  overviewLabel: {
    flexShrink: 1,
    fontFamily: 'DMSans-SemiBold', fontSize: 15, lineHeight: 18, color: '#141414',
  },
  overviewValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  overviewValue: { fontFamily: 'DMSans-Bold', fontSize: 20, lineHeight: 26, color: '#1A1C1E' },
  overviewUnit: { fontFamily: 'DMSans-Bold', fontSize: 10, lineHeight: 15, color: '#6C727F' },
  // Fixed height keeps the three cards level whether the footer is a badge
  // plus caption or a delta plus caption.
  overviewFooter: { minHeight: 36, gap: 4, justifyContent: 'flex-start' },
  overviewDelta: { fontFamily: 'DMSans-Bold', fontSize: 12, lineHeight: 15 },
  overviewSub: { fontFamily: 'DMSans-Medium', fontSize: 11, lineHeight: 14, color: '#666666' },
  overviewBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  overviewBadgeText: { fontFamily: 'DMSans-Bold', fontSize: 11, lineHeight: 14 },

  // ── Body insights ──
  insightCard: {
    marginTop: 16, padding: 16, gap: 8,
    backgroundColor: Colors.white, borderRadius: 24,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  insightHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  insightIcon: { padding: 6, borderRadius: 9999, backgroundColor: '#FAF5FF' },
  insightTitle: { fontFamily: 'DMSans-Bold', fontSize: 16, lineHeight: 20, color: '#1F2937' },
  guideLink: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: '#A684FF' },

  insightRow: { paddingVertical: 10 },
  insightLabel: {
    flex: 1, minWidth: 0, paddingRight: 12,
    fontFamily: 'DMSans-SemiBold', fontSize: 15, lineHeight: 20, color: '#666666',
  },
  insightValue: { fontFamily: 'DMSans-Bold', fontSize: 15, lineHeight: 20, color: '#1F2937' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  statusPillText: { fontFamily: 'DMSans-Bold', fontSize: 10, lineHeight: 15 },
  addDetails: { fontFamily: 'DMSans-Bold', fontSize: 13, color: '#A684FF' },
  needsScale: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#9CA3AF' },
  insightSample: { fontFamily: 'DMSans-Bold', fontSize: 15, lineHeight: 20, color: '#C4C4C4' },
  sampleValue: { color: '#C4C4C4' },
  insightExplain: { marginTop: 6, gap: 2 },
  insightExplainText: { fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 17, color: '#6B7280' },
  insightSource: { fontFamily: 'DMSans-Regular', fontSize: 11, lineHeight: 15, color: '#9CA3AF' },

  // ── Records ──
  recordsHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 24, marginBottom: 16,
  },
  recordsTitle: { fontFamily: 'DMSans-Bold', fontSize: 20, lineHeight: 24, color: '#141414' },
  viewAll: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: '#999999' },
  recordList: { gap: 10 },
  recordCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, backgroundColor: Colors.white, borderRadius: 20,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  recordLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  recordIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },
  recordBody: { flex: 1, minWidth: 0, gap: 6 },
  recordStampRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recordStamp: { flexShrink: 1, fontFamily: 'DMSans-Bold', fontSize: 11, lineHeight: 15, color: '#999999' },
  recordChip: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  recordChipText: { fontFamily: 'DMSans-Bold', fontSize: 9, lineHeight: 12, color: '#666666' },
  recordMeasure: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 18, color: '#141414' },
  recordRight: { alignItems: 'center', gap: 5, flexShrink: 0 },
  recordBmi: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 16, color: '#141414' },
  recordTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9999 },
  recordTagText: { fontFamily: 'DMSans-Bold', fontSize: 9, lineHeight: 12 },

  // ── Hydration ──
  hydrateCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    marginTop: 24, padding: 18, borderRadius: 30,
    backgroundColor: '#EFE0FF', borderWidth: 1, borderColor: '#F3E8FF',
  },
  hydrateLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  hydrateEmoji: { fontSize: 34, lineHeight: 42, includeFontPadding: false },
  hydrateText: { flex: 1, minWidth: 0, gap: 4 },
  hydrateTitle: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 20, color: '#1F2937' },
  hydrateSub: { fontFamily: 'DMSans-Regular', fontSize: 10, lineHeight: 13, color: '#6C727F' },
  logWaterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: '#141414',
  },
  logWaterText: { fontFamily: 'DMSans-Bold', fontSize: 12, lineHeight: 16, color: Colors.white },
  logWaterChevron: { fontSize: 14, color: Colors.white },

  // ── CTA ──
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    marginTop: 24, paddingVertical: 20, paddingHorizontal: 30,
    backgroundColor: '#141414', borderRadius: 9999, ...CARD_SHADOW,
  },
  ctaPlus: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  ctaPlusH: { position: 'absolute', width: 16, height: 2.5, borderRadius: 2, backgroundColor: Colors.white },
  ctaPlusV: { position: 'absolute', width: 2.5, height: 16, borderRadius: 2, backgroundColor: Colors.white },
  ctaText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 24, color: Colors.white },

  // ── Profile sheet ──
  sheetInput: {
    backgroundColor: Colors.bgInput, borderRadius: Radius.md, padding: Spacing.md, marginTop: 6,
    fontFamily: 'DMSans-Regular', fontSize: 15, color: Colors.textPrimary,
  } as any,
  sexBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  sexBtnOn: { backgroundColor: Colors.black, borderColor: Colors.black },
  sheetSave: {
    backgroundColor: Colors.black, borderRadius: Radius.full, paddingVertical: 15,
    alignItems: 'center', marginTop: Spacing.lg,
  },
});
