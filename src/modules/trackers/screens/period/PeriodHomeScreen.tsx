/**
 * PeriodHomeScreen — cycle ring (day, phase, days-to-next-period), month
 * calendar colour-coded for period / fertile / ovulation days, today's summary,
 * quick actions and the log CTA.
 *
 * Calendar day states are derived from real cycle data, not hardcoded: period
 * days come from logged entries, the fertile window and ovulation day from the
 * prediction, so the colours stay correct as cycles shift.
 */
import React, { useMemo, useState } from 'react';
import { useGridCellWidth } from '../../../../shared/hooks/useGridCellWidth';
import {
  View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
  StyleSheet, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop, SvgProps } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { Spacing } from '../../../../shared/theme/spacing';
import { usePeriodTracker } from '../../hooks/useTrackers';
import FlowIcon      from '../../components/FlowIcon';
import SympotomsIcon from '../../components/SympotomsIcon';
import SmileIcon     from '../../components/SmileIcon';
import NotesIcon     from '../../components/NotesIcon';
import HeartIcon     from '../../components/HeartIcon';
import DatalogsIcon  from '../../components/DatalogsIcon';
import PageflipIcon  from '../../components/PageflipIcon';
import EditcycleIcon from '../../components/EditcycleIcon';

type Props = NativeStackScreenProps<any, 'PeriodHome'>;

import { toISO as iso, todayISO } from '../../utils/periodAnalytics';

const PHASE_LABEL: Record<string, string> = {
  menstrual: 'MENSTRUAL PHASE',
  follicular: 'FOLLICULAR PHASE',
  ovulation: 'OVULATION',
  luteal: 'LUTEAL PHASE',
};
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Gradient progress ring — 248px outer with a 19px band, per the spec. */
const RING_STROKE = 19;

function CycleRing({
  pct, size = 248, children,
}: { pct: number; size?: number; children: React.ReactNode }) {
  // r is measured to the centre of the stroke, so the painted band runs from
  // r - stroke/2 to r + stroke/2 and the outer edge lands exactly on `size`.
  const r = (size - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, pct));
  // Derived from the stroke rather than hardcoded, so the white disc always
  // meets the inside edge of the band no matter what size the ring is.
  const inner = size - RING_STROKE * 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="cycleGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FF2A2A" />
            <Stop offset="1" stopColor="#FFB835" />
          </LinearGradient>
        </Defs>

        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="rgba(153,153,153,0.10)" strokeWidth={RING_STROKE} fill="none"
        />

        {/* Skipped entirely at zero: a round linecap on a zero-length dash
            still paints a stray dot at 12 o'clock. */}
        {progress > 0 ? (
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke="url(#cycleGrad)" strokeWidth={RING_STROKE} fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            // Butt cap at a full lap — a round cap would overshoot the start
            // and leave a visible bulge where the two ends meet.
            strokeLinecap={progress >= 0.999 ? 'butt' : 'round'}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>

      {/* Overlaid rather than laid out in flow, so the disc is exactly
          concentric with the arc regardless of the content inside it. */}
      <View style={[StyleSheet.absoluteFill, s.ringCentre]} pointerEvents="box-none">
        <View style={[s.ringInner, { width: inner, height: inner, borderRadius: inner / 2 }]}>
          {children}
        </View>
      </View>
    </View>
  );
}

export function PeriodHomeScreen({ navigation }: Props) {
  // Whole-pixel calendar columns — a %-width 7th cell wraps on Android,
  // which is what left the Sunday column empty. See useGridCellWidth.
  const { onLayout: onGridLayout, cellWidth } = useGridCellWidth(7);
  const {
    entries, loading, refreshing, refresh, error, prediction, activePeriod,
    currentCycleDay, phase, fertileWindow, ovulationDate, todayLog,
    predictedPeriodDays, loggedPeriodDays, hasHistory, currentCycle,
  } = usePeriodTracker();

  const today = todayISO();
  const [monthOffset, setMonthOffset] = useState(0);

  // 248 is the design size; clamped so the ring never crowds the screen edge
  // on a small device (and never inflates on a tablet).
  const { width: winW } = useWindowDimensions();
  const ringSize = Math.max(200, Math.min(248, winW - 96));

  const daysToNext = prediction.nextStart
    ? Math.ceil((new Date(prediction.nextStart + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000)
    : null;
  const pct = currentCycleDay && prediction.cycleLength
    ? Math.min(1, currentCycleDay / prediction.cycleLength)
    : 0;

  // ── Calendar (Monday-first) ──
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear();
  const month = base.getMonth();
  const monthLabel = base.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  /** Every date covered by a logged period, for red highlighting. */
  const periodDays = loggedPeriodDays;

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7;            // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: { date: string; inMonth: boolean }[] = [];
    for (let i = lead; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      out.push({ date: iso(d), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, inMonth: true });
    }
    while (out.length % 7 !== 0) {
      const d = new Date(year, month, daysInMonth + (out.length % 7));
      out.push({ date: iso(d), inMonth: false });
    }
    return out;
  }, [year, month]);

  const inFertile = (d: string) =>
    !!fertileWindow && d >= fertileWindow.start && d <= fertileWindow.end;

  /**
   * Every date opens the same day screen — including future ones, which show
   * the estimate for that day rather than a dead tap. The day screen decides
   * whether to show a log or a "no entry" state.
   */
  const openDay = (date: string) => navigation.navigate('PeriodDayDetail', { date });

  const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}>
        <AppText style={s.backArrow}>←</AppText>
      </TouchableOpacity>
      <AppText style={s.headerTitle}>Period Tracker</AppText>
      <View style={s.hBtn} />
    </View>
  );

  // ── §6 loading ─────────────────────────────────────────────────────────────
  if (loading && !hasHistory) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <View style={s.centre}>
          <ActivityIndicator color="#FF4545" />
          <AppText style={s.centreText}>Loading your cycle…</AppText>
        </View>
      </SafeAreaView>
    );
  }

  // ── §6/§11 error — retry without losing what's on screen ───────────────────
  if (error && !hasHistory) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <View style={s.centre}>
          <AppText style={s.centreTitle}>Unable to load your cycle data.</AppText>
          <AppText style={s.centreText}>Please try again.</AppText>
          <TouchableOpacity style={s.retryBtn} activeOpacity={0.9} onPress={refresh}>
            <AppText style={s.retryText}>Retry</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {header}

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#FF4545" />}
      >
        {/* Cycle data is already on screen, so this is a failed refresh rather
            than a dead end — inline, with a retry. */}
        {error ? (
          <View style={s.errorBanner}>
            <AppText variant="caption" color={Colors.error}>{error}</AppText>
            <TouchableOpacity onPress={refresh} hitSlop={8}>
              <AppText style={s.errorRetry}>Retry</AppText>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Nothing tracked yet — an invitation rather than a wall of dashes. */}
        {!hasHistory ? (
          <View style={s.emptyCard}>
            <AppText style={s.emptyTitle}>Start tracking your cycle</AppText>
            <AppText style={s.emptySub}>Log your period to start seeing your cycle patterns.</AppText>
            <TouchableOpacity
              style={s.emptyCta}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('LogPeriod', { date: today })}
            >
              <AppText style={s.ctaText}>Log Period</AppText>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Cycle ring — tap through for the full breakdown. */}
        <TouchableOpacity
          style={s.ringWrap}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('CycleDetails')}
        >
          <CycleRing pct={pct} size={ringSize}>
            <View style={s.ringTop}>
              {/* Abbreviated month and one line only — "September 30, 2026"
                  spelled out is wider than the disc and would wrap. */}
              <AppText style={s.ringDate} numberOfLines={1}>
                {new Date(today + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </AppText>
              <AppText style={s.ringDay}>{currentCycleDay ? `Day ${currentCycleDay}` : '—'}</AppText>
              {phase ? <AppText style={s.ringPhase} numberOfLines={1}>{PHASE_LABEL[phase]}</AppText> : null}
            </View>

            <View style={s.ringDivider} />

            <View style={s.ringBottom}>
              <View style={s.ringNextRow}>
                <AppText style={s.ringSpark}>✦</AppText>
                <AppText style={s.ringNextLbl}>{activePeriod ? 'Period ongoing' : 'Next Period'}</AppText>
              </View>
              {!activePeriod && daysToNext != null ? (
                <AppText style={s.ringNextVal}>in {daysToNext} Days</AppText>
              ) : null}
            </View>
          </CycleRing>
        </TouchableOpacity>

        {/* Calendar */}
        <View style={s.calCard}>
          <View style={s.calHeader}>
            <TouchableOpacity onPress={() => setMonthOffset(o => o - 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <AppText style={s.calArrow}>‹</AppText>
            </TouchableOpacity>
            <AppText style={s.calMonth}>{monthLabel}</AppText>
            {/* Forward navigation is allowed so predicted period days are
                visible ahead of time; capped at +12 months so the estimate
                never runs further than the history can support. */}
            <TouchableOpacity
              onPress={() => setMonthOffset(o => Math.min(12, o + 1))}
              disabled={monthOffset >= 12}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AppText style={[s.calArrow, monthOffset >= 12 && { opacity: 0.3 }]}>›</AppText>
            </TouchableOpacity>
          </View>

          {monthOffset !== 0 ? (
            <TouchableOpacity style={s.todayChip} activeOpacity={0.85} onPress={() => setMonthOffset(0)}>
              <AppText style={s.todayChipText}>Today</AppText>
            </TouchableOpacity>
          ) : null}

          <View style={s.calRow}>
            {WEEKDAYS.map(d => <AppText key={d} style={[s.calWeekday, { width: cellWidth }]}>{d}</AppText>)}
          </View>

          <View style={s.calGrid} onLayout={onGridLayout}>
            {cells.map(({ date, inMonth }) => {
              const dayNum = Number(date.slice(-2));
              const isToday = date === today;
              const isPeriod = periodDays.has(date);
              // A logged day always wins over an estimate for the same date.
              const isPredicted = !isPeriod && predictedPeriodDays.has(date);
              const isOvulation = date === ovulationDate;
              const isFertile = !isOvulation && inFertile(date);

              const pill =
                isToday ? s.pillToday
                : isPeriod ? s.pillPeriod
                : isPredicted ? s.pillPredicted
                : isOvulation ? s.pillOvulation
                : isFertile ? s.pillFertile
                : null;

              const txt =
                !inMonth ? s.dayMuted
                : isToday ? s.dayToday
                : isPeriod ? s.dayPeriod
                : isPredicted ? s.dayPredicted
                : isOvulation ? s.dayOvulation
                : s.dayNormal;

              return (
                <TouchableOpacity
                  key={date}
                  style={[s.calCell, { width: cellWidth }]}
                  activeOpacity={inMonth ? 0.7 : 1}
                  disabled={!inMonth}
                  onPress={() => openDay(date)}
                >
                  <View style={[s.dayPill, pill, !inMonth && { backgroundColor: 'transparent', borderWidth: 0 }]}>
                    <AppText style={txt}>{dayNum}</AppText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={s.legend}>
            <LegendKey color="#FFDBDB" label="Period" />
            <LegendKey color="#FFF0F0" label="Estimated" />
            <LegendKey color="#FEF7E8" label="Fertile" />
            <LegendKey color={Colors.white} border="#FF9F43" label="Ovulation" />
          </View>
        </View>

        {/* Today's Summary */}
        <View style={s.summaryCard}>
          <View style={s.rowBetween}>
            <AppText style={s.summaryTitle}>Today's Summary</AppText>
            <TouchableOpacity
              style={s.viewMoreRow}
              onPress={() => todayLog
                ? navigation.navigate('PeriodDayDetail', { date: today })
                : navigation.navigate('PeriodHistory')}
            >
              <AppText style={s.viewMore}>View More</AppText>
              <AppText style={s.viewMoreChevron}>›</AppText>
            </TouchableOpacity>
          </View>

          <View style={s.summaryRow}>
            <SummaryCell
              Icon={FlowIcon} bg="#FEF2F2" tint="#FE5151"
              label="Flow" value={todayLog ? cap(todayLog.flow) : '—'}
            />
            <SummaryCell
              Icon={SympotomsIcon} bg="#FAF5FF" tint="#A855F7"
              label="Symptoms" value={todayLog?.symptoms.length ? `${todayLog.symptoms.length} Logged` : '—'}
            />
            <SummaryCell
              Icon={SmileIcon} bg="rgba(255,168,47,0.10)" tint="#FFA82F"
              label="Mood" value={todayLog?.mood ? cap(todayLog.mood) : '—'}
            />
            <SummaryCell
              Icon={NotesIcon} bg="#EFF6FF" tint="#2563EB"
              label="Notes" value={todayLog?.notes ? '1 Added' : '—'}
            />
          </View>
        </View>

        {/* Quick actions */}
        <View style={s.actionsWrap}>
          <ActionCard
            Icon={HeartIcon} bg="#FDF2F8" label="Log Today"
            onPress={() => navigation.navigate('LogPeriod', { date: today })}
          />
          <ActionCard
            Icon={DatalogsIcon} bg="rgba(155,63,255,0.10)" label="Insights"
            onPress={() => navigation.navigate('PeriodInsights')}
          />
          <ActionCard
            Icon={PageflipIcon} bg="#FFF7ED" label="History"
            onPress={() => navigation.navigate('PeriodHistory')}
          />
          <ActionCard
            Icon={EditcycleIcon} bg="#EFF6FF" label="Edit Cycle"
            onPress={() => navigation.navigate('EditCycle', { id: currentCycle?.id })}
          />
        </View>

        <TouchableOpacity
          style={s.cta}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('LogPeriod', { date: today })}
        >
          {/* Always "Log Today's Entry", always the log screen — the label
              doesn't change once today has an entry. */}
          <AppText style={s.ctaText}>Log Today's Entry</AppText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCell({
  Icon, bg, tint, label, value,
}: {
  Icon: React.ComponentType<SvgProps>;
  bg: string; tint: string; label: string; value: string;
}) {
  return (
    <View style={s.summaryCell}>
      {/* Each icon already carries its own brand stroke, matching `tint`. */}
      <View style={[s.summaryIcon, { backgroundColor: bg }]}>
        <Icon width={20} height={20} />
      </View>
      <AppText style={s.summaryLabel}>{label}</AppText>
      <AppText style={[s.summaryValue, { color: tint }]} numberOfLines={1}>{value}</AppText>
    </View>
  );
}

function LegendKey({ color, border, label }: { color: string; border?: string; label: string }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: color }, border ? { borderWidth: 1.5, borderColor: border } : null]} />
      <AppText style={s.legendText}>{label}</AppText>
    </View>
  );
}

function ActionCard({
  Icon, bg, label, onPress,
}: {
  Icon: React.ComponentType<SvgProps>;
  bg: string; label: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.actionCard} activeOpacity={0.85} onPress={onPress}>
      <View style={[s.actionIcon, { backgroundColor: bg }]}>
        <Icon width={20} height={20} />
      </View>
      <AppText style={s.actionLabel}>{label}</AppText>
    </TouchableOpacity>
  );
}

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
  scroll: { paddingBottom: 40 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorRetry: { fontFamily: 'DMSans-Bold', fontSize: 13, color: '#141414' },

  // ── Loading / error (§6) ──
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

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    backgroundColor: '#FDE7EA', borderRadius: 12, padding: Spacing.md,
    marginHorizontal: 20, marginBottom: Spacing.sm,
  },

  // ── Ring ──
  ringWrap: { alignItems: 'center', paddingVertical: 20 },
  ringCentre: { alignItems: 'center', justifyContent: 'center' },
  ringInner: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white,
    // A circle's usable width shrinks towards the top and bottom, so the
    // content is inset well clear of the curve rather than the ring's edge.
    paddingHorizontal: 26,
  },
  ringTop: { alignItems: 'center', alignSelf: 'stretch' },
  // Fixed-width rule. A borderBottom on the block took the width of whatever
  // text happened to be longest, so it changed length as the date changed.
  ringDivider: {
    width: 120, height: 1,
    backgroundColor: 'rgba(153,153,153,0.20)',
    marginVertical: 10,
  },
  ringDate: {
    fontFamily: 'DMSans-Medium', fontSize: 14, lineHeight: 18,
    color: '#9CA3AF', textAlign: 'center',
  },
  ringDay: {
    fontFamily: 'DMSans-Bold', fontSize: 36, lineHeight: 44,
    color: '#141414', includeFontPadding: false,
  },
  ringPhase: { fontFamily: 'DMSans-SemiBold', fontSize: 14, lineHeight: 18, color: '#FF5E5E' },
  ringBottom: { alignItems: 'center' },
  ringNextRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ringSpark:   { fontSize: 14, color: '#F87171' },
  ringNextLbl: { fontFamily: 'DMSans-Medium', fontSize: 14, lineHeight: 18, color: '#1F2937' },
  ringNextVal: {
    fontFamily: 'DMSans-Bold', fontSize: 18, lineHeight: 24,
    color: '#141414', paddingTop: 2,
  },

  // ── Calendar ──
  calCard: {
    marginHorizontal: 20, backgroundColor: Colors.white, borderRadius: 30,
    paddingTop: 24, paddingBottom: 24, paddingHorizontal: 24,
    borderWidth: 1, borderColor: 'rgba(153,153,153,0.20)', ...CARD_SHADOW,
  },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  calArrow: { fontSize: 22, color: '#9CA3AF' },
  calMonth: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: '#141414' },
  calRow: { flexDirection: 'row' },
  calWeekday: {
    textAlign: 'center',
    fontFamily: 'DMSans-Medium', fontSize: 14, color: '#999999',
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  calCell: { alignItems: 'center', paddingVertical: 5 },
  dayPill: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  pillPeriod:    { backgroundColor: '#FFDBDB' },
  pillToday:     { backgroundColor: '#FF4545' },
  pillFertile:   { backgroundColor: '#FEF7E8' },
  pillOvulation: { borderColor: '#FF9F43' },
  // Softer than a logged period, and dashed, so an estimate never reads as a
  // day the user actually recorded.
  pillPredicted: { backgroundColor: '#FFF0F0', borderColor: '#FFC9C9', borderStyle: 'dashed' },
  dayNormal:    { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#141414' },
  dayMuted:     { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#D1D5DB' },
  dayPeriod:    { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: '#FF4545' },
  dayPredicted: { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#F98080' },
  dayToday:     { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: Colors.white },
  dayOvulation: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: '#F97316' },

  todayChip: {
    alignSelf: 'center', marginTop: 12, paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 999, backgroundColor: '#F3F4F6',
  },
  todayChipText: { fontFamily: 'DMSans-SemiBold', fontSize: 12, color: '#141414' },

  legend: {
    flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 8,
    marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontFamily: 'DMSans-Medium', fontSize: 11, color: '#6B7280' },

  // ── Empty state ──
  emptyCard: {
    marginHorizontal: 20, marginTop: 8, padding: 24, borderRadius: 30,
    gap: 8, alignItems: 'center', backgroundColor: Colors.white,
    borderWidth: 1, borderColor: 'rgba(153,153,153,0.20)', ...CARD_SHADOW,
  },
  emptyTitle: { fontFamily: 'DMSans-Bold', fontSize: 18, color: '#141414' },
  emptySub: {
    fontFamily: 'DMSans-Regular', fontSize: 14, lineHeight: 21,
    color: '#999999', textAlign: 'center', marginBottom: 8,
  },
  emptyCta: {
    alignSelf: 'stretch', height: 56, borderRadius: 9999, backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Today's summary ──
  summaryCard: {
    marginHorizontal: 20, marginTop: 20, backgroundColor: Colors.white,
    borderRadius: 24, padding: 20, gap: 16,
    borderWidth: 1, borderColor: 'rgba(153,153,153,0.20)', ...CARD_SHADOW,
  },
  summaryTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: '#141414' },
  viewMoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewMore: { fontFamily: 'DMSans-SemiBold', fontSize: 12, color: '#999999' },
  viewMoreChevron: { fontSize: 13, color: '#9CA3AF' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryCell: { flex: 1, alignItems: 'center', gap: 4 },
  summaryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontFamily: 'DMSans-Medium', fontSize: 10, color: '#6B7280' },
  summaryValue: { fontFamily: 'DMSans-Bold', fontSize: 12 },

  // ── Quick actions (2 × 2) ──
  actionsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 24, rowGap: 16,
  },
  actionCard: {
    width: '48%', flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(153,153,153,0.20)', ...CARD_SHADOW,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: 'DMSans-Bold', fontSize: 14, color: '#141414' },

  // ── CTA ──
  cta: {
    marginHorizontal: 20, marginTop: 24, height: 64, borderRadius: 9999,
    backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { fontFamily: 'DMSans-Bold', fontSize: 16, color: Colors.white },
});
