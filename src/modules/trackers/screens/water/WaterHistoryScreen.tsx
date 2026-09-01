/**
 * WaterHistoryScreen — Week/Month/Year/All filter with a steppable period
 * label, an average/best-day/total summary, a daily-litres bar chart, and a
 * recent-days list showing each day's % of goal.
 */
import React, { useMemo, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, Pressable, RefreshControl, StyleSheet, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { DatePickerSheet } from '../../components/HabitOverlays';
import { useWaterTracker } from '../../hooks/useTrackers';
import {
  bestMonth, consistencyMessage, fmtL, goalPercentage, periodStats, startOfWeek,
  todayISO, yearByMonth,
} from '../../utils/waterAnalytics';
import { WaterPeriod } from '../../types';

type Props = NativeStackScreenProps<any, 'WaterHistory'>;

const PERIODS: { key: WaterPeriod; label: string }[] = [
  { key: 'week',  label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year',  label: 'Year' },
  { key: 'all',   label: 'All' },
];
const fmtDay = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
const fmtShortDay = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// ── Glyphs ───────────────────────────────────────────────────────────────────

const CalendarGlyph = ({ size = 26 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={3.5} y={5} width={17} height={15.5} rx={2.5} stroke="#141414" strokeWidth={1.5} />
    <Path d="M3.5 10h17M8 3v4M16 3v4" stroke="#141414" strokeWidth={1.5} strokeLinecap="round" />
    {[8, 12, 16].map(cx => [13.5, 17].map(cy => (
      <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={0.85} fill="#141414" />
    )))}
  </Svg>
);
const ChevronGlyph = ({ dir }: { dir: 'left' | 'right' }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
      stroke="#141414" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);
const DropletGlyph = ({ size = 22 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="histDrop" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#7FC3F7" />
        <Stop offset="1" stopColor="#2E90FA" />
      </LinearGradient>
    </Defs>
    <Path
      d="M12 2.6c2.6 2 7 5.9 7 10.1a7 7 0 0 1-14 0c0-4.2 4.4-8.1 7-10.1Z"
      fill="url(#histDrop)"
    />
  </Svg>
);
const StarGlyph = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path
      d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6.1L12 16.8 6.7 19.7l1.1-6.1L3.4 9.4l6-.8L12 3Z"
      fill="#FFC531"
    />
  </Svg>
);

/**
 * Daily-litres bars. Scrolls horizontally because a month is 31 bars — at a
 * fixed width they'd be sub-pixel. Only every 7th day is labelled so the axis
 * stays readable.
 *
 * Tapping a bar moves the value callout to it. The callout starts on the best
 * day so the chart says something useful before it's touched.
 */
function LitresChart({
  data, goalL, width, selected, onSelect, labelEvery = 7,
}: {
  /** `label` overrides the axis tick; the month view derives it from the date. */
  data: { date: string; litres: number; label?: string }[];
  goalL: number;
  width: number;
  /** 1 for the year view — twelve bars can all be labelled. */
  labelEvery?: number;
  /** Controlled by the screen so the calendar can highlight a chosen day. */
  selected: string | null;
  onSelect: (date: string | null) => void;
}) {
  const AXIS_W = 34;
  const PLOT_H = 168;
  const BAR_W = 8;
  const GAP = 8;

  const values = data.map(d => d.litres);
  const peak = Math.max(goalL, ...values, 1);
  // Round the axis up to a clean 0.5 L step so gridline labels aren't fractional.
  const top = Math.ceil(peak * 2) / 2;
  const ticks = [top, top * 0.66, top * 0.33, 0];

  const plotW = Math.max(width - AXIS_W, data.length * (BAR_W + GAP));
  const bestIdx = values.reduce((b, v, i) => (v > values[b] ? i : b), 0);

  // A selection outside the current window falls back to the best day, so the
  // callout can never point at a bar that isn't drawn.
  const pickedIdx = selected ? data.findIndex(d => d.date === selected) : -1;
  const shownIdx = pickedIdx >= 0 ? pickedIdx : bestIdx;

  return (
    <View style={{ flexDirection: 'row' }}>
      <View style={[s.axis, { height: PLOT_H + 26 }]}>
        {ticks.map((t, i) => (
          <AppText key={i} style={s.axisLabel}>
            {t === 0 ? '0' : t.toFixed(1)}
          </AppText>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: plotW }}>
          <View style={[s.plot, { height: PLOT_H }]}>
            {data.map((d, i) => {
              const h = Math.max(2, (d.litres / top) * (PLOT_H - 24));
              const met = d.litres >= goalL;
              const on = i === shownIdx && d.litres > 0;
              return (
                <Pressable
                  key={d.date}
                  // Tapping the shown bar again returns the callout to the best
                  // day, so there's always a way back to the default.
                  onPress={() => onSelect(selected === d.date ? null : d.date)}
                  // The bar is 8px wide; the column plus hitSlop is what makes
                  // it reliably tappable.
                  hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
                  style={{ width: BAR_W + GAP, alignItems: 'center', justifyContent: 'flex-end', height: PLOT_H }}
                >
                  {on ? (
                    <View style={[s.callout, { bottom: h + 8 }]} pointerEvents="none">
                      <AppText style={s.calloutText}>{d.litres.toFixed(1)} L</AppText>
                      <AppText style={s.calloutDay}>{d.label ?? fmtShortDay(d.date)}</AppText>
                    </View>
                  ) : null}
                  <View
                    style={[
                      s.bar,
                      { height: h, backgroundColor: met ? '#3A80FA' : '#A9C9FB' },
                      on && s.barActive,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={s.xAxis}>
            {data.map((d, i) => (
              <View key={d.date} style={{ width: BAR_W + GAP, alignItems: 'center' }}>
                {/* Every Nth plus the last, so the axis doesn't turn to mush. */}
                {i % labelEvery === 0 || i === data.length - 1 ? (
                  <AppText style={s.xLabel}>{d.label ?? Number(d.date.slice(8, 10))}</AppText>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export function WaterHistoryScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const { logs, refreshing, refresh, goalMl } = useWaterTracker();

  const [period, setPeriod] = useState<WaterPeriod>('month');
  /** 0 = current window, -1 = one earlier, and so on. */
  const [offset, setOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Reset the stepper when the granularity changes — "3 months back" is
  // meaningless once you switch to Year.
  const changePeriod = (p: WaterPeriod) => { setPeriod(p); setOffset(0); setSelectedDate(null); };

  /** Monday-start, shared with the analytics module so the two agree. */
  const weekStart = startOfWeek;

  /**
   * Jump the window to whatever date the calendar returned, and highlight that
   * day in the chart. The offset needed depends on the current granularity,
   * so it's derived rather than assumed.
   */
  const jumpToDate = (iso: string) => {
    const target = new Date(iso + 'T00:00:00');
    const now = new Date();

    if (period === 'week') {
      const diffDays = Math.round(
        (weekStart(target).getTime() - weekStart(now).getTime()) / 86400000,
      );
      setOffset(Math.round(diffDays / 7));
    } else if (period === 'year') {
      setOffset(target.getFullYear() - now.getFullYear());
    } else if (period === 'month') {
      setOffset(
        (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()),
      );
    }
    // 'all' already covers every date, so only the highlight changes.

    setSelectedDate(iso);
  };

  /** All figures for the window, from the shared module (§27). */
  const stats = useMemo(
    () => periodStats(logs, period, goalMl, offset),
    [logs, period, goalMl, offset],
  );

  /**
   * §11 — the Year view aggregates into twelve months rather than listing
   * every day. A year of daily bars is 365 sub-pixel slivers and a list nobody
   * scrolls to the bottom of.
   */
  const isYear = period === 'year';
  const months = useMemo(() => (isYear ? yearByMonth(logs, offset) : []), [logs, isYear, offset]);
  const topMonth = useMemo(() => bestMonth(months), [months]);

  /** Newest first, for the recent-days list. */
  const days = useMemo(
    () => stats.daily.slice().reverse().map(d => [d.date, d.ml] as [string, number]),
    [stats],
  );

  const chartData = useMemo(
    () => (isYear
      ? months.map(m => ({
          // Synthetic key: the chart is keyed by date string, and a month
          // bucket has no single date of its own. `label` carries the month
          // name, since day-of-month would read "1" for all twelve.
          date: `${new Date().getFullYear() + offset}-${String(m.month + 1).padStart(2, '0')}-01`,
          litres: Math.round((m.totalMl / 1000) * 10) / 10,
          label: m.label,
        }))
      : stats.daily.map(d => ({ date: d.date, litres: d.litres }))),
    [isYear, months, stats, offset],
  );

  const message = consistencyMessage(stats);

  const canGoForward = offset < 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>Water History</AppText>
        <TouchableOpacity style={s.hBtn} hitSlop={8} onPress={() => setCalendarOpen(true)}>
          <CalendarGlyph size={26} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#3A80FA" />
        }
      >
        {/* ── Period filter ── */}
        <View style={s.segmented}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[s.seg, period === p.key && s.segOn]}
              activeOpacity={0.85}
              onPress={() => changePeriod(p.key)}
            >
              <AppText style={[s.segText, period === p.key && s.segTextOn]}>{p.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Window stepper ── */}
        {period !== 'all' ? (
          <View style={s.stepper}>
            <TouchableOpacity onPress={() => { setOffset(o => o - 1); setSelectedDate(null); }} hitSlop={10}>
              <ChevronGlyph dir="left" />
            </TouchableOpacity>
            <AppText style={s.stepperLabel}>{stats.label}</AppText>
            {/* Forward is disabled at the present window — there's no future data. */}
            <TouchableOpacity
              onPress={() => { if (canGoForward) { setOffset(o => o + 1); setSelectedDate(null); } }}
              disabled={!canGoForward}
              hitSlop={10}
              style={!canGoForward && s.stepperDisabled}
            >
              <ChevronGlyph dir="right" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.stepper}><AppText style={s.stepperLabel}>{stats.label}</AppText></View>
        )}

        {/* ── Summary ── */}
        <View style={s.summaryCard}>
          <Summary
            label="Average"
            value={stats.loggedDays ? fmtL(stats.averageMl) : '—'}
            sub={stats.loggedDays ? `${stats.goalPercentage}% of goal` : 'No data'}
          />
          {/* Year reports its best month; every other range, its best day. */}
          <Summary
            label={isYear ? 'Best month' : 'Best day'}
            value={isYear
              ? (topMonth ? fmtL(topMonth.totalMl) : '—')
              : (stats.bestDayMl ? fmtL(stats.bestDayMl) : '—')}
            sub={isYear
              ? (topMonth ? topMonth.label : '—')
              : (stats.bestDate ? fmtShortDay(stats.bestDate) : '—')}
          />
          {/* Days in the period, not days logged — "4 Days" for a month the
              user has logged four times reads as a four-day month (§9.2). */}
          <Summary
            label="Total"
            value={stats.loggedDays ? fmtL(stats.totalMl) : '—'}
            sub={`${stats.periodDays} ${stats.periodDays === 1 ? 'Day' : 'Days'}`}
          />
        </View>

        {/* ── Chart ── */}
        <View style={s.chartCard}>
          <AppText style={s.chartTitle}>Liters (L)</AppText>
          {/* Gate on days logged, not chart length: the year view always emits
              twelve buckets, so an untouched year would draw twelve flat bars
              instead of admitting there's nothing there. */}
          {stats.loggedDays === 0 ? (
            <View style={s.chartEmpty}>
              <AppText style={s.emptyText}>Nothing logged in this period.</AppText>
            </View>
          ) : (
            <LitresChart
              data={chartData}
              // A monthly bar is a whole month's total, so a daily goal line
              // across it would sit almost on the floor and mean nothing.
              goalL={isYear ? 0 : goalMl / 1000}
              width={width - 40 - 20}
              labelEvery={isYear ? 1 : 7}
              selected={selectedDate}
              onSelect={setSelectedDate}
            />
          )}
        </View>

        {/* ── Monthly breakdown (§11) or recent days (§9.4) ── */}
        <AppText style={s.sectionTitle}>{isYear ? 'By month' : 'Recent days'}</AppText>
        {isYear ? (
          <View style={s.listCard}>
            {months.map((m, i) => (
              <View key={m.month} style={[s.listRow, i > 0 && s.listRowDivided]}>
                <View style={s.listLeft}>
                  <DropletGlyph />
                  <AppText style={s.listDate}>{m.label}</AppText>
                </View>
                <AppText style={m.loggedDays ? s.listValue : s.listMuted}>
                  {m.loggedDays ? fmtL(m.totalMl) : 'No data'}
                </AppText>
                <AppText style={s.listPct}>
                  {m.loggedDays ? `${m.loggedDays}d` : ''}
                </AppText>
              </View>
            ))}
          </View>
        ) : days.length === 0 ? (
          <View style={s.emptyCard}>
            <AppText style={s.emptyText}>No days logged yet in this period.</AppText>
          </View>
        ) : (
          <View style={s.listCard}>
            {days.slice(0, 5).map(([date, ml], i) => {
              const pct = goalPercentage(ml, goalMl);
              return (
                <View
                  key={date}
                  style={[
                    s.listRow,
                    i > 0 && s.listRowDivided,
                    date === selectedDate && s.listRowActive,
                  ]}
                >
                  <View style={s.listLeft}>
                    <DropletGlyph />
                    <AppText style={s.listDate} numberOfLines={1}>
                      {date === todayISO() ? 'Today' : fmtDay(date)}
                    </AppText>
                  </View>
                  <AppText style={s.listValue}>{fmtL(ml)}</AppText>
                  {/* Green only past 100% — the goal being met is the signal. */}
                  <AppText style={[s.listPct, pct >= 100 && s.listPctMet]}>{pct}%</AppText>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Encouragement (§9.5) ──
            Keyed to what actually happened. Congratulating someone on
            consistency they haven't shown is worse than saying nothing. */}
        <View style={s.encourageCard}>
          <View style={s.encourageIcon}><StarGlyph /></View>
          <View style={s.encourageText}>
            <AppText style={s.encourageTitle}>{message.title}</AppText>
            <AppText style={s.encourageSub}>{message.body}</AppText>
          </View>
        </View>
      </ScrollView>

      <DatePickerSheet
        visible={calendarOpen}
        title="Jump to date"
        value={selectedDate ?? todayISO()}
        onConfirm={jumpToDate}
        onClose={() => setCalendarOpen(false)}
      />
    </SafeAreaView>
  );
}

function Summary({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={s.summaryCol}>
      <AppText style={s.summaryLabel} numberOfLines={1}>{label}</AppText>
      <AppText style={s.summaryValue} numberOfLines={1}>{value}</AppText>
      <AppText style={s.summarySub} numberOfLines={1}>{sub}</AppText>
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
    paddingHorizontal: 20, paddingVertical: 12,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },

  // ── Filter ──
  // Flat — no card, shadow or border behind the filter row.
  segmented: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 44, padding: 4, borderRadius: 30,
  },
  seg: {
    flex: 1, alignSelf: 'stretch', borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  segOn: { backgroundColor: '#141414' },
  segText: {
    fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16,
    color: '#494453', letterSpacing: 0.12,
  },
  segTextOn: { color: Colors.white },

  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20,
    paddingVertical: 4,
  },
  stepperLabel: {
    minWidth: 150, textAlign: 'center',
    fontFamily: 'DMSans-SemiBold', fontSize: 20, color: '#141414',
  },
  stepperDisabled: { opacity: 0.25 },

  // ── Summary ──
  summaryCard: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 30,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE,
  },
  summaryCol: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4 },
  summaryLabel: { fontFamily: 'DMSans-Medium', fontSize: 17, color: '#666666' },
  summaryValue: { fontFamily: 'DMSans-SemiBold', fontSize: 22, color: '#141414' },
  summarySub: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#4E4E4E' },

  // ── Chart ──
  chartCard: {
    paddingHorizontal: 10, paddingVertical: 20, gap: 20, borderRadius: 30,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  chartTitle: { fontFamily: 'DMSans-Medium', fontSize: 18, color: '#141414' },
  chartEmpty: { height: 140, alignItems: 'center', justifyContent: 'center' },
  axis: { width: 34, justifyContent: 'space-between', paddingBottom: 26 },
  axisLabel: {
    fontFamily: 'DMSans-Medium', fontSize: 14, color: '#141414', textAlign: 'center',
  },
  plot: { flexDirection: 'row', alignItems: 'flex-end' },
  bar: { width: 8, borderTopLeftRadius: 50, borderTopRightRadius: 50 },
  callout: {
    position: 'absolute', minWidth: 54, zIndex: 2,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  calloutText: {
    fontFamily: 'DMSans-SemiBold', fontSize: 12, color: '#141414', textAlign: 'center',
  },
  calloutDay: {
    fontFamily: 'DMSans-Regular', fontSize: 9, color: '#999999', textAlign: 'center',
  },
  // Darker + wider so the tapped bar is identifiable behind the callout.
  barActive: { backgroundColor: '#1F5FD1', width: 10 },
  xAxis: { flexDirection: 'row', height: 26, paddingTop: 6 },
  xLabel: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#141414' },

  // ── Recent days ──
  sectionTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 22, color: '#141414' },
  listCard: {
    borderRadius: 30, overflow: 'hidden',
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  listRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, gap: 8,
  },
  listRowDivided: { borderTopWidth: 1, borderTopColor: HAIRLINE },
  listRowActive: { backgroundColor: '#EFF5FF' },
  listLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  listDate: { flexShrink: 1, fontFamily: 'DMSans-Medium', fontSize: 15, color: '#141414' },
  listValue: {
    width: 56, textAlign: 'right',
    fontFamily: 'DMSans-SemiBold', fontSize: 17, color: '#141414',
  },
  listPct: {
    width: 54, textAlign: 'right',
    fontFamily: 'DMSans-SemiBold', fontSize: 17, color: '#141414',
  },
  listPctMet: { color: '#419F4E' },
  listMuted: {
    width: 56, textAlign: 'right',
    fontFamily: 'DMSans-Medium', fontSize: 14, color: '#C4C4C4',
  },

  emptyCard: {
    padding: 24, borderRadius: 30,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE,
  },
  emptyText: {
    fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 19,
    color: '#6B7280', textAlign: 'center',
  },

  // ── Encouragement ──
  encourageCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 30,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  encourageIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#000000',
    alignItems: 'center', justifyContent: 'center',
  },
  encourageText: { flex: 1, minWidth: 0, gap: 2 },
  encourageTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 18, color: '#141414' },
  encourageSub: { fontFamily: 'DMSans-SemiBold', fontSize: 15, color: '#999999' },
});
