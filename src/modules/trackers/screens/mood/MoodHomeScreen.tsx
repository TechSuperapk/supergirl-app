/**
 * MoodHomeScreen — mood dashboard: streak + score banner, month calendar with
 * a mood emoji per logged day, Today's Reflection, and shortcuts into Log /
 * Insights / Journal. Renders immediately (never gated on the network).
 */
import React, { useState } from 'react';
import { useGridCellWidth } from '../../../../shared/hooks/useGridCellWidth';
import {
  View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { useMoodLogs } from '../../hooks/useMoodLogs';
import { MOOD_META, moodScoreOf } from '../../types';

type Props = NativeStackScreenProps<any, 'MoodHome'>;

const todayISO = () => new Date().toISOString().split('T')[0];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const longDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// ── Glyphs ───────────────────────────────────────────────────────────────────

const ChevronGlyph = ({ dir, color = '#696C70' }: { dir: 'left' | 'right'; color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d={dir === 'left' ? 'M14.5 5.5 8 12l6.5 6.5' : 'M9.5 5.5 16 12l-6.5 6.5'}
      stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);
const CaretGlyph = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9.5 12 15.5l6-6" stroke="#000000" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const SmallChevron = () => (
  <Svg width={12} height={12} viewBox="0 0 16 16" fill="none">
    <Path d="M6 3 10.5 8 6 13" stroke="#CBD5E1" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const PlusGlyph = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M10 4v12M4 10h12" stroke={Colors.white} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
/** Gradient progress ring for the mood score. */
function ScoreRing({ score, date }: { score: number | null; date?: string }) {
  const size = 104, stroke = 7, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(1, score / 10));
  return (
    <View style={s.ring}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="moodRing" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#24FFEA" />
            <Stop offset="1" stopColor="#FF35C9" />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} fill="none" />
        {pct > 0 && (
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke="url(#moodRing)" strokeWidth={stroke} fill="none"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      {score == null ? (
        <AppText style={s.ringLabel}>Not logged</AppText>
      ) : (
        <>
          <AppText style={s.ringScore}>
            {score.toFixed(1)}<AppText style={s.ringScoreSuffix}>/10</AppText>
          </AppText>
          <AppText style={s.ringLabel}>Mood Score</AppText>
          {date ? <AppText style={s.ringDate}>{longDate(date)}</AppText> : null}
        </>
      )}
    </View>
  );
}

export function MoodHomeScreen({ navigation }: Props) {
  // Whole-pixel calendar columns — a %-width 7th cell wraps on Android,
  // which is what left the Sunday column empty. See useGridCellWidth.
  const { onLayout: onGridLayout, cellWidth } = useGridCellWidth(7);
  const insets = useSafeAreaInsets();
  const { logs, loading, refreshing, refresh, error, todayLog, logFor } = useMoodLogs();
  const [monthOffset, setMonthOffset] = useState(0);

  const today = todayISO();
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear();
  const month = base.getMonth();
  const monthLabel = base.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  // Sunday-first grid, matching the design.
  const lead = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
  ];

  // Future dates aren't loggable or editable.
  const openDay = (date: string) => {
    if (date > today) return;
    if (logFor(date)) navigation.navigate('MoodDetail', { date });
    else navigation.navigate('LogMood', { date });
  };

  const todayScore = todayLog ? moodScoreOf(todayLog) : null;
  const todayMeta = todayLog ? MOOD_META[todayLog.mood] : null;

  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
        <AppText style={s.backArrow}>←</AppText>
      </TouchableOpacity>
      <AppText style={s.headerTitle}>Mood tracker</AppText>
      <View style={s.hBtn} />
    </View>
  );

  // ── §31 loading — no metrics until there's data behind them ────────────────
  if (loading && logs.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <View style={s.centre}>
          <ActivityIndicator color="#F97316" />
          <AppText style={s.centreText}>Analyzing your mood…</AppText>
        </View>
      </SafeAreaView>
    );
  }

  // ── §31 error — retry instead of a blank screen ────────────────────────────
  if (error && logs.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <View style={s.centre}>
          <AppText style={s.centreTitle}>Unable to load your moods.</AppText>
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
        contentContainerStyle={[s.scroll, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#F97316" />}
      >
        {/* Moods are already on screen, so this is a failed refresh rather
            than a dead end — inline, with a retry. */}
        {error ? (
          <View style={s.errorBanner}>
            <AppText variant="caption" color={Colors.error}>{error}</AppText>
            <TouchableOpacity onPress={refresh} hitSlop={8}>
              <AppText style={s.errorRetry}>Retry</AppText>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Streak + score ── */}
        <View style={s.banner}>
          {/* RN has no blur filter, so the teal glow is stacked soft circles. */}
          <View style={[s.glow, { width: 190, height: 190, borderRadius: 95, opacity: 0.10 }]} />
          <View style={[s.glow, { width: 130, height: 130, borderRadius: 65, opacity: 0.12 }]} />

          <View style={s.bannerLeft}>
            <View style={s.moodBox}>
              <AppText style={s.moodBoxEmoji}>{todayMeta?.emoji ?? '🙂'}</AppText>
            </View>
            <AppText style={s.bannerKicker}>TODAY'S MOOD</AppText>
            <AppText style={s.bannerValue} numberOfLines={1}>
              {todayMeta?.label ?? 'Not logged'}
            </AppText>
          </View>

          <ScoreRing score={todayScore} date={todayLog ? today : undefined} />
        </View>

        {/* ── Calendar ── */}
        <AppText style={s.sectionTitle}>My calendar</AppText>

        <View style={s.calendar}>
          <View style={s.calHeader}>
            <TouchableOpacity onPress={() => setMonthOffset(o => o - 1)} hitSlop={10}>
              <ChevronGlyph dir="left" />
            </TouchableOpacity>
            <View style={s.calMonth}>
              <AppText style={s.calMonthText}>{monthLabel}</AppText>
              <CaretGlyph />
            </View>
            <TouchableOpacity
              onPress={() => setMonthOffset(o => Math.min(0, o + 1))}
              disabled={monthOffset >= 0}
              hitSlop={10}
              style={monthOffset >= 0 ? { opacity: 0.25 } : undefined}
            >
              <ChevronGlyph dir="right" />
            </TouchableOpacity>
          </View>

          <View style={s.calRow}>
            {WEEKDAYS.map(d => (
              <View key={d} style={[s.calCell, { width: cellWidth }]}>
                <AppText style={s.calWeekday}>{d}</AppText>
              </View>
            ))}
          </View>

          <View style={s.calGrid} onLayout={onGridLayout}>
            {cells.map((iso, i) => {
              if (!iso) return <View key={`pad-${i}`} style={[s.calCell, s.calDay, { width: cellWidth }]} />;
              const log = logFor(iso);
              const future = iso > today;
              const isToday = iso === today;
              return (
                <TouchableOpacity
                  key={iso}
                  style={[s.calCell, s.calDay, { width: cellWidth }]}
                  activeOpacity={future ? 1 : 0.7}
                  disabled={future}
                  onPress={() => openDay(iso)}
                >
                  <AppText style={[s.calNum, isToday && s.calNumToday, future && s.calNumFuture]}>
                    {Number(iso.slice(-2))}
                  </AppText>
                  {log ? (
                    <View style={s.calEmojiTile}>
                      <AppText style={s.calEmoji}>{MOOD_META[log.mood].emoji}</AppText>
                    </View>
                  ) : (
                    <View style={s.calEmptyTile} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Today's reflection ── */}
        <View style={s.reflectCard}>
          <AppText style={s.reflectTitle}>Today's Reflection</AppText>
          <TouchableOpacity
            style={s.reflectRow}
            activeOpacity={0.85}
            onPress={() => navigation.navigate(todayLog ? 'MoodDetail' : 'LogMood', { date: today })}
          >
            <View style={[s.reflectIcon, todayMeta ? { backgroundColor: todayMeta.color + '1F' } : null]}>
              <AppText style={s.reflectEmoji}>{todayMeta?.emoji ?? '🙂'}</AppText>
            </View>
            <View style={s.reflectText}>
              <AppText style={s.reflectKicker}>TODAY'S MOOD</AppText>
              <AppText style={[s.reflectMood, todayMeta ? { color: todayMeta.color } : null]}>
                {todayMeta?.label ?? 'Not logged yet'}
              </AppText>
            </View>
            <SmallChevron />
          </TouchableOpacity>
        </View>

        {/* ── Shortcuts ── */}
        <View style={s.shortcutRow}>
          <Shortcut
            emoji="😊" tint="#FFEDD5" title="Log Mood" sub="Record how you feel"
            onPress={() => navigation.navigate('LogMood', { date: today })}
          />
          <Shortcut
            emoji="📈" tint="#F3E8FF" title="Insights" sub="View your patterns"
            onPress={() => navigation.navigate('MoodInsights')}
          />
        </View>

        <TouchableOpacity
          style={s.cta}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('LogMood', { date: today })}
        >
          <PlusGlyph />
          <AppText style={s.ctaText}>Quick Log</AppText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Shortcut({
  emoji, tint, title, sub, onPress,
}: { emoji: string; tint: string; title: string; sub: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.shortcut} activeOpacity={0.85} onPress={onPress}>
      <View style={s.shortcutLeft}>
        <View style={[s.shortcutIcon, { backgroundColor: tint }]}>
          <AppText style={s.shortcutEmoji}>{emoji}</AppText>
        </View>
        <View style={s.shortcutText}>
          <AppText style={s.shortcutTitle} numberOfLines={1}>{title}</AppText>
          <AppText style={s.shortcutSub} numberOfLines={1}>{sub}</AppText>
        </View>
      </View>
      <SmallChevron />
    </TouchableOpacity>
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

  // ── Loading / error (§31) ──
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

  // ── Banner ──
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    padding: 18, borderRadius: 30, backgroundColor: '#141414', overflow: 'hidden',
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  glow: { position: 'absolute', left: 10, top: 40, backgroundColor: '#3EF8E5' },
  bannerLeft: { flex: 1, minWidth: 0, paddingLeft: 4 },
  moodBox: {
    width: 46, height: 46, borderRadius: 16, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  moodBoxEmoji: { fontSize: 24, lineHeight: 30, includeFontPadding: false } as any,
  bannerKicker: {
    fontFamily: 'DMSans-SemiBold', fontSize: 10, lineHeight: 15,
    letterSpacing: 0.5, color: Colors.white,
  },
  bannerValue: { fontFamily: 'DMSans-Bold', fontSize: 18, lineHeight: 25, color: Colors.white },

  ring: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ringEmoji: { fontSize: 16, lineHeight: 20, includeFontPadding: false } as any,
  ringScore: { fontFamily: 'DMSans-Bold', fontSize: 16, lineHeight: 21, color: Colors.white },
  ringScoreSuffix: { fontFamily: 'DMSans-Bold', fontSize: 9, color: Colors.white },
  ringLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 11, lineHeight: 15, color: Colors.white },
  ringDate: { fontFamily: 'DMSans-Medium', fontSize: 9, lineHeight: 13, color: '#ECECEC' },

  sectionTitle: { fontFamily: 'DMSans-Bold', fontSize: 20, lineHeight: 24, color: '#131313' },

  // ── Calendar ──
  calendar: { gap: 14 },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calMonth: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  calMonthText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: '#000000' },
  calRow: { flexDirection: 'row' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { alignItems: 'center', justifyContent: 'flex-start' },
  calWeekday: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: '#696C70' },
  calDay: { minHeight: 62, paddingVertical: 6, gap: 8 },
  calNum: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#696C70' },
  calNumToday: { color: '#F97316' },
  calNumFuture: { color: '#D1D5DB' },
  calEmojiTile: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  calEmoji: { fontSize: 17, lineHeight: 22, includeFontPadding: false } as any,
  calEmptyTile: { width: 30, height: 30 },

  // ── Reflection ──
  reflectCard: {
    paddingVertical: 18, paddingHorizontal: 18, borderRadius: 32, gap: 14,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  reflectTitle: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 20, color: '#334155' },
  reflectRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reflectIcon: {
    width: 60, height: 60, borderRadius: 16, backgroundColor: '#FFF7ED',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  reflectEmoji: { fontSize: 30, lineHeight: 38, includeFontPadding: false } as any,
  reflectText: { flex: 1, minWidth: 0 },
  reflectKicker: {
    fontFamily: 'DMSans-Bold', fontSize: 10, lineHeight: 15,
    letterSpacing: 0.4, color: '#94A3B8',
  },
  reflectMood: { fontFamily: 'DMSans-Bold', fontSize: 18, lineHeight: 25, color: '#FB923C' },

  // ── Shortcuts ──
  shortcutRow: { flexDirection: 'row', gap: 14 },
  shortcut: {
    flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, padding: 12, borderRadius: 24, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  shortcutLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  shortcutIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  shortcutEmoji: { fontSize: 19, lineHeight: 24, includeFontPadding: false } as any,
  shortcutText: { flex: 1, minWidth: 0 },
  shortcutTitle: { fontFamily: 'DMSans-Bold', fontSize: 12, lineHeight: 17, color: '#1E293B' },
  shortcutSub: { fontFamily: 'DMSans-Regular', fontSize: 9, lineHeight: 13, color: '#94A3B8' },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 20, borderRadius: 999, backgroundColor: '#141414', ...CARD_SHADOW,
  },
  ctaText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 24, color: Colors.white },
});
