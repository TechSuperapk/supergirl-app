/**
 * SleepHomeScreen — average-sleep banner, this-week bar chart with an average
 * line, highlights (avg bedtime/wake, streak, best sleep, vs last week), recent
 * history, a recommendation, and the quick-log CTA.
 */
import React from 'react';
import {
  View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { useSleepTracker } from '../../hooks/useTrackers';
import {
  ChartPoint, fmtHrs, fmtHrsLong, fmtMinutesClock, goalStatus, todayISO,
} from '../../utils/sleepAnalytics';

type Props = NativeStackScreenProps<any, 'SleepHome'>;

const TEAL = '#008080';

/** An ISO datetime down to a wall clock, for the history rows. */
const isoToClock = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return fmtMinutesClock(d.getHours() * 60 + d.getMinutes());
};

// ── Glyphs ───────────────────────────────────────────────────────────────────

const SparkleGlyph = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path d="M5 1.5 6 4l2.5 1L6 6l-1 2.5L4 6 1.5 5 4 4l1-2.5Z" fill="#141414" />
    <Path d="M10.5 7.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4Z" fill="#141414" />
  </Svg>
);
const CaretGlyph = ({ color = '#64748B' }: { color?: string }) => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path d="M3 4.5 6 7.5l3-3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const ChevronGlyph = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M6 3.5 10.5 8 6 12.5" stroke="#D1D5DB" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const MoonGlyph = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M16.5 12.4A7 7 0 0 1 7.6 3.5a7 7 0 1 0 8.9 8.9Z"
      fill="#6366F1"
    />
  </Svg>
);
const SunGlyph = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={10} r={4.2} fill="#F59E0B" />
    <Path
      d="M10 1.6v2M10 16.4v2M1.6 10h2M16.4 10h2M4.1 4.1l1.4 1.4M14.5 14.5l1.4 1.4M15.9 4.1l-1.4 1.4M5.5 14.5l-1.4 1.4"
      stroke="#F59E0B" strokeWidth={1.6} strokeLinecap="round"
    />
  </Svg>
);
const BulbGlyph = () => (
  <Svg width={38} height={38} viewBox="0 0 40 40" fill="none">
    <Path
      d="M20 5a10 10 0 0 0-6 18v3.5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V23A10 10 0 0 0 20 5Z"
      fill="#FFD75E"
    />
    <Rect x={16} y={30} width={8} height={2.6} rx={1.3} fill="#E0A93B" />
    <Rect x={17} y={34} width={6} height={2.4} rx={1.2} fill="#E0A93B" />
  </Svg>
);
/** Sleeping-cloud hero art. */
const SleepArt = () => (
  <Svg width={150} height={112} viewBox="0 0 150 112" fill="none">
    <Defs>
      <LinearGradient id="cloud" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#F5F6FA" />
        <Stop offset="1" stopColor="#C9CEE0" />
      </LinearGradient>
      <LinearGradient id="pillow" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#5FE3C8" />
        <Stop offset="1" stopColor="#17A98F" />
      </LinearGradient>
    </Defs>
    {/* Stars */}
    {[[16, 20], [128, 16], [138, 46], [10, 58]].map(([cx, cy], i) => (
      <Path
        key={i}
        d={`M${cx} ${cy - 4}l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z`}
        fill="#8FE9DA" opacity={0.9}
      />
    ))}
    {/* Pillow / blanket */}
    <Rect x={26} y={74} width={98} height={22} rx={11} fill="url(#pillow)" />
    <Rect x={38} y={60} width={26} height={22} rx={6} fill="#2FC7AA" />
    <Rect x={92} y={62} width={22} height={20} rx={6} fill="#2FC7AA" />
    {/* Cloud body */}
    <Path
      d="M52 42a16 16 0 0 1 31-5 14 14 0 0 1 13 19H55a14 14 0 0 1-3-14Z"
      fill="url(#cloud)"
    />
    <Circle cx={64} cy={54} r={2} fill="#3B3F51" />
    <Circle cx={84} cy={54} r={2} fill="#3B3F51" />
    <Path d="M69 60a6 6 0 0 0 10 0" stroke="#3B3F51" strokeWidth={1.8} strokeLinecap="round" fill="none" />
    <Circle cx={58} cy={60} r={3} fill="#FF9EB0" opacity={0.5} />
    <Circle cx={90} cy={60} r={3} fill="#FF9EB0" opacity={0.5} />
    {/* Zs */}
    <Path d="M104 30h9l-9 10h9" stroke="#8FE9DA" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Path d="M118 16h7l-7 8h7" stroke="#8FE9DA" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

/**
 * Seven-day duration bars with the weekly average drawn across them.
 *
 * Heights are scaled to a 9h ceiling — the top of the goal band — so a bar's
 * height reads directly against the goal rather than against whatever the
 * week's own maximum happened to be.
 */
function WeekChart({ data, avgMins }: { data: ChartPoint[]; avgMins: number }) {
  const PLOT_H = 160;
  const CEILING_H = 9;
  const ticks = [9, 7, 5, 3, 0];
  const todayIdx = data.findIndex(d => d.date === todayISO());
  const avgH = avgMins > 0 ? (avgMins / 60 / CEILING_H) * PLOT_H : 0;

  return (
    <View style={s.chartBody}>
      <View style={[s.chartAxis, { height: PLOT_H }]}>
        {ticks.map(t => <AppText key={t} style={s.chartAxisLabel}>{t}h</AppText>)}
      </View>

      <View style={{ flex: 1 }}>
        <View style={[s.chartPlot, { height: PLOT_H }]}>
          {/* Average line, drawn behind the bars. */}
          {avgH > 0 ? (
            <View style={[s.avgLine, { bottom: avgH }]} pointerEvents="none" />
          ) : null}

          {data.map((d, i) => {
            // A night with no entry gets a flat tick rather than a zero-height
            // bar, so "didn't log" reads differently from "slept nothing" (§5.5).
            const h = d.hasData
              ? Math.max(3, Math.min(1, d.value / CEILING_H) * PLOT_H)
              : 2;
            const isToday = i === todayIdx;
            return (
              <View key={d.date} style={s.chartCol}>
                <View
                  style={[
                    s.chartBar,
                    {
                      height: h,
                      backgroundColor: !d.hasData ? '#E3E6EA'
                        : isToday ? TEAL : 'rgba(6,157,157,0.20)',
                    },
                  ]}
                />
              </View>
            );
          })}

          {/* Average marker sits on the line at the right edge. */}
          {avgH > 0 ? (
            <View style={[s.avgMarker, { bottom: avgH - 6 }]} pointerEvents="none">
              <View style={s.avgDot} />
              <AppText style={s.avgLabel}>Avg{'\n'}{fmtHrs(avgMins)}</AppText>
            </View>
          ) : null}
        </View>

        <View style={s.chartLabels}>
          {data.map((d, i) => (
            <View key={d.date} style={s.chartCol}>
              <AppText style={[s.chartDay, i === todayIdx && { color: TEAL }]}>
                {d.label}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function SleepHomeScreen({ navigation }: Props) {
  const { loading, refreshing, refresh, error, dashboard } = useSleepTracker();

  const {
    hasData, averageSleepMinutes: avgMins, averageBedtimeMinutes, averageWakeMinutes,
    currentStreak: streakN, best, comparison, consistency, weeklyData, recentHistory,
    recommendation,
  } = dashboard;

  /** Plain-language verdict on the weekly average against the 7–9h band. */
  const qualityNote = (() => {
    if (!avgMins) return 'No sleep logged this week';
    const status = goalStatus(avgMins);
    if (status === 'below') return `${fmtHrsLong(avgMins)} : Below goal`;
    if (status === 'above') return `${fmtHrsLong(avgMins)} : Long sleep`;
    return `${fmtHrsLong(avgMins)} : Good sleep`;
  })();

  const quickLog = () => navigation.navigate('LogSleep');

  // ── §16 loading ────────────────────────────────────────────────────────────
  if (loading && !hasData) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <Header onBack={() => navigation.goBack()} />
        <View style={s.centre}>
          <ActivityIndicator color={TEAL} />
          <AppText style={s.centreText}>Loading sleep data…</AppText>
        </View>
      </SafeAreaView>
    );
  }

  // ── §17 error ──────────────────────────────────────────────────────────────
  if (error && !hasData) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <Header onBack={() => navigation.goBack()} />
        <View style={s.centre}>
          <AppText style={s.centreTitle}>Unable to load your sleep data.</AppText>
          <AppText style={s.centreText}>Please try again.</AppText>
          <TouchableOpacity style={s.retryBtn} activeOpacity={0.9} onPress={refresh}>
            <AppText style={s.retryText}>Retry</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── §15 empty ──────────────────────────────────────────────────────────────
  // No fabricated averages, streaks or history rows here by design: an invented
  // "7h 12m" is indistinguishable from a real measurement once it is on screen,
  // and the first thing it would do is make the first real average look wrong.
  if (!hasData) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <Header onBack={() => navigation.goBack()} />
        <View style={s.centre}>
          <SleepArt />
          <AppText style={s.centreTitle}>No sleep data yet.</AppText>
          <AppText style={s.centreText}>
            Start tracking your sleep{'\n'}to build better sleep habits.
          </AppText>
          <TouchableOpacity style={s.emptyCta} activeOpacity={0.9} onPress={quickLog}>
            <View style={s.ctaPlus}>
              <View style={s.ctaPlusH} />
              <View style={s.ctaPlusV} />
            </View>
            <AppText style={s.ctaText}>Quick log</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Header onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={TEAL} />
        }
      >
        {/* Data is on screen, so this is a refresh failure rather than a dead
            end — an inline banner with Retry, not a full-screen takeover. */}
        {error ? (
          <View style={s.errorBanner}>
            <AppText variant="caption" color={Colors.error}>{error}</AppText>
            <TouchableOpacity onPress={refresh} hitSlop={8}>
              <AppText style={s.errorRetry}>Retry</AppText>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Banner ── */}
        <View style={s.banner}>
          {/* Teal glow. RN has no blur filter, so it's stacked low-opacity
              circles rather than an extra dependency for one decoration. */}
          <View style={[s.glow, s.glow1]} />
          <View style={[s.glow, s.glow2]} />

          <View style={s.bannerLeft}>
            <AppText style={s.bannerLabel}>Average Sleep</AppText>
            <AppText style={s.bannerValue}>{avgMins ? fmtHrs(avgMins) : '—'}</AppText>
            <AppText style={s.bannerGoal}>Goal: 7 - 9 hours</AppText>

            <View style={s.bannerBadge}>
              <SparkleGlyph />
              <AppText style={s.bannerBadgeText}>{consistency.label}</AppText>
            </View>
          </View>

          <View style={s.bannerArt}>
            <SleepArt />
            <AppText style={s.bannerArtCaption} numberOfLines={1}>{qualityNote}</AppText>
          </View>
        </View>

        {/* ── This week ── */}
        <View style={s.chartCard}>
          <View style={s.rowBetween}>
            <AppText style={s.chartTitle}>This Week</AppText>
            <View style={s.unitChip}>
              <AppText style={s.unitChipText}>Hours</AppText>
              <CaretGlyph />
            </View>
          </View>
          <WeekChart data={weeklyData} avgMins={avgMins} />
        </View>

        {/* ── Highlights ── */}
        <AppText style={s.sectionTitle}>Highlights</AppText>

        <View style={s.pairRow}>
          <PairCard
            Icon={MoonGlyph}
            label="Average Bedtime"
            value={fmtMinutesClock(averageBedtimeMinutes)}
            sub={consistency.label}
          />
          <PairCard
            Icon={SunGlyph}
            label="Average Wake Up"
            value={fmtMinutesClock(averageWakeMinutes)}
            sub={consistency.label}
          />
        </View>

        {/* §6.3 — a night counts only when its duration lands inside the goal
            band, so the subtitle says "achieved", not merely "logged". */}
        <StatRow
          emoji="😃"
          title="Current Streak"
          sub="Goal achieved consecutively"
          value={`${streakN} ${streakN === 1 ? 'Night' : 'Nights'}`}
        />
        <StatRow
          emoji="🛌"
          title="Best Sleep"
          sub="Your longest night this week"
          value={best
            ? new Date(best.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
            : '—'}
          valueSub={best ? fmtHrsLong(best.durationMins) : undefined}
        />
        {/* null means there's no previous week to compare against — saying
            "no change" would imply a comparison that hasn't happened. */}
        <StatRow
          emoji="📊"
          title="Compared to Last week"
          sub={comparison == null
            ? 'Not enough data'
            : comparison.direction === 'same' ? 'About the same as last week'
              : comparison.direction === 'up' ? 'You slept longer than last week'
                : 'You slept less than last week'}
          value={comparison == null
            ? '—'
            : comparison.direction === 'same' ? 'No change'
              : `${comparison.direction === 'up' ? '+' : '−'}${Math.abs(comparison.differenceMinutes)} minutes ${comparison.direction === 'up' ? '↑' : '↓'}`}
          valueColor={comparison == null ? '#141414'
            : comparison.direction === 'up' ? '#15803D'
              : comparison.direction === 'down' ? '#B45309' : '#141414'}
        />

        {/* ── History ── */}
        <View style={s.rowBetween}>
          <AppText style={s.sectionTitle}>History</AppText>
          <TouchableOpacity onPress={() => navigation.navigate('SleepHistory')} hitSlop={8}>
            <AppText style={s.viewAll}>View all</AppText>
          </TouchableOpacity>
        </View>

        {recentHistory.map(e => {
            const d = new Date(e.date + 'T00:00:00');
            const isToday = e.date === todayISO();
            return (
              <TouchableOpacity
                key={e.id}
                style={s.historyCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('LogSleep', { date: e.date })}
              >
                <View style={s.historyDate}>
                  <AppText style={s.historyDay}>
                    {isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </AppText>
                  <AppText style={s.historyDateSub}>
                    {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </AppText>
                </View>

                <View style={s.historyTimes}>
                  <View style={s.historyTime}>
                    <View style={[s.historyIcon, { backgroundColor: '#EEF2FF' }]}><MoonGlyph size={16} /></View>
                    <View>
                      <AppText style={s.historyClock}>{isoToClock(e.bedtime)}</AppText>
                      <AppText style={s.historyCaption}>Sleep</AppText>
                    </View>
                  </View>

                  <View style={s.historyTime}>
                    <View style={[s.historyIcon, { backgroundColor: '#FFF8EE' }]}><SunGlyph size={16} /></View>
                    <View>
                      <AppText style={s.historyClock}>{isoToClock(e.wakeTime)}</AppText>
                      <AppText style={s.historyCaption}>Wakeup</AppText>
                    </View>
                  </View>
                </View>

                <View style={s.historyRight}>
                  <AppText style={s.historyDuration}>{fmtHrs(e.durationMins)}</AppText>
                  <ChevronGlyph />
                </View>
              </TouchableOpacity>
            );
        })}

        {/* ── Recommendation ── */}
        <View style={s.recCard}>
          <BulbGlyph />
          <View style={s.recText}>
            <AppText style={s.recTitle}>Recommendation</AppText>
            <AppText style={s.recBody}>{recommendation}</AppText>
          </View>
        </View>

        <TouchableOpacity style={s.cta} activeOpacity={0.9} onPress={quickLog}>
          <View style={s.ctaPlus}>
            <View style={s.ctaPlusH} />
            <View style={s.ctaPlusV} />
          </View>
          <AppText style={s.ctaText}>Quick log</AppText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

/** Shared across the loading, error, empty and populated states. */
function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={onBack} style={s.hBtn} hitSlop={8}>
        <AppText style={s.backArrow}>←</AppText>
      </TouchableOpacity>
      <AppText style={s.headerTitle}>Sleep</AppText>
      <View style={s.hBtn} />
    </View>
  );
}

function PairCard({
  Icon, label, value, sub,
}: {
  Icon: React.ComponentType<{ size?: number }>;
  label: string; value: string; sub: string;
}) {
  return (
    <View style={s.pairCard}>
      <View style={s.pairTop}>
        <Icon size={28} />
        <View style={s.pairText}>
          <AppText style={s.pairLabel} numberOfLines={1}>{label}</AppText>
          <AppText style={s.pairValue}>{value}</AppText>
        </View>
      </View>
      <AppText style={s.pairSub} numberOfLines={1}>{sub}</AppText>
    </View>
  );
}

function StatRow({
  emoji, title, sub, value, valueSub, valueColor,
}: {
  emoji: string; title: string; sub: string;
  value: string; valueSub?: string; valueColor?: string;
}) {
  return (
    <View style={s.statRow}>
      <View style={s.statLeft}>
        <View style={s.statEmojiPill}><AppText style={s.statEmoji}>{emoji}</AppText></View>
        <View style={s.statText}>
          <AppText style={s.statTitle} numberOfLines={1}>{title}</AppText>
          <AppText style={s.statSub} numberOfLines={1}>{sub}</AppText>
        </View>
      </View>
      <View style={s.statRight}>
        <AppText
          style={[s.statValue, valueColor ? { color: valueColor } : null]}
          numberOfLines={1}
        >
          {value}
        </AppText>
        {valueSub ? <AppText style={s.statValueSub}>{valueSub}</AppText> : null}
      </View>
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

  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12,
  },
  errorRetry: { fontFamily: 'DMSans-Bold', fontSize: 13, color: '#141414' },

  // ── Loading / error / empty (§15–§17) ──
  centre: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingBottom: 60, gap: 12,
  },
  centreTitle: {
    fontFamily: 'DMSans-SemiBold', fontSize: 20, color: '#141414',
    textAlign: 'center', marginTop: 8,
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
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    marginTop: 12, paddingVertical: 18, paddingHorizontal: 36,
    backgroundColor: '#141414', borderRadius: 9999,
  },

  // ── Banner ──
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 151, padding: 10, borderRadius: 30,
    backgroundColor: '#141414', overflow: 'hidden',
  },
  glow: { position: 'absolute', backgroundColor: TEAL, borderRadius: 9999 },
  glow1: { left: 10, top: -90, width: 190, height: 190, opacity: 0.16 },
  glow2: { left: 40, top: -60, width: 120, height: 120, opacity: 0.14 },
  bannerLeft: { flexShrink: 1, paddingLeft: 11, gap: 8 },
  bannerLabel: { fontFamily: 'DMSans-Medium', fontSize: 14, color: Colors.white },
  bannerValue: { fontFamily: 'DMSans-Bold', fontSize: 34, lineHeight: 40, color: '#F1F1F1' },
  bannerGoal: { fontFamily: 'DMSans-Medium', fontSize: 10, color: Colors.white },
  bannerBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 23,
    backgroundColor: Colors.white,
  },
  bannerBadgeText: { fontFamily: 'DMSans-Medium', fontSize: 10, color: '#141414' },
  bannerArt: { alignItems: 'center', gap: 2 },
  bannerArtCaption: { fontFamily: 'DMSans-Medium', fontSize: 11, color: Colors.white },

  // ── Chart ──
  chartCard: {
    padding: 20, gap: 24, borderRadius: 16,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  chartTitle: { fontFamily: 'DMSans-Bold', fontSize: 16, color: '#1E293B' },
  unitChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  unitChipText: { fontFamily: 'DMSans-SemiBold', fontSize: 12, color: '#999999' },

  chartBody: { flexDirection: 'row', gap: 8 },
  chartAxis: { justifyContent: 'space-between', paddingBottom: 0 },
  chartAxisLabel: { fontFamily: 'DMSans-Medium', fontSize: 10, color: '#CBD5E1' },
  chartPlot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  chartCol: { flex: 1, alignItems: 'center' },
  chartBar: { width: 14, borderRadius: 99 },
  avgLine: {
    position: 'absolute', left: 0, right: 0, height: 1,
    backgroundColor: HAIRLINE,
  },
  // Anchored right so it can't sit on top of the bars.
  avgMarker: { position: 'absolute', right: -2, alignItems: 'center', gap: 4 },
  avgDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.white, borderWidth: 2, borderColor: TEAL,
  },
  avgLabel: {
    fontFamily: 'DMSans-Bold', fontSize: 10, color: TEAL, textAlign: 'center',
  },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  chartDay: { fontFamily: 'DMSans-Bold', fontSize: 10, color: '#999999' },

  // ── Sections ──
  sectionTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: '#141414', marginTop: 4 },
  viewAll: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#999999', marginTop: 4 },

  pairRow: { flexDirection: 'row', gap: 16 },
  pairCard: {
    flex: 1, minWidth: 0, padding: 16, gap: 8, borderRadius: 16,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  pairTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pairText: { flex: 1, minWidth: 0 },
  pairLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 10, color: '#999999' },
  pairValue: { fontFamily: 'DMSans-Bold', fontSize: 14, color: '#1E293B' },
  pairSub: { fontFamily: 'DMSans-Bold', fontSize: 10, color: '#999999', paddingLeft: 4 },

  statRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    padding: 16, borderRadius: 30,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: 'rgba(0,0,0,0.10)', ...CARD_SHADOW,
  },
  statLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statEmojiPill: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6',
  },
  statEmoji: { fontSize: 22, lineHeight: 28, includeFontPadding: false },
  statText: { flex: 1, minWidth: 0 },
  statTitle: { fontFamily: 'DMSans-Bold', fontSize: 16, color: '#1F2937' },
  statSub: { fontFamily: 'DMSans-SemiBold', fontSize: 12, color: '#999999' },
  statRight: { alignItems: 'flex-end', flexShrink: 0 },
  statValue: { fontFamily: 'DMSans-SemiBold', fontSize: 15, color: '#141414' },
  statValueSub: { fontFamily: 'DMSans-SemiBold', fontSize: 12, color: '#999999' },

  // ── History ──
  historyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, borderRadius: 30,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  historyDate: { width: 56 },
  historyDay: { fontFamily: 'DMSans-SemiBold', fontSize: 15, color: '#111827' },
  historyDateSub: { fontFamily: 'DMSans-Medium', fontSize: 11, color: '#9CA3AF' },
  historyTimes: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 12 },
  historyTime: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  historyIcon: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  historyClock: { fontFamily: 'DMSans-SemiBold', fontSize: 12, color: '#111827' },
  historyCaption: { fontFamily: 'DMSans-Medium', fontSize: 11, color: '#999999' },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  historyDuration: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#7C7CE0' },

  // ── Recommendation ──
  recCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 16,
    padding: 20, borderRadius: 16, backgroundColor: '#F4F4F4', marginTop: 4,
  },
  recText: { flex: 1, minWidth: 0, gap: 4 },
  recTitle: { fontFamily: 'DMSans-Bold', fontSize: 16, color: '#1E293B' },
  recBody: { fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 18, color: '#141414' },

  // ── CTA ──
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    marginTop: 4, paddingVertical: 20, paddingHorizontal: 30,
    backgroundColor: '#141414', borderRadius: 9999, ...CARD_SHADOW,
  },
  ctaPlus: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  ctaPlusH: { position: 'absolute', width: 16, height: 2.5, borderRadius: 2, backgroundColor: Colors.white },
  ctaPlusV: { position: 'absolute', width: 2.5, height: 16, borderRadius: 2, backgroundColor: Colors.white },
  ctaText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: Colors.white },
});
