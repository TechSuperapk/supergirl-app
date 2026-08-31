/**
 * SleepHistoryScreen — Week/Month/Year filter over the same sleep records the
 * dashboard reads (§13, §35).
 *
 * The three tabs are genuinely different views, not one list with a different
 * cutoff: Week and Month list individual nights, Month adds the §13.2 summary
 * block, and Year rolls up into twelve monthly averages (§13.3) rather than
 * listing 365 rows nobody would scroll.
 */
import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { EntryActionSheet } from '../../components/EntryActionSheet';
import { useSleepTracker } from '../../hooks/useTrackers';
import {
  averageMinutes, fmtHrs, inRange, monthSummary, todayISO, toISO, weekRange, yearByMonth,
} from '../../utils/sleepAnalytics';
import { SleepEntry } from '../../types';

type Props = NativeStackScreenProps<any, 'SleepHistory'>;

type Range = 'week' | 'month' | 'year';

const PERIODS: { key: Range; label: string }[] = [
  { key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }, { key: 'year', label: 'Year' },
];
const ACCENT = '#7C7CE0';

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const relDay = (dateISO: string) => {
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (dateISO === todayISO()) return 'Today';
  if (dateISO === toISO(y)) return 'Yesterday';
  return new Date(dateISO + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
};

// ── Glyphs ───────────────────────────────────────────────────────────────────

const MoonGlyph = () => (
  <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
    <Path d="M16.5 12.6A7 7 0 0 1 7.4 3.5a7.3 7.3 0 1 0 9.1 9.1Z" fill="#8188F5" />
    <Path d="M13.6 4.2l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4Z" fill="#FFC531" />
  </Svg>
);
const SunGlyph = () => (
  <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={10} r={4.2} fill="#FFC531" />
    <Path
      d="M10 1.6v2.1M10 16.3v2.1M1.6 10h2.1M16.3 10h2.1M4 4l1.5 1.5M14.5 14.5 16 16M16 4l-1.5 1.5M5.5 14.5 4 16"
      stroke="#FFC531" strokeWidth={1.7} strokeLinecap="round"
    />
  </Svg>
);
const ChevronGlyph = () => (
  <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
    <Path d="M6 3.5 10.5 8 6 12.5" stroke="#D1D5DB" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const BarsGlyph = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={12} width={4} height={8} rx={1.6} fill={ACCENT} />
    <Rect x={10} y={8} width={4} height={12} rx={1.6} fill={ACCENT} />
    <Rect x={16} y={4} width={4} height={16} rx={1.6} fill={ACCENT} />
  </Svg>
);

export function SleepHistoryScreen({ navigation }: Props) {
  const { entries, refreshing, refresh, removeSleepEntry } = useSleepTracker();
  const [period, setPeriod] = useState<Range>('week');
  const [selected, setSelected] = useState<SleepEntry | null>(null);

  const month = useMemo(() => monthSummary(entries), [entries]);
  const year = useMemo(() => yearByMonth(entries), [entries]);

  /** Nights listed under the current tab. Year lists nothing — it aggregates. */
  const filtered = useMemo(() => {
    if (period === 'week') {
      const { start, end } = weekRange();
      return entries.filter(e => inRange(e, start, end));
    }
    if (period === 'month') return month.entries;
    return [];
  }, [entries, period, month]);

  const avgMins = period === 'year'
    ? averageMinutes(entries.filter(e => e.date.startsWith(`${new Date().getFullYear()}-`)))
    : averageMinutes(filtered);

  const yearHasData = year.some(m => m.nights > 0);
  const isEmpty = period === 'year' ? !yearHasData : filtered.length === 0;

  // Render immediately; the empty state covers "still loading" and "nothing
  // logged yet" alike, so a slow API never blocks the screen.
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>Sleep history</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ACCENT} />}
      >
        <View style={s.segWrap}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[s.seg, period === p.key && s.segActive]}
              activeOpacity={0.85}
              onPress={() => setPeriod(p.key)}
            >
              <AppText style={[s.segText, period === p.key && s.segTextActive]}>{p.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            <AppText style={s.summaryTitle}>This {period}</AppText>
            <AppText style={s.summaryAvg}>Avg: {fmtHrs(avgMins)}</AppText>
          </View>
        </View>

        {/* ── §13.2 month summary ── */}
        {period === 'month' && month.entries.length > 0 ? (
          <View style={s.statCard}>
            <SummaryLine label="Average Sleep" value={fmtHrs(month.averageMinutes)} />
            <SummaryLine
              label="Best Sleep"
              value={month.best ? fmtHrs(month.best.durationMins) : '—'}
            />
            <SummaryLine
              label="Lowest Sleep"
              value={month.lowest ? fmtHrs(month.lowest.durationMins) : '—'}
            />
            {/* Denominator is the days in the month, not the nights logged —
                otherwise a single perfect night reads as 1/1, a clean sweep. */}
            <SummaryLine
              label="Goal Achieved"
              value={`${month.goalAchieved} / ${month.daysInMonth} days`}
            />
            <SummaryLine
              label="Current Streak"
              value={`${month.streak} ${month.streak === 1 ? 'Night' : 'Nights'}`}
              last
            />
          </View>
        ) : null}

        {isEmpty ? (
          <AppEmptyState
            emoji="🛏️"
            title="No sleep logs yet"
            subtitle="Log a night's sleep to see it here."
            actionLabel="Log sleep"
            onAction={() => navigation.navigate('LogSleep')}
          />
        ) : period === 'year' ? (
          /* ── §13.3 twelve monthly averages ── */
          <View style={s.list}>
            {year.map(m => (
              <View key={m.month} style={[s.row, s.monthRow]}>
                <AppText style={s.monthName}>{m.label}</AppText>
                <AppText style={m.nights ? s.duration : s.monthEmpty}>
                  {m.nights ? fmtHrs(m.averageMinutes) : 'No data'}
                </AppText>
              </View>
            ))}
          </View>
        ) : (
          <View style={s.list}>
            {filtered.map(e => (
              <TouchableOpacity key={e.id} style={s.row} activeOpacity={0.85} onPress={() => setSelected(e)}>
                <View style={s.dayCol}>
                  <AppText style={s.dayName} numberOfLines={1}>{relDay(e.date)}</AppText>
                  <AppText style={s.dayDate}>
                    {e.date.slice(8, 10)}{' '}
                    {new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                  </AppText>
                </View>

                <View style={s.times}>
                  <View style={s.timeCell}>
                    <View style={[s.iconTile, { backgroundColor: '#EEF2FF', borderRadius: 999 }]}>
                      <MoonGlyph />
                    </View>
                    <View style={s.timeText}>
                      <AppText style={s.timeValue} numberOfLines={1}>{fmtTime(e.bedtime)}</AppText>
                      <AppText style={s.timeLabel}>Sleep</AppText>
                    </View>
                  </View>

                  <View style={s.timeCell}>
                    <View style={[s.iconTile, { backgroundColor: '#FFF8EE', borderRadius: 12 }]}>
                      <SunGlyph />
                    </View>
                    <View style={s.timeText}>
                      <AppText style={s.timeValue} numberOfLines={1}>{fmtTime(e.wakeTime)}</AppText>
                      <AppText style={s.timeLabel}>Wakeup</AppText>
                    </View>
                  </View>
                </View>

                <View style={s.durCol}>
                  <AppText style={s.duration}>{fmtHrs(e.durationMins)}</AppText>
                  <ChevronGlyph />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!isEmpty && (
          <View style={s.avgCard}>
            <View style={s.avgIcon}><BarsGlyph /></View>
            <View style={s.avgText}>
              <AppText style={s.avgTitle}>Your Average Sleep</AppText>
              <AppText style={s.avgGoal}>Goal: 7 - 9 hours</AppText>
            </View>
            <AppText style={s.avgValue}>{fmtHrs(avgMins)}</AppText>
          </View>
        )}
      </ScrollView>

      <EntryActionSheet
        visible={!!selected}
        title={selected
          ? new Date(selected.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })
          : undefined}
        subtitle={selected
          ? `${fmtTime(selected.bedtime)} → ${fmtTime(selected.wakeTime)} · ${fmtHrs(selected.durationMins)}`
          : undefined}
        onClose={() => setSelected(null)}
        onEdit={() => selected && navigation.navigate('LogSleep', { date: selected.date })}
        onDelete={() => selected && removeSleepEntry(selected.id)}
        deleteConfirmMessage="Delete this sleep log? This cannot be undone."
      />
    </SafeAreaView>
  );
}

/** One label/value line in the month summary block (§13.2). */
function SummaryLine({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.statLine, last && { borderBottomWidth: 0 }]}>
      <AppText style={s.statLabel}>{label}</AppText>
      <AppText style={s.statValue}>{value}</AppText>
    </View>
  );
}

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

  scroll: { paddingHorizontal: 20, paddingBottom: 60, gap: 16 },

  // ── Segmented filter ──
  segWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    padding: 6, backgroundColor: 'rgba(153,153,153,0.10)', borderRadius: 12,
  },
  seg: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  segActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  segText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#999999' },
  segTextActive: { color: '#141414' },

  // ── Range summary ──
  summaryCard: {
    backgroundColor: Colors.white, borderRadius: 30, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10, shadowRadius: 20, elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 5,
  },
  summaryTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: '#141414', textTransform: 'capitalize' },
  summaryAvg: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: 'rgba(20,20,20,0.60)' },

  // ── Month summary (§13.2) ──
  statCard: {
    paddingHorizontal: 16, borderRadius: 16,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 20, elevation: 2,
  },
  statLine: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: HAIRLINE,
  },
  statLabel: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#6B7280' },
  statValue: { fontFamily: 'DMSans-Bold', fontSize: 14, color: '#111827' },

  // ── Year rollup (§13.3) ──
  monthRow: { justifyContent: 'space-between', paddingHorizontal: 16 },
  monthName: { fontFamily: 'DMSans-SemiBold', fontSize: 15, color: '#111827' },
  monthEmpty: { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#C4C4C4' },

  // ── Night rows ──
  list: { gap: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16,
    borderWidth: 1, borderColor: HAIRLINE,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 20, elevation: 2,
  },
  dayCol: { width: 56, flexShrink: 0 },
  dayName: { fontFamily: 'DMSans-SemiBold', fontSize: 15, color: '#111827' },
  dayDate: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#9CA3AF' },

  times: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeCell: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconTile: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  timeText: { flex: 1, minWidth: 0 },
  timeValue: { fontFamily: 'DMSans-SemiBold', fontSize: 12, color: '#111827' },
  timeLabel: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#999999' },

  durCol: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  duration: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: ACCENT },

  // ── Average summary ──
  avgCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 20, borderRadius: 16,
    backgroundColor: 'rgba(124,124,224,0.10)',
    borderWidth: 1, borderColor: 'rgba(124,124,224,0.20)',
  },
  avgIcon: {
    padding: 10, borderRadius: 12, backgroundColor: '#F2F2FC',
    borderWidth: 1, borderColor: ACCENT,
  },
  avgText: { flex: 1, minWidth: 0 },
  avgTitle: { fontFamily: 'DMSans-Bold', fontSize: 14, color: '#111827' },
  avgGoal: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#6B7280' },
  avgValue: { fontFamily: 'DMSans-Bold', fontSize: 20, color: ACCENT },
});
