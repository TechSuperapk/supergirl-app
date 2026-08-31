/**
 * IntimacyInsightsScreen — overview stats, protection-rate donut, mood-after
 * distribution, a 6-month frequency trend, and the most common feeling.
 * Every section honours the period filter except Monthly Frequency, which is
 * a 6-month series by definition.
 */
import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Polyline, SvgProps } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { PickerSheet } from '../../components/PickerSheet';
import { useIntimacyTracker } from '../../hooks/useTrackers';
import { IntimacyFeeling, IntimacyMoodAfter, IntimacyPeriod } from '../../types';

import TotalEntries  from '../../components/TotalEntries';
import ProductedIcon from '../../components/ProductedIcon';
import SelfloveIcon  from '../../components/SelfloveIcon';
import PartnerIcon   from '../../components/PartnerIcon';

type Props = NativeStackScreenProps<any, 'IntimacyInsights'>;

const PERIOD_LABEL: Record<IntimacyPeriod, string> = {
  month: 'This Month', year: 'This Year', all: 'All Time',
};
const PERIOD_KEYS: IntimacyPeriod[] = ['month', 'year', 'all'];
// PickerSheet works in plain strings, so the label is the wire format and is
// mapped back to a key on select.
const PERIOD_OPTIONS = PERIOD_KEYS.map(k => PERIOD_LABEL[k]);
const periodFromLabel = (label: string): IntimacyPeriod =>
  PERIOD_KEYS.find(k => PERIOD_LABEL[k] === label) ?? 'month';

const MOOD_ROWS: { key: IntimacyMoodAfter; label: string; emoji: string; color: string }[] = [
  { key: 'amazing', label: 'Amazing', emoji: '🤩', color: '#4ADE80' },
  { key: 'good',    label: 'Good',    emoji: '😊', color: '#FACC15' },
  { key: 'ok',      label: 'Ok',      emoji: '😐', color: '#FB923C' },
  { key: 'low',     label: 'Low',     emoji: '😔', color: '#F87171' },
];

const FEELING_META: Record<IntimacyFeeling, { label: string; emoji: string }> = {
  loved:        { label: 'Loved',        emoji: '🥰' },
  happy:        { label: 'Happy',        emoji: '😄' },
  relaxed:      { label: 'Relaxed',      emoji: '😌' },
  passionate:   { label: 'Passionate',   emoji: '😍' },
  neutral:      { label: 'Neutral',      emoji: '🙂' },
  disappointed: { label: 'Disappointed', emoji: '😞' },
};

export function IntimacyInsightsScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const { monthlyFrequency, statsFor } = useIntimacyTracker();

  const [period, setPeriod] = useState<IntimacyPeriod>('month');
  const [picking, setPicking] = useState(false);

  const {
    overview, protection, moodAfterCounts, mostCommonFeeling, mostCommonFeelingPct,
    feelingTotal,
  } = statsFor(period);
  const periodSub = PERIOD_LABEL[period];

  const moodTotal = Object.values(moodAfterCounts).reduce((a, b) => a + b, 0);
  /**
   * Eligible partner records — those that actually recorded a protection
   * status. A partner entry left blank is excluded rather than treated as
   * unprotected (§6.2), so this is the denominator and `protectedPct` is null
   * when it's zero.
   */
  const partnerTotal = protection.eligibleCount;
  const protectedPct = overview.protectedPct ?? 0;

  const pctOfEntries = (n: number) =>
    overview.totalEntries ? `${Math.round((n / overview.totalEntries) * 100)}% of entries` : '—';

  // Card is inset by the screen's 24px padding and its own 20px padding.
  const chartW = width - 24 * 2 - 20 * 2;

  const PeriodChip = (
    <TouchableOpacity style={s.periodChip} activeOpacity={0.7} onPress={() => setPicking(true)}>
      <AppText style={s.periodText}>{periodSub}</AppText>
      <Caret />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>Intimacy Insights</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Overview ── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <AppText style={s.sectionTitle}>Overview</AppText>
            {PeriodChip}
          </View>

          <View style={s.statRow}>
            <StatCard
              Icon={TotalEntries} label="Total Entries"
              value={String(overview.totalEntries)} sub={periodSub}
            />
            <StatCard
              Icon={ProductedIcon} label="Protected"
              value={partnerTotal ? `${protectedPct}%` : '—'}
              sub={partnerTotal
                ? `${overview.protectedCount} Out of ${partnerTotal}`
                : overview.partnerCount
                  // Partner entries exist but none recorded protection. Saying
                  // "no partner entries" would be untrue, and 0% would be worse.
                  ? 'Not recorded'
                  : 'No partner entries'}
            />
          </View>
          <View style={s.statRow}>
            <StatCard
              Icon={PartnerIcon} label="With Partner"
              value={String(overview.partnerCount)} sub={pctOfEntries(overview.partnerCount)}
            />
            <StatCard
              Icon={SelfloveIcon} label="Self Love"
              value={String(overview.selfLoveCount)} sub={pctOfEntries(overview.selfLoveCount)}
            />
          </View>
        </View>

        {/* ── Protection rate ── */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <AppText style={s.sectionTitle}>Protection Rate</AppText>
            {PeriodChip}
          </View>

          {partnerTotal === 0 ? (
            <View style={s.innerPanel}>
              <AppText style={s.emptyText}>
                Log a partner entry with its protection status to see this.
              </AppText>
            </View>
          ) : (
            <View style={[s.innerPanel, s.protectionPanel]}>
              <Donut pct={protectedPct} />
              <View style={s.legend}>
                <LegendRow
                  color="#4ADE80" label="Protected"
                  value={`${overview.protectedCount} (${protectedPct}%)`}
                />
                <LegendRow
                  color="#F87171" label="Unprotected"
                  value={`${overview.unprotectedCount} (${100 - protectedPct}%)`}
                />
              </View>
            </View>
          )}
        </View>

        {/* ── Mood after ── */}
        <View style={s.cardPadded}>
          <View style={s.rowBetween}>
            <AppText style={s.sectionTitle}>Mood After Trends</AppText>
            {PeriodChip}
          </View>

          {moodTotal === 0 ? (
            <AppText style={s.emptyText}>Record how you felt afterwards to see this.</AppText>
          ) : (
            <View style={s.moodList}>
              {MOOD_ROWS.map(m => {
                const pct = Math.round((moodAfterCounts[m.key] / moodTotal) * 100);
                return (
                  <View key={m.key} style={s.moodRow}>
                    <AppText style={s.moodEmoji}>{m.emoji}</AppText>
                    <View style={s.moodBody}>
                      <View style={s.rowBetween}>
                        <AppText style={s.moodLabel}>{m.label}</AppText>
                        <AppText style={s.moodLabel}>{pct}%</AppText>
                      </View>
                      <View style={s.barTrack}>
                        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: m.color }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Monthly frequency ── */}
        <View style={s.cardPadded}>
          <View style={s.rowBetween}>
            <AppText style={s.sectionTitle}>Monthly Frequency</AppText>
            {/* Fixed 6-month window, so this one is a label rather than a
                filter — a picker here would suggest it follows the period. */}
            <View style={s.periodChip}>
              <AppText style={s.periodText}>Last 6 Months</AppText>
            </View>
          </View>

          <FrequencyChart data={monthlyFrequency} width={chartW} />
        </View>

        {/* ── Most common feeling ── */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <AppText style={s.sectionTitle}>Most Common Feeling</AppText>
            {PeriodChip}
          </View>

          {mostCommonFeeling ? (
            <TouchableOpacity
              style={s.feelingPanel}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('IntimacyHistory')}
            >
              <View style={s.feelingLeft}>
                <View style={s.feelingIcon}>
                  <AppText style={s.feelingEmoji}>{FEELING_META[mostCommonFeeling].emoji}</AppText>
                </View>
                <View>
                  <AppText style={s.feelingName}>{FEELING_META[mostCommonFeeling].label}</AppText>
                  {/* "of entries you rated", not "of entries" — the denominator
                      is records that recorded a feeling (§6.5), and the two
                      differ whenever the field was left blank. */}
                  <AppText style={s.feelingSub}>
                    {mostCommonFeelingPct}% of {feelingTotal} rated {feelingTotal === 1 ? 'entry' : 'entries'}
                  </AppText>
                </View>
              </View>
              <View style={s.feelingChevron}>
                <AppText style={s.feelingChevronGlyph}>›</AppText>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={s.innerPanel}>
              <AppText style={s.emptyText}>Log how it felt to see your most common feeling.</AppText>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={s.cta}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('LogIntimacy')}
        >
          <View style={s.ctaPlus}>
            <View style={s.ctaPlusH} />
            <View style={s.ctaPlusV} />
          </View>
          <AppText style={s.ctaText}>Quick log</AppText>
        </TouchableOpacity>
      </ScrollView>

      <PickerSheet
        visible={picking}
        title="Period"
        options={PERIOD_OPTIONS}
        value={periodSub}
        onSelect={v => setPeriod(periodFromLabel(v))}
        onClose={() => setPicking(false)}
      />
    </SafeAreaView>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

const Caret = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M4 6L8 10L12 6" stroke="#6B7280" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

function StatCard({
  Icon, label, value, sub,
}: { Icon: React.ComponentType<SvgProps>; label: string; value: string; sub: string }) {
  return (
    <View style={s.statCard}>
      <View style={s.statTop}>
        <Icon width={40} height={40} />
        <View style={s.statText}>
          <AppText style={s.statLabel} numberOfLines={1}>{label}</AppText>
          <AppText style={s.statValue}>{value}</AppText>
        </View>
      </View>
      <AppText style={s.statSub} numberOfLines={1}>{sub}</AppText>
    </View>
  );
}

/**
 * Protection donut. Drawn as a stroked arc rather than two stacked filled
 * circles — a filled overlay can't express an arbitrary split, and the mock's
 * version only looks right at the one value it was drawn at.
 */
function Donut({ pct }: { pct: number }) {
  const size = 120;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct)) / 100;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#F87171" strokeWidth={stroke} fill="none" />
        {p > 0 ? (
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke="#34C759" strokeWidth={stroke} fill="none"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - p)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, s.donutCentre]}>
        <AppText style={s.donutPct}>{pct}%</AppText>
        <AppText style={s.donutLabel}>PROTECTED</AppText>
      </View>
    </View>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={s.legendRow}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <AppText style={s.legendLabel} numberOfLines={1}>{label}</AppText>
      <AppText style={s.legendValue}>{value}</AppText>
    </View>
  );
}

/** 6-month entry-count trend: line, point markers, value + month labels. */
function FrequencyChart({
  data, width,
}: { data: { label: string; value: number }[]; width: number }) {
  const height = 175;
  const padX = 10;
  const padTop = 26;
  const padBottom = 26;

  const values = data.map(d => d.value);
  const max = Math.max(1, ...values);
  const plotH = height - padTop - padBottom;
  const stepX = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;

  const pts = data.map((d, i) => ({
    ...d,
    x: padX + i * stepX,
    // Baseline is zero so bars of 0 sit on the floor rather than mid-chart.
    y: padTop + (1 - d.value / max) * plotH,
  }));

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Polyline
          points={pts.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none" stroke="#F43F5E" strokeWidth={2.6}
          strokeLinecap="round" strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill="#F43F5E" />
        ))}
      </Svg>

      {pts.map((p, i) => (
        <AppText key={`v${i}`} style={[s.chartValue, { left: p.x - 12, top: p.y - 22 }]}>
          {p.value}
        </AppText>
      ))}
      {pts.map((p, i) => (
        <AppText key={`l${i}`} style={[s.chartLabel, { left: p.x - 16, top: height - 16 }]}>
          {p.label}
        </AppText>
      ))}
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
  safe: { flex: 1, backgroundColor: Colors.white },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#4B5563' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, lineHeight: 28, color: '#1F2937' },

  scroll: { paddingHorizontal: 24, paddingTop: 6, paddingBottom: 24, gap: 20 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  section: { gap: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'DMSans-Bold', fontSize: 18, lineHeight: 28, color: '#1A1A1A' },

  periodChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  periodText: { fontFamily: 'DMSans-Regular', fontSize: 14, lineHeight: 20, color: '#6B7280' },

  // ── Stat cards ──
  statRow: { flexDirection: 'row', gap: 16 },
  statCard: {
    flex: 1, minWidth: 0, padding: 16, gap: 8,
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: '#F7F7F7', ...CARD_SHADOW,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statText: { flex: 1, minWidth: 0 },
  statLabel: { fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16, color: '#6B7280' },
  statValue: { fontFamily: 'DMSans-Bold', fontSize: 20, lineHeight: 28, color: '#1A1A1A' },
  statSub: { fontFamily: 'DMSans-Regular', fontSize: 10, lineHeight: 15, color: '#9CA3AF' },

  // ── Cards ──
  card: {
    backgroundColor: Colors.white, borderRadius: 30, padding: 10,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  cardPadded: {
    backgroundColor: Colors.white, borderRadius: 30, padding: 20, gap: 24,
    borderWidth: 1, borderColor: '#F1F1F1', ...CARD_SHADOW,
  },
  cardHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 10,
  },
  innerPanel: {
    padding: 24, borderRadius: 24, backgroundColor: 'rgba(153,153,153,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  protectionPanel: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  emptyText: {
    fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 19,
    color: '#6B7280', textAlign: 'center',
  },

  // ── Donut ──
  donutCentre: { alignItems: 'center', justifyContent: 'center' },
  donutPct: { fontFamily: 'DMSans-Bold', fontSize: 20, lineHeight: 28, color: '#1F2937' },
  donutLabel: {
    fontFamily: 'DMSans-SemiBold', fontSize: 8, lineHeight: 12,
    color: '#9CA3AF', letterSpacing: 0.8,
  },
  legend: { flex: 1, minWidth: 0, gap: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: {
    flex: 1, minWidth: 0,
    fontFamily: 'DMSans-Medium', fontSize: 14, lineHeight: 20, color: '#374151',
  },
  legendValue: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 20, color: '#111827' },

  // ── Mood bars ──
  moodList: { gap: 16 },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  moodEmoji: { width: 24, fontSize: 20, lineHeight: 28, includeFontPadding: false },
  moodBody: { flex: 1, minWidth: 0, gap: 4 },
  moodLabel: { fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16, color: '#4B5563' },
  barTrack: { height: 8, borderRadius: 9999, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 9999 },

  // ── Frequency chart ──
  chartValue: {
    position: 'absolute', width: 24, textAlign: 'center',
    fontFamily: 'DMSans-Bold', fontSize: 9, color: '#111827',
  },
  chartLabel: {
    position: 'absolute', width: 32, textAlign: 'center',
    fontFamily: 'DMSans-Regular', fontSize: 9, color: '#9CA3AF',
  },

  // ── Most common feeling ──
  feelingPanel: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 24, backgroundColor: '#F6F6F6',
    borderWidth: 1, borderColor: HAIRLINE,
  },
  feelingLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flexShrink: 1 },
  feelingIcon: {
    padding: 12, borderRadius: 16, backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  feelingEmoji: { fontSize: 30, lineHeight: 36, includeFontPadding: false },
  feelingName: { fontFamily: 'DMSans-Bold', fontSize: 18, lineHeight: 28, color: '#1F2937' },
  feelingSub: { fontFamily: 'DMSans-Regular', fontSize: 14, lineHeight: 20, color: '#6B7280' },
  feelingChevron: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  feelingChevronGlyph: { fontSize: 20, color: '#EC4899' },

  // ── CTA ──
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    marginTop: 10, paddingVertical: 20, paddingHorizontal: 30,
    backgroundColor: '#141414', borderRadius: 9999, ...CARD_SHADOW,
  },
  ctaPlus: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  ctaPlusH: { position: 'absolute', width: 16, height: 2.5, borderRadius: 2, backgroundColor: Colors.white },
  ctaPlusV: { position: 'absolute', width: 2.5, height: 16, borderRadius: 2, backgroundColor: Colors.white },
  ctaText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: Colors.white },
});
