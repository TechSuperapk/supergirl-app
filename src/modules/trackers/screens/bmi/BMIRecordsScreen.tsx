/**
 * BMIRecordsScreen — the selected record's result on top, the full list below.
 *
 * Tapping a record loads it into the result panel rather than opening a modal:
 * it reuses the same scale and stat cards as the log screen, so comparing two
 * measurements is a tap instead of a round trip. Long-press opens Edit/Delete.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, Pressable, RefreshControl, StyleSheet, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { EntryActionSheet } from '../../components/EntryActionSheet';
import { useBMITracker, idealWeightRangeFor } from '../../hooks/useTrackers';
import { BMIEntry, BMICategory } from '../../types';
import { BMI_CATEGORY_META, bmiStatusMessage } from './bmiMeta';

type Props = NativeStackScreenProps<any, 'BMIRecords'>;

/**
 * Illustrative figures for the empty state — a 165 cm / 58.6 kg body at
 * BMI 21.5. Rendered muted so they read as placeholders rather than the user's
 * own measurements.
 */
const SAMPLE = {
  bmi: '21.5', label: 'Normal', weight: '58.6 kg', ideal: '50 - 68 kg', diff: 'Perfect Range',
  markerPct: 30,
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
 * Position as a 0–100% offset, mapped band-by-band. The bands are drawn equal
 * width but span unequal BMI ranges, so a linear mapping would park the marker
 * over the wrong colour.
 */
function markerPct(bmi: number): number {
  const seg = 100 / BANDS.length;
  const within = (v: number, lo: number, hi: number) =>
    Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  if (bmi < 18.5) return within(bmi, 13, 18.5) * seg;
  if (bmi < 25)   return seg + within(bmi, 18.5, 25) * seg;
  if (bmi < 30)   return seg * 2 + within(bmi, 25, 30) * seg;
  if (bmi < 35)   return seg * 3 + within(bmi, 30, 35) * seg;
  return seg * 4 + within(bmi, 35, 45) * seg;
}

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

const ClockGlyph = ({ color = '#7C5CFC' }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Circle cx={9} cy={9} r={7.5} stroke={color} strokeWidth={1.5} />
    <Path d="M9 5.25V9.4l2.6 1.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);
const CalendarGlyph = () => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Path d="M3.5 5.5h17v15h-17z" stroke="#F87171" strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M3.5 10h17M8 3.5v4M16 3.5v4" stroke="#F87171" strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);
const KebabGlyph = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    {[6, 12, 18].map(cy => <Circle key={cy} cx={12} cy={cy} r={1.6} fill="#9CA3AF" />)}
  </Svg>
);

export function BMIRecordsScreen({ navigation }: Props) {
  const { entries, refreshing, refresh, latest, removeBMI } = useBMITracker();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionFor, setActionFor] = useState<BMIEntry | null>(null);

  // Fall back to the newest record, and recover if the shown one is deleted.
  const shown = entries.find(e => e.id === selectedId) ?? latest ?? null;
  useEffect(() => {
    if (selectedId && !entries.some(e => e.id === selectedId)) setSelectedId(null);
  }, [entries, selectedId]);

  /**
   * Fade + lift the panel whenever the shown record changes.
   *
   * Two records can carry near-identical numbers, so without a transition a
   * tap looks like nothing happened. The animation is the feedback that the
   * panel reloaded, independent of whether the figures differ.
   */
  const enter = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!shown) return;
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1, duration: 260, easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [shown?.id]);

  const panelStyle = {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  };

  const meta = shown ? BMI_CATEGORY_META[shown.category] : null;
  const ideal = shown ? idealWeightRangeFor(shown.heightCm) : null;
  const isLatest = !!shown && !!latest && shown.id === latest.id;

  const diffText = (() => {
    if (!shown || !ideal) return '—';
    if (shown.category === 'normal') return 'Perfect Range';
    return shown.weightKg > ideal.max
      ? `-${Math.round((shown.weightKg - ideal.max) * 10) / 10} kg`
      : `+${Math.round((ideal.min - shown.weightKg) * 10) / 10} kg`;
  })();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>Records</AppText>
        <View style={s.hBtn} />
      </View>

      {/* ── Pinned result ──
          Rendered whether or not anything is logged: before the first entry
          the same layout appears with placeholder values, so the screen shows
          what it will hold rather than collapsing to a bare list. */}
      <View style={s.pinned}>
        <Animated.View style={panelStyle}>
          <View style={s.resultPanel}>
            <View style={s.rowBetween}>
              <View style={s.resultTitleWrap}>
                <AppText style={s.resultTitle}>Your BMI Result</AppText>
                {/* Says which record is on show — without it, tapping an old
                    entry looks like the current reading changed. */}
                <AppText style={s.resultFor}>
                  {!shown
                    ? 'Nothing logged yet'
                    : isLatest ? 'Latest measurement' : `${fmtStamp(shown)} · ${relativeDay(shown.date)}`}
                </AppText>
              </View>
              <TouchableOpacity
                style={s.guideChip}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('BMIGuide')}
              >
                <ClockGlyph />
                <AppText style={s.guideText}>BMI Guide</AppText>
              </TouchableOpacity>
            </View>

            <View style={s.resultTop}>
              <View style={s.resultNumber}>
                <AppText style={[s.bmiValue, !shown && s.sampleValue]}>
                  {shown ? shown.bmi : SAMPLE.bmi}
                </AppText>
                <AppText style={s.bmiCaption}>Your BMI</AppText>
              </View>

              <View style={s.resultCopy}>
                {shown && meta ? (
                  <>
                    <View style={[s.categoryPill, { backgroundColor: meta.color + '26' }]}>
                      <AppText style={[s.categoryPillText, { color: meta.color }]}>{meta.label}</AppText>
                    </View>
                    <AppText style={s.resultMessage}>{bmiStatusMessage(shown.category)}</AppText>
                  </>
                ) : (
                  <>
                    <View style={[s.categoryPill, { backgroundColor: '#EEEEEE' }]}>
                      <AppText style={[s.categoryPillText, { color: '#9CA3AF' }]}>
                        {SAMPLE.label}
                      </AppText>
                    </View>
                    <AppText style={s.resultPending}>
                      Log your height and weight to replace this with your own result.
                    </AppText>
                  </>
                )}
                <AppText style={s.resultRange}>Healthy range: 18.5 – 24.9</AppText>
              </View>
            </View>

            <View style={s.scaleWrap}>
              <View style={s.scaleTrack}>
                {BANDS.map(b => (
                  <View
                    key={b.key}
                    style={[
                      s.scaleSeg,
                      { backgroundColor: b.color },
                      // Muted until there's a reading to point at.
                      !shown && { opacity: 0.35 },
                    ]}
                  />
                ))}
              </View>

              <View
                style={[
                  s.marker,
                  { left: `${shown && meta ? Math.max(2, Math.min(98, markerPct(shown.bmi))) : SAMPLE.markerPct}%` },
                ]}
                pointerEvents="none"
              >
                <View style={[s.markerHead, { backgroundColor: shown && meta ? meta.color : '#C4C4C4' }]} />
                <View style={[s.markerStem, { backgroundColor: shown && meta ? meta.color : '#C4C4C4' }]} />
              </View>

              <View style={s.scaleLabels}>
                {BANDS.map(b => {
                  const on = !!shown && b.key === shown.category;
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

          <View style={s.miniRow}>
            <MiniStat
              label="Current Weight"
              value={shown ? `${shown.weightKg} kg` : SAMPLE.weight}
              sample={!shown}
            />
            <MiniStat
              label="Ideal Weight"
              value={ideal ? `${ideal.min} - ${ideal.max} kg` : SAMPLE.ideal}
              sample={!shown}
            />
            <MiniStat
              label="Weight Difference"
              value={shown ? diffText : SAMPLE.diff}
              color={shown ? (shown.category === 'normal' ? '#15803D' : '#B45309') : undefined}
              sample={!shown}
            />
          </View>
        </Animated.View>

        <View style={s.listHead}>
          <AppText style={s.listTitle}>BMI Records</AppText>
        </View>
      </View>

      {/* ── Scrollable records ── */}
      <ScrollView
        style={s.list}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.trackers} />
        }
      >
        {entries.length === 0 ? (
          <AppEmptyState
            emoji="📋"
            title="No records yet"
            subtitle="Log your first BMI entry to see it here."
            actionLabel="Calculate BMI"
            onAction={() => navigation.navigate('BMILog')}
          />
        ) : (
          <View style={s.recordList}>
            {entries.map(e => {
              const m = BMI_CATEGORY_META[e.category];
              const active = shown?.id === e.id;
              return (
                <TouchableOpacity
                  key={e.id}
                  style={[s.recordCard, active && s.recordCardActive]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedId(e.id)}
                  onLongPress={() => setActionFor(e)}
                >
                  <View style={s.recordLeft}>
                    <View style={s.recordIcon}><CalendarGlyph /></View>
                    <View style={s.recordBody}>
                      <View style={s.recordStampRow}>
                        <AppText style={s.recordStamp} numberOfLines={1}>{fmtStamp(e)}</AppText>
                        <View style={s.recordChip}>
                          <AppText style={s.recordChipText} numberOfLines={1}>{relativeDay(e.date)}</AppText>
                        </View>
                      </View>
                      <AppText style={s.recordMeasure} numberOfLines={1}>
                        {e.weightKg} kg · {e.heightCm} cm
                      </AppText>
                    </View>
                  </View>

                  <View style={s.recordRight}>
                    <AppText style={s.recordBmi}>BMI {e.bmi}</AppText>
                    <View style={[s.recordTag, { backgroundColor: m.color + '1F' }]}>
                      <AppText style={[s.recordTagText, { color: m.color }]} numberOfLines={1}>
                        {m.label}
                      </AppText>
                    </View>
                  </View>

                  {/* Pressable, not a nested Touchable: on Android a Touchable
                      inside a Touchable can swallow the parent's press and make
                      the whole row feel dead. */}
                  <Pressable
                    onPress={() => setActionFor(e)}
                    hitSlop={8}
                    style={s.kebab}
                  >
                    <KebabGlyph />
                  </Pressable>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Verdict for the selected record */}
        {shown ? (
          <View
            style={[
              s.verdict,
              shown.category === 'normal'
                ? { backgroundColor: '#DCFFE7', borderColor: '#DCFCE7' }
                : { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' },
            ]}
          >
            <AppText style={[s.verdictTitle, shown.category !== 'normal' && { color: '#9A3412' }]}>
              {shown.category === 'normal'
                ? "You're maintaining a healthy BMI!"
                : 'This reading is outside the healthy range'}
            </AppText>
            <AppText style={[s.verdictSub, shown.category !== 'normal' && { color: '#C2410C' }]}>
              {shown.category === 'normal'
                ? 'Keep up the great work.'
                : 'Small, consistent changes make the difference.'}
            </AppText>
          </View>
        ) : null}

      </ScrollView>

      <View style={s.ctaWrap}>
        <TouchableOpacity style={s.cta} activeOpacity={0.9} onPress={() => navigation.navigate('BMILog')}>
          <View style={s.ctaPlus}>
            <View style={s.ctaPlusH} />
            <View style={s.ctaPlusV} />
          </View>
          <AppText style={s.ctaText}>Quick log</AppText>
        </TouchableOpacity>
      </View>

      <EntryActionSheet
        visible={!!actionFor}
        title={actionFor?.date}
        subtitle={actionFor ? `BMI ${actionFor.bmi} · ${actionFor.weightKg} kg / ${actionFor.heightCm} cm` : undefined}
        onClose={() => setActionFor(null)}
        onEdit={() => actionFor && navigation.navigate('BMILog', { id: actionFor.id })}
        onDelete={() => actionFor && removeBMI(actionFor.id)}
        deleteConfirmMessage="Delete this BMI record? This cannot be undone."
      />
    </SafeAreaView>
  );
}

function MiniStat({
  label, value, color, sample,
}: { label: string; value: string; color?: string; sample?: boolean }) {
  return (
    <View style={s.miniCard}>
      <AppText style={s.miniLabel} numberOfLines={2}>{label}</AppText>
      <AppText
        style={[s.miniValue, color ? { color } : null, sample && s.sampleValue]}
        numberOfLines={1}
      >
        {value}
      </AppText>
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

  // The result block is pinned; only the record list scrolls beneath it.
  pinned: { paddingHorizontal: 20 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },

  // ── Result ──
  resultPanel: { paddingVertical: 20, gap: 24 },
  resultTitleWrap: { flex: 1, minWidth: 0, paddingRight: 12 },
  resultTitle: { fontFamily: 'DMSans-Bold', fontSize: 18, lineHeight: 26, color: '#1A1C1E' },
  resultFor: { fontFamily: 'DMSans-Medium', fontSize: 11, lineHeight: 15, color: '#9CA3AF' },
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
  sampleValue: { color: '#C4C4C4' },
  resultCopy: { flex: 1, minWidth: 0, gap: 6, minHeight: 74, justifyContent: 'center' },
  resultPending: { fontFamily: 'DMSans-Medium', fontSize: 13, lineHeight: 18, color: '#9CA3AF' },
  categoryPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 },
  categoryPillText: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 16 },
  resultMessage: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 20, color: '#1A1C1E' },
  resultRange: { fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 16, color: '#6B7280' },

  scaleWrap: { paddingTop: 22 },
  scaleTrack: { flexDirection: 'row', height: 8, borderRadius: 9999, overflow: 'hidden' },
  scaleSeg: { flex: 1 },
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
    flex: 1, minWidth: 0, minHeight: 76, padding: 14, gap: 8,
    backgroundColor: Colors.white, borderRadius: 16,
    alignItems: 'center', justifyContent: 'space-between', ...CARD_SHADOW,
  },
  miniLabel: {
    fontFamily: 'DMSans-Regular', fontSize: 11, lineHeight: 15,
    color: '#999999', textAlign: 'center',
  },
  miniValue: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 18, color: '#141414', textAlign: 'center' },

  // ── List ──
  listHead: { marginTop: 20, marginBottom: 12 },
  listTitle: { fontFamily: 'DMSans-Bold', fontSize: 20, lineHeight: 24, color: '#141414' },
  recordList: { gap: 10 },
  recordCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, backgroundColor: Colors.white, borderRadius: 20,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  // The row currently shown above gets a dark outline, so the link between
  // the list and the result panel is visible.
  recordCardActive: { borderColor: '#141414', borderWidth: 2 },
  recordLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  recordIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },
  recordBody: { flex: 1, minWidth: 0, gap: 6 },
  recordStampRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recordStamp: { flexShrink: 1, fontFamily: 'DMSans-Bold', fontSize: 11, lineHeight: 15, color: '#999999' },
  recordChip: {
    flexShrink: 0, maxWidth: 84,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  recordChipText: { fontFamily: 'DMSans-Bold', fontSize: 9, lineHeight: 12, color: '#666666' },
  recordMeasure: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 18, color: '#141414' },
  recordRight: { alignItems: 'center', gap: 5, flexShrink: 0 },
  recordBmi: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 16, color: '#141414' },
  recordTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9999 },
  recordTagText: { fontFamily: 'DMSans-Bold', fontSize: 9, lineHeight: 12 },
  kebab: { paddingHorizontal: 2, paddingVertical: 6 },

  // ── Verdict ──
  verdict: { marginTop: 24, padding: 20, borderRadius: 16, borderWidth: 1, gap: 3 },
  verdictTitle: {
    fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 20,
    color: '#166534', textAlign: 'center',
  },
  verdictSub: {
    fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 20,
    color: '#16A34A', textAlign: 'center',
  },

  // ── CTA ──
  ctaWrap: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, backgroundColor: '#F1F1F1' },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    paddingVertical: 20, paddingHorizontal: 30,
    backgroundColor: '#141414', borderRadius: 9999, ...CARD_SHADOW,
  },
  ctaPlus: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  ctaPlusH: { position: 'absolute', width: 16, height: 2.5, borderRadius: 2, backgroundColor: Colors.white },
  ctaPlusV: { position: 'absolute', width: 2.5, height: 16, borderRadius: 2, backgroundColor: Colors.white },
  ctaText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 24, color: Colors.white },
});
