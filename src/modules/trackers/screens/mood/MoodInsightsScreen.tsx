/**
 * MoodInsightsScreen — analytics over all mood logs: summary cards, mood trend
 * line chart, weekly heatmap, distribution, trigger analysis and the most
 * recent journal entry. Everything respects the period filter and recalculates
 * automatically as logs change.
 */
import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Line, Rect, Text as SvgText } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { PickerSheet } from '../../components/PickerSheet';
import { useMoodLogs } from '../../hooks/useMoodLogs';
import { MoodPeriod, MOOD_META, MoodKey } from '../../types';

type Props = NativeStackScreenProps<any, 'MoodInsights'>;

const PERIODS: { key: MoodPeriod; label: string }[] = [
  { key: '7d',  label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: '3m',  label: 'Last 3 Months' },
  { key: '1y',  label: 'Last Year' },
  { key: 'all', label: 'All Time' },
];

// ── Glyphs ───────────────────────────────────────────────────────────────────

const CaretGlyph = ({ color = '#9CA3AF' }: { color?: string }) => (
  <Svg width={12} height={12} viewBox="0 0 16 16" fill="none">
    <Path d="M4 6 8 10l4-4" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const SmallChevron = () => (
  <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
    <Path d="M6 3 10.5 8 6 13" stroke="#D1D5DB" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const PlusGlyph = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M10 4v12M4 10h12" stroke={Colors.white} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const CalendarGlyph = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={5} width={16} height={15} rx={3} stroke="#AF52DE" strokeWidth={1.5} />
    <Path d="M4 10h16M8.5 3v4M15.5 3v4" stroke="#AF52DE" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);
const PenGlyph = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="#141414" strokeWidth={1.7} strokeLinejoin="round" />
    <Path d="M14.5 5.5 18.5 9.5" stroke="#141414" strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

/** Catmull-Rom → cubic bézier, so the trend curves instead of kinking. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0].x} ${pts[0].y}`;
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}`
      + ` ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}`
      + ` ${p2.x} ${p2.y}`;
  }
  return d;
}

const Y_TICKS = [
  { v: 10, emoji: '😍' }, { v: 8, emoji: '😊' }, { v: 6, emoji: '😐' },
  { v: 4, emoji: '😟' }, { v: 2, emoji: '☹️' }, { v: 0, emoji: '😭' },
];

/** Mood trend line with emoji y-axis and a dot per logged day. */
function TrendChart({ points }: { points: { label: string; value: number }[] }) {
  const [w, setW] = useState(0);
  const H = 200, PAD_L = 34, PAD_R = 8, PAD_T = 8, PAD_B = 24;
  const plotW = Math.max(0, w - PAD_L - PAD_R);
  const plotH = H - PAD_T - PAD_B;

  const xAt = (i: number) =>
    PAD_L + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const yAt = (v: number) => PAD_T + plotH - (Math.max(0, Math.min(10, v)) / 10) * plotH;
  const coords = points.map((p, i) => ({ x: xAt(i), y: yAt(p.value) }));

  // Never label every one of 30 days — sample to at most 5.
  const step = Math.max(1, Math.ceil(points.length / 5));

  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={H}>
          {Y_TICKS.map(t => {
            const y = yAt(t.v);
            return (
              <React.Fragment key={t.v}>
                <Line x1={PAD_L} y1={y} x2={w - PAD_R} y2={y} stroke="#F9FAFB" strokeWidth={1} />
                <SvgText x={4} y={y + 4} fontSize={9} fill="#6B7280" fontFamily="DMSans-Medium">{t.emoji}</SvgText>
                <SvgText x={PAD_L - 5} y={y + 4} fontSize={9} fill="#6B7280" textAnchor="end" fontFamily="DMSans-Bold">
                  {t.v}
                </SvgText>
              </React.Fragment>
            );
          })}
          <Line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke="#F3F4F6" strokeWidth={1} />
          <Path d={smoothPath(coords)} stroke="#374151" strokeWidth={1.6} fill="none" strokeLinecap="round" />
          {coords.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={3.2} fill={points[i].value >= 7 ? '#F97316' : '#3B82F6'} />
          ))}
        </Svg>
      )}
      <View style={s.xAxis}>
        {points.map((p, i) => (
          <AppText key={i} style={[s.axisText, i % step !== 0 && { opacity: 0 }]}>{p.label}</AppText>
        ))}
      </View>
    </View>
  );
}

export function MoodInsightsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { logs, loading, refreshing, refresh, error, statsFor, heatmap } = useMoodLogs();
  const [period, setPeriod] = useState<MoodPeriod>('30d');
  const [periodSheet, setPeriodSheet] = useState(false);

  const st = statsFor(period);
  const periodLabel = PERIODS.find(p => p.key === period)!.label;
  const cols = heatmap(6);
  const recentJournal = st.logs.find(l => l.notes?.trim());

      {/* ── §31 loading / error ──
          Both gate on there being no data yet: once insights are on screen a
          failed refresh is a banner, not a takeover. */}
  if (loading && logs.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
            <AppText style={s.backArrow}>←</AppText>
          </TouchableOpacity>
          <AppText style={s.headerTitle}>Mood insights</AppText>
          <View style={s.hBtn} />
        </View>
        <View style={s.centre}>
          <ActivityIndicator color="#F97316" />
          <AppText style={s.centreText}>Analyzing your mood…</AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (error && logs.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
            <AppText style={s.backArrow}>←</AppText>
          </TouchableOpacity>
          <AppText style={s.headerTitle}>Mood insights</AppText>
          <View style={s.hBtn} />
        </View>
        <View style={s.centre}>
          <AppText style={s.centreTitle}>Unable to load mood insights.</AppText>
          <AppText style={s.centreText}>Please try again.</AppText>
          <TouchableOpacity style={s.retryBtn} activeOpacity={0.9} onPress={refresh}>
            <AppText style={s.retryText}>Retry</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (logs.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
            <AppText style={s.backArrow}>←</AppText>
          </TouchableOpacity>
          <AppText style={s.headerTitle}>Mood insights</AppText>
          <View style={s.hBtn} />
        </View>
        <AppEmptyState
          emoji="📈"
          title="No insights yet"
          subtitle="Log a few moods and your patterns will show up here."
          actionLabel="Log Mood"
          onAction={() => navigation.navigate('LogMood', {})}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>Mood insights</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#F97316" />}
      >
        {error ? (
          <View style={s.errorBanner}>
            <AppText variant="caption" color={Colors.error}>{error}</AppText>
            <TouchableOpacity onPress={refresh} hitSlop={8}>
              <AppText style={s.errorRetry}>Retry</AppText>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Summary ── */}
        <View style={s.statRow}>
          <View style={s.statCard}>
            <View style={s.statTop}>
              <View style={[s.statIcon, { backgroundColor: '#FFF7ED' }]}>
                <AppText style={s.statEmoji}>😊</AppText>
              </View>
              <View style={s.statText}>
                <AppText style={s.statLabel}>Average Mood</AppText>
                <View style={s.statValueRow}>
                  <AppText style={s.statValue}>{st.avgScore != null ? st.avgScore : '—'}</AppText>
                  <AppText style={s.statUnit}>out of 10</AppText>
                </View>
              </View>
            </View>
            <AppText style={[s.statFoot, { color: (st.delta ?? 0) >= 0 ? '#F97316' : '#EF4444' }]} numberOfLines={1}>
              {st.delta != null && st.delta !== 0
                ? `${st.delta > 0 ? '↑' : '↓'} ${Math.abs(st.delta)} from earlier`
                : 'No change yet'}
            </AppText>
          </View>

          <View style={s.statCard}>
            <View style={s.statTop}>
              <View style={[s.statIcon, { backgroundColor: '#FAF5FF' }]}><CalendarGlyph /></View>
              <View style={s.statText}>
                <AppText style={s.statLabel}>Best Day</AppText>
                <AppText style={s.statValueSm} numberOfLines={1}>{st.bestWeekday?.label ?? '—'}</AppText>
              </View>
            </View>
            <AppText style={[s.statFoot, { color: '#C084FC' }]} numberOfLines={1}>Your highest mood day</AppText>
          </View>
        </View>

        {/* ── Trend ── */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <AppText style={s.cardTitle}>Mood Trend</AppText>
            <TouchableOpacity style={s.periodChip} hitSlop={8} onPress={() => setPeriodSheet(true)}>
              <AppText style={s.periodText}>{periodLabel}</AppText>
              <CaretGlyph />
            </TouchableOpacity>
          </View>
          {st.trend.length < 2 ? (
            <AppText style={s.muted}>Log at least two days to see a trend.</AppText>
          ) : (
            <TrendChart points={st.trend.map(t => ({ label: t.label, value: t.value }))} />
          )}
        </View>

        {/* ── Heatmap ── */}
        <AppText style={s.sectionTitle}>Weekly mood heatmap</AppText>
        <View style={s.heatWrap}>
          <View style={s.heatDayCol}>
            <View style={{ height: 18 }} />
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <View key={i} style={s.heatDayCell}><AppText style={s.heatDayText}>{d}</AppText></View>
            ))}
          </View>
          <View style={s.heatCols}>
            {cols.map(col => (
              <View key={col.weekStart} style={s.heatCol}>
                <AppText style={s.heatColLabel} numberOfLines={1}>
                  {new Date(col.weekStart + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </AppText>
                {col.days.map(cell => (
                  <View key={cell.date} style={s.heatDayCell}>
                    <TouchableOpacity
                      style={[s.heatDot, { backgroundColor: cell.log ? MOOD_META[cell.log.mood].color : '#EEEDED' }]}
                      disabled={!cell.log}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('MoodDetail', { date: cell.date })}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={s.legendWrap}>
          {st.distribution.map(d => (
            <View key={d.mood} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: MOOD_META[d.mood as MoodKey].color }]} />
              <AppText style={s.legendText}>{MOOD_META[d.mood as MoodKey].label}</AppText>
            </View>
          ))}
        </View>

        {/* ── Distribution + triggers ── */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <AppText style={s.cardTitle}>Mood Distribution</AppText>
            <TouchableOpacity style={s.periodChip} hitSlop={8} onPress={() => setPeriodSheet(true)}>
              <AppText style={s.periodText}>{periodLabel}</AppText>
              <CaretGlyph />
            </TouchableOpacity>
          </View>

          <View style={s.barList}>
            {st.distribution.map(d => (
              <View key={d.mood} style={s.barRow}>
                <AppText style={s.barEmoji}>{MOOD_META[d.mood as MoodKey].emoji}</AppText>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${d.pct}%`, backgroundColor: MOOD_META[d.mood as MoodKey].color }]} />
                </View>
                <AppText style={s.barPct}>{d.pct}%</AppText>
              </View>
            ))}
          </View>

          <AppText style={s.triggerKicker}>COMMON MOOD TRIGGERS</AppText>
          {st.triggers.length === 0 ? (
            <AppText style={s.muted}>Tag what influenced your mood to see which factors help or hurt.</AppText>
          ) : (
            <View style={s.triggerWrap}>
              {/* Green lifts, red drags — the tint carries the meaning the mock
                  assigns arbitrarily. */}
              {st.positiveTriggers.map(t => (
                <View key={t.key} style={[s.trigger, { backgroundColor: '#F0FDF4' }]}>
                  <AppText style={[s.triggerText, { color: '#166534' }]} numberOfLines={1}>{t.key}</AppText>
                </View>
              ))}
              {st.negativeTriggers.map(t => (
                <View key={t.key} style={[s.trigger, { backgroundColor: '#FEF2F2' }]}>
                  <AppText style={[s.triggerText, { color: '#7F1D1D' }]} numberOfLines={1}>{t.key}</AppText>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Recent journal ── */}
        {recentJournal ? (
          <TouchableOpacity
            style={s.journalCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('MoodDetail', { date: recentJournal.date })}
          >
            <View style={s.journalIcon}><PenGlyph /></View>
            <View style={s.journalText}>
              <AppText style={s.journalTitle}>Recent Journal Entry</AppText>
              <AppText style={s.journalMeta} numberOfLines={1}>
                {new Date(recentJournal.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' • '}
                <AppText style={{ color: MOOD_META[recentJournal.mood].color }}>
                  {MOOD_META[recentJournal.mood].label}
                </AppText>
              </AppText>
              <AppText style={s.journalBody} numberOfLines={2}>{recentJournal.notes}</AppText>
            </View>
            <SmallChevron />
          </TouchableOpacity>
        ) : (
          <View style={s.card}>
            <AppText style={s.muted}>No journal notes in this range.</AppText>
          </View>
        )}

        <TouchableOpacity
          style={s.cta}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('LogMood', {})}
        >
          <PlusGlyph />
          <AppText style={s.ctaText}>Quick Log</AppText>
        </TouchableOpacity>
      </ScrollView>

      <PickerSheet
        visible={periodSheet}
        title="Period"
        options={PERIODS.map(p => p.label)}
        value={periodLabel}
        onSelect={label => {
          const hit = PERIODS.find(p => p.label === label);
          if (hit) setPeriod(hit.key);
          setPeriodSheet(false);
        }}
        onClose={() => setPeriodSheet(false)}
      />
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

  scroll: { paddingHorizontal: 20, paddingTop: 8, gap: 20 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12,
  },
  errorRetry: { fontFamily: 'DMSans-Bold', fontSize: 13, color: '#141414' },
  centre: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingBottom: 60, gap: 12,
  },
  centreTitle: {
    fontFamily: 'DMSans-SemiBold', fontSize: 19, color: '#141414', textAlign: 'center',
  },
  centreText: {
    fontFamily: 'DMSans-Regular', fontSize: 14, lineHeight: 21,
    color: '#6B7280', textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8, paddingVertical: 14, paddingHorizontal: 40,
    backgroundColor: '#141414', borderRadius: 9999,
  },
  retryText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: Colors.white },
  muted: { fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 19, color: '#9CA3AF' },
  sectionTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 17, lineHeight: 24, color: '#1F2937' },

  // ── Summary cards ──
  statRow: { flexDirection: 'row', gap: 14 },
  statCard: {
    flex: 1, minWidth: 0, padding: 14, borderRadius: 26, gap: 8, justifyContent: 'space-between',
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statEmoji: { fontSize: 19, lineHeight: 24, includeFontPadding: false } as any,
  statText: { flex: 1, minWidth: 0 },
  statLabel: { fontFamily: 'DMSans-Medium', fontSize: 11, lineHeight: 16, color: '#6B7280' },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValue: { fontFamily: 'DMSans-Bold', fontSize: 22, lineHeight: 29, color: '#1F2937' },
  statValueSm: { fontFamily: 'DMSans-Bold', fontSize: 17, lineHeight: 24, color: '#1F2937' },
  statUnit: { fontFamily: 'DMSans-Regular', fontSize: 9, lineHeight: 14, color: '#9CA3AF' },
  statFoot: { fontFamily: 'DMSans-Bold', fontSize: 10, lineHeight: 15 },

  // ── Cards ──
  card: {
    padding: 18, borderRadius: 24, gap: 14, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 20, color: '#1F2937' },
  periodChip: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  periodText: { fontFamily: 'DMSans-Bold', fontSize: 10, lineHeight: 15, color: '#9CA3AF' },

  xAxis: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 34, paddingRight: 4 },
  axisText: { fontFamily: 'DMSans-Bold', fontSize: 9, color: '#9CA3AF' },

  // ── Heatmap ──
  heatWrap: { flexDirection: 'row', gap: 10 },
  heatDayCol: { width: 14 },
  heatDayCell: { height: 26, alignItems: 'center', justifyContent: 'center' },
  heatDayText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: '#999999' },
  heatCols: { flex: 1, minWidth: 0, flexDirection: 'row', justifyContent: 'space-between' },
  heatCol: { flex: 1, minWidth: 0, alignItems: 'center' },
  heatColLabel: { fontFamily: 'DMSans-Regular', fontSize: 9, lineHeight: 18, color: '#999999' },
  heatDot: { width: 10, height: 10, borderRadius: 5 },

  legendWrap: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: 'DMSans-SemiBold', fontSize: 12, color: '#000000' },

  // ── Distribution ──
  barList: { gap: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barEmoji: { fontSize: 13, lineHeight: 18, width: 20, includeFontPadding: false } as any,
  barTrack: { flex: 1, minWidth: 0, height: 8, borderRadius: 999, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 999 },
  barPct: { fontFamily: 'DMSans-Bold', fontSize: 10, lineHeight: 15, color: '#1F2937', width: 32, textAlign: 'right' },

  triggerKicker: {
    fontFamily: 'DMSans-Bold', fontSize: 10, lineHeight: 15,
    letterSpacing: 0.4, color: '#666666',
  },
  triggerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trigger: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, maxWidth: 150 },
  triggerText: { fontFamily: 'DMSans-Bold', fontSize: 10, lineHeight: 16 },

  // ── Journal ──
  journalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 24, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: '#F1F1F1', ...CARD_SHADOW,
  },
  journalIcon: {
    width: 46, height: 46, borderRadius: 16, backgroundColor: '#F4F4F4',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  journalText: { flex: 1, minWidth: 0, gap: 2 },
  journalTitle: { fontFamily: 'DMSans-Bold', fontSize: 12, lineHeight: 18, color: '#1F2937' },
  journalMeta: { fontFamily: 'DMSans-Regular', fontSize: 10, lineHeight: 15, color: '#9CA3AF' },
  journalBody: { fontFamily: 'DMSans-Regular', fontSize: 10, lineHeight: 15, color: '#6B7280' },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 20, borderRadius: 999, backgroundColor: '#141414', ...CARD_SHADOW,
  },
  ctaText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 24, color: Colors.white },
});
