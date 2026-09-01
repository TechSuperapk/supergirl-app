/**
 * PeriodInsightsScreen — overview stats, cycle-length trend, most common
 * symptoms, and a timeline preview of recent entries.
 */
import React, { useMemo, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SvgProps } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { CycleHistoryChart } from '../../components/CycleHistoryChart';
import { PeriodTimeline, symptomIcon } from '../../components/PeriodTimeline';
import { usePeriodTracker } from '../../hooks/useTrackers';
import { InsightRange, RANGE_LABEL } from '../../utils/periodAnalytics';

import CalendarIcon   from '../../components/CalendarIcon';
import FlameIcon      from '../../components/FlameIcon';
import FlowIcon       from '../../components/FlowIcon';
import HeartIcon      from '../../components/HeartIcon';

type Props = NativeStackScreenProps<any, 'PeriodInsights'>;

export function PeriodInsightsScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const {
    dayLogs, prediction, avgPeriodLengthDays,
    cycleRegularityPct, cycleHistory, streak, symptomInsights, measuredCycles,
    shortestCycle, longestCycle, predictionAccuracyPct,
    insightRange, setInsightRange,
  } = usePeriodTracker();

  const [showAllSymptoms, setShowAllSymptoms] = useState(false);
  const RANGES: InsightRange[] = ['3m', '6m', '12m', 'all'];

  // Card is inset by the 24px screen padding and its own 24px padding.
  const chartW = width - 24 * 2 - 24 * 2;

  const visibleSymptoms = showAllSymptoms ? symptomInsights : symptomInsights.slice(0, 3);
  const hiddenSymptomCount = Math.max(0, symptomInsights.length - 3);

  // Regularity copy is tied to the number, not hardcoded — "Very consistent"
  // under a 40% score would be actively misleading.
  const regularitySub = useMemo(() => {
    if (cycleRegularityPct == null) return 'Keep tracking to build your cycle history';
    if (cycleRegularityPct >= 90) return 'Very consistent';
    if (cycleRegularityPct >= 75) return 'Fairly consistent';
    return 'Quite variable';
  }, [cycleRegularityPct]);

  const periodSub = useMemo(() => {
    if (avgPeriodLengthDays == null) return 'Log a full period';
    if (shortestCycle == null || longestCycle == null) return 'Based on your logs';
    return longestCycle - shortestCycle <= 3 ? 'Consistent' : 'Varies a little';
  }, [avgPeriodLengthDays, shortestCycle, longestCycle]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>Insights</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Time range (§3.3) ──
            Six months by default, per the supplied design. Changing it
            recalculates the symptom ranking and the timeline preview; the
            cycle-length cards are unaffected because they read the last few
            measured cycles regardless of range. */}
        <View style={s.rangeRow}>
          {RANGES.map(r => (
            <TouchableOpacity
              key={r}
              style={[s.rangeChip, insightRange === r && s.rangeChipOn]}
              activeOpacity={0.85}
              onPress={() => setInsightRange(r)}
              accessibilityRole="button"
              accessibilityState={{ selected: insightRange === r }}
            >
              <AppText style={[s.rangeText, insightRange === r && s.rangeTextOn]}>
                {RANGE_LABEL[r]}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Overview ── */}
        <View style={s.statGrid}>
          <StatCard
            Icon={CalendarIcon} iconBg="#FCE7E9"
            label="Average Cycle"
            // With nothing measured there is no average — showing the 28-day
            // default as if it were the user's own figure would be a fake stat.
            value={measuredCycles >= 1 ? `${prediction.cycleLength} Days` : 'Not enough data'}
            sub={measuredCycles >= 1
              ? `Across ${measuredCycles} cycle${measuredCycles > 1 ? 's' : ''}`
              : 'Log 2 periods to measure a cycle'}
          />
          <StatCard
            Icon={FlowIcon} iconBg="#FEF2F2"
            label="Average Period"
            value={avgPeriodLengthDays ? `${avgPeriodLengthDays} Days` : '—'}
            sub={periodSub}
          />
          <StatCard
            Icon={FlameIcon} iconBg="#FFF7ED"
            label="Current Streak"
            value={`${streak} ${streak === 1 ? 'Day' : 'Days'}`}
            sub={streak > 0 ? 'Track active' : 'Log today to start'}
          />
          <StatCard
            Icon={HeartIcon} iconBg="#F3E8FF" iconColor="#9739FD"
            label="Cycle Regularity"
            value={cycleRegularityPct != null ? `${cycleRegularityPct}%` : 'Need more data'}
            sub={regularitySub}
          />
        </View>

        {/* ── Cycle history ── */}
        <View style={s.chartCard}>
          <View style={s.rowBetween}>
            <AppText style={s.cardTitle}>Cycle History</AppText>
            <View style={s.chip}>
              <AppText style={s.chipText}>Last 6 Months</AppText>
            </View>
          </View>

          {cycleHistory.length === 0 ? (
            <View style={s.chartEmpty}>
              <AppText style={s.emptyText}>
                Log the start of a period and your cycle trend appears here.
              </AppText>
            </View>
          ) : (
            <CycleHistoryChart data={cycleHistory} width={chartW} height={200} />
          )}

          {predictionAccuracyPct != null ? (
            <AppText style={s.chartFootnote}>
              {predictionAccuracyPct}% of your cycles landed within ±2 days of this average.
            </AppText>
          ) : null}
        </View>

        {/* ── Symptom insights ── */}
        <View style={s.sectionHead}>
          <AppText style={s.cardTitle}>Symptom Insights</AppText>
          <AppText style={s.sectionAside}>Most Common</AppText>
        </View>

        {symptomInsights.length === 0 ? (
          <View style={s.emptyCard}>
            <AppText style={s.emptyText}>Log symptoms and your most common ones show up here.</AppText>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.symptomRow}
          >
            {visibleSymptoms.map(si => {
              const { Icon, color } = symptomIcon(si.symptom);
              return (
                <TouchableOpacity
                  key={si.symptom}
                  style={s.symptomCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('SymptomDetail', { symptom: si.symptom })}
                >
                  <Icon width={40} height={40} color={color} />
                  <AppText style={s.symptomName} numberOfLines={1}>{si.symptom}</AppText>
                  <AppText style={s.symptomPct}>{si.pct}%</AppText>
                </TouchableOpacity>
              );
            })}
            {hiddenSymptomCount > 0 && !showAllSymptoms ? (
              <TouchableOpacity
                style={s.moreCard}
                activeOpacity={0.85}
                onPress={() => setShowAllSymptoms(true)}
              >
                <AppText style={s.moreText}>+{hiddenSymptomCount} more</AppText>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        )}

        {/* ── History timeline ── */}
        <View style={s.sectionHead}>
          <AppText style={s.cardTitle}>History</AppText>
          <TouchableOpacity
            style={s.viewAll}
            onPress={() => navigation.navigate('PeriodHistory')}
          >
            <AppText style={s.viewAllText}>View All</AppText>
            <AppText style={s.viewAllChevron}>›</AppText>
          </TouchableOpacity>
        </View>

        {dayLogs.length === 0 ? (
          <View style={s.emptyCard}>
            <AppText style={s.emptyText}>No entries yet. Tap + to log your first day.</AppText>
          </View>
        ) : (
          <PeriodTimeline
            logs={dayLogs.slice(0, 3)}
            onPressLog={log => navigation.navigate('PeriodDayDetail', { date: log.date })}
          />
        )}
      </ScrollView>

      <TouchableOpacity
        style={s.fab}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('LogPeriod')}
      >
        <View style={s.fabPlusH} />
        <View style={s.fabPlusV} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function StatCard({
  Icon, iconBg, iconColor, label, value, sub,
}: {
  Icon: React.ComponentType<SvgProps>;
  iconBg: string; iconColor?: string;
  label: string; value: string; sub: string;
}) {
  return (
    <View style={s.statCard}>
      <View style={[s.statIcon, { backgroundColor: iconBg }]}>
        <Icon width={24} height={24} {...(iconColor ? { color: iconColor } : null)} />
      </View>
      <AppText style={s.statLabel}>{label}</AppText>
      <AppText style={s.statValue}>{value}</AppText>
      <AppText style={s.statSub} numberOfLines={1}>{sub}</AppText>
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
  safe: { flex: 1, backgroundColor: '#FDFDFD' },

  // ── Range filter ──
  rangeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    padding: 5, borderRadius: 12, backgroundColor: 'rgba(153,153,153,0.10)',
  },
  rangeChip: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  rangeChipOn: {
    backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  rangeText: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: '#999999' },
  rangeTextOn: { color: '#141414' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  scroll: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 120, gap: 32 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // ── Stat grid ──
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    // Half the row minus half the gap. Percentages alone would round
    // inconsistently across densities and leave a visible seam.
    flexGrow: 1, flexBasis: '47%',
    backgroundColor: Colors.white, borderRadius: 32, padding: 16,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  statIcon: {
    alignSelf: 'flex-start', padding: 12, borderRadius: 24, marginBottom: 12,
  },
  statLabel: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#6B7280' },
  statValue: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: '#141414' },
  statSub: { fontFamily: 'DMSans-Medium', fontSize: 10, color: '#6B7280', paddingTop: 4 },

  // ── Chart card ──
  chartCard: {
    backgroundColor: Colors.white, borderRadius: 32, padding: 24, gap: 16,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  cardTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 18, color: '#1F2937' },
  chip: {
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: '#F9FAFB', borderRadius: 8,
  },
  chipText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#6B7280' },
  chartEmpty: { height: 140, alignItems: 'center', justifyContent: 'center' },
  chartFootnote: { fontFamily: 'DMSans-Regular', fontSize: 11, color: '#9CA3AF' },

  // ── Section headers ──
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: -16,   // absorbs the scroll container's 32px gap
  },
  sectionAside: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#6B7280' },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#999999' },
  viewAllChevron: { fontSize: 16, color: '#6B7280' },

  emptyCard: {
    backgroundColor: Colors.white, borderRadius: 32, padding: 24,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  emptyText: {
    fontFamily: 'DMSans-Regular', fontSize: 13, color: '#6B7280',
    textAlign: 'center', lineHeight: 19,
  },

  // ── Symptoms ──
  symptomRow: { gap: 10, paddingVertical: 4, paddingRight: 4 },
  symptomCard: {
    width: 128, height: 118, padding: 16, alignItems: 'center', gap: 4,
    backgroundColor: Colors.white, borderRadius: 32,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  symptomName: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#1F2937' },
  symptomPct: { fontFamily: 'DMSans-Regular', fontSize: 14, color: '#4B5563' },
  moreCard: {
    width: 96, height: 118, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 32,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  moreText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: '#6B7280' },

  // ── Timeline ──
  fab: {
    position: 'absolute', right: 24, bottom: 32,
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25, shadowRadius: 50, elevation: 12,
  },
  fabPlusH: { position: 'absolute', width: 15, height: 2.5, borderRadius: 2, backgroundColor: Colors.white },
  fabPlusV: { position: 'absolute', width: 2.5, height: 15, borderRadius: 2, backgroundColor: Colors.white },
});
