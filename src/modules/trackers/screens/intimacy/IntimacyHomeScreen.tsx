/**
 * IntimacyHomeScreen — last-entry card, this-month overview, a month calendar
 * showing the feeling logged on each day, quick actions, and the Quick log CTA.
 */
import React, { useMemo } from 'react';
import { useGridCellWidth } from '../../../../shared/hooks/useGridCellWidth';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path, Rect, SvgProps } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { useIntimacyTracker } from '../../hooks/useTrackers';
import { todayISO } from '../../utils/intimacyAnalytics';
import { IntimacyFeeling, IntimacyMoodAfter, IntimacyWho } from '../../types';

import TotalEntries   from '../../components/TotalEntries';
import ProductedIcon  from '../../components/ProductedIcon';
import SelfloveIcon   from '../../components/SelfloveIcon';
import PartnerIcon    from '../../components/PartnerIcon';

type Props = NativeStackScreenProps<any, 'IntimacyHome'>;

const ACCENT = '#FF5270';

const FEELING_EMOJI: Record<IntimacyFeeling, string> = {
  loved: '🥰', happy: '😊', relaxed: '😌', passionate: '😍', neutral: '😐', disappointed: '😔',
};
const MOOD_AFTER_META: Record<IntimacyMoodAfter, { emoji: string; label: string }> = {
  amazing: { emoji: '🥰', label: 'AMAZING' },
  good:    { emoji: '😊', label: 'HAPPY' },
  ok:      { emoji: '😐', label: 'OKAY' },
  low:     { emoji: '😔', label: 'LOW' },
};
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export function IntimacyHomeScreen({ navigation }: Props) {
  // Whole-pixel calendar columns — a %-width 7th cell wraps on Android,
  // which is what left the Sunday column empty. See useGridCellWidth.
  const { onLayout: onGridLayout, cellWidth } = useGridCellWidth(7);
  const {
    entries, loading, refreshing, refresh, error, overview, lastEntry,
  } = useIntimacyTracker();

  const now = new Date();
  const todayIso = todayISO(now);
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const lead = (new Date(year, month, 1).getDay() + 6) % 7;   // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    const byDate: Record<string, { feeling?: IntimacyFeeling; who: IntimacyWho }> = {};
    entries.forEach(e => {
      if (e.date.startsWith(prefix)) byDate[e.date] = { feeling: e.feeling, who: e.who };
    });

    const cells: { day: number | null; iso?: string; emoji?: string; partner?: boolean }[] = [];
    for (let i = 0; i < lead; i++) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${prefix}-${String(d).padStart(2, '0')}`;
      const hit = byDate[iso];
      cells.push({
        day: d,
        iso,
        emoji: hit?.feeling ? FEELING_EMOJI[hit.feeling] : undefined,
        partner: hit?.who === 'partner',
      });
    }
    // Pad the tail so the last row keeps the 7-column rhythm.
    while (cells.length % 7 !== 0) cells.push({ day: null });
    return cells;
  }, [entries, now.getMonth(), now.getFullYear()]);

  /* Back sits on its own row: the main tab bar is hidden inside trackers, so
     without it there'd be no way out of this screen. */
  const backBtn = (
    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
      <AppText style={s.backArrow}>←</AppText>
    </TouchableOpacity>
  );

  // ── §11 loading — never show metrics that aren't loaded yet ────────────────
  if (loading && entries.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {backBtn}
        <View style={s.centre}>
          <ActivityIndicator color={ACCENT} />
          <AppText style={s.centreText}>Loading your entries…</AppText>
        </View>
      </SafeAreaView>
    );
  }

  // ── §11 error — retry rather than a blank screen ───────────────────────────
  if (error && entries.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {backBtn}
        <View style={s.centre}>
          <AppText style={s.centreTitle}>Unable to load your entries.</AppText>
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
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.trackers} />
        }
      >
        {backBtn}

        {/* Entries are already on screen, so this is a failed refresh rather
            than a dead end — inline, with a retry. */}
        {error ? (
          <View style={s.errorBanner}>
            <AppText variant="caption" color={Colors.error}>{error}</AppText>
            <TouchableOpacity onPress={refresh} hitSlop={8}>
              <AppText style={s.errorRetry}>Retry</AppText>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Last entry ──
            Hidden entirely until there's something to show. A first-time user
            shouldn't lead with an empty placeholder — the screen starts at
            This Month Overview instead, and this block appears above it once
            the first entry is logged. */}
        {lastEntry ? (
          <View style={s.block}>
            <View style={s.rowBetween}>
              <AppText style={s.blockTitleSm}>Last Entry</AppText>
              <AppText style={s.blockAside}>{fmtDate(lastEntry.date)}</AppText>
            </View>

            <TouchableOpacity
              style={s.lastCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('IntimacyEntryDetail', { id: lastEntry.id })}
            >
              {/* Teal glow. react-native has no blur filter, so it's faked with
                  stacked low-opacity circles rather than pulling in expo-blur
                  for one decorative element. */}
              <View style={[s.glow, s.glow1]} />
              <View style={[s.glow, s.glow2]} />
              <View style={[s.glow, s.glow3]} />

              <View style={s.lastLeft}>
                {lastEntry.who === 'partner'
                  ? <PartnerIcon width={58} height={58} />
                  : <SelfloveIcon width={58} height={58} />}
                <View>
                  <AppText style={s.lastTitle}>
                    {lastEntry.who === 'partner' ? 'With Partner' : 'Self Love'}
                  </AppText>
                  {lastEntry.protection ? (
                    <AppText
                      style={[
                        s.lastProtection,
                        { color: lastEntry.protection === 'protected' ? '#A4FFBB' : '#FF8A80' },
                      ]}
                    >
                      {lastEntry.protection === 'protected' ? 'Protected' : 'Unprotected'}
                    </AppText>
                  ) : null}
                  <AppText style={s.lastMeta}>
                    {fmtTime(lastEntry.time)} •{' '}
                    {new Date(lastEntry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                  </AppText>
                </View>
              </View>

              {lastEntry.moodAfter ? (
                <View style={s.lastMood}>
                  <AppText style={s.lastMoodEmoji}>{MOOD_AFTER_META[lastEntry.moodAfter].emoji}</AppText>
                  <AppText style={s.lastMoodLabel}>{MOOD_AFTER_META[lastEntry.moodAfter].label}</AppText>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── This month overview ── */}
        <View style={s.block}>
          <View style={s.rowBetween}>
            <AppText style={s.blockTitle}>This Month Overview</AppText>
            <TouchableOpacity onPress={() => navigation.navigate('IntimacyHistory')}>
              <AppText style={s.viewAll}>View All</AppText>
            </TouchableOpacity>
          </View>

          <View style={s.statRow}>
            <StatCard
              Icon={TotalEntries} label="TOTAL ENTRIES"
              value={String(overview.totalEntries)} sub="This Month"
            />
            <StatCard
              Icon={ProductedIcon} label="PROTECTED"
              value={overview.partnerCount ? String(overview.protectedPct) : '—'}
              valueSuffix={overview.partnerCount ? '%' : undefined}
              sub={overview.partnerCount
                ? `${overview.protectedCount} Out of ${overview.partnerCount}`
                : 'No partner entries'}
              subRight
            />
          </View>
          <View style={s.statRow}>
            <StatCard Icon={SelfloveIcon} label="SELF LOVE" value={String(overview.selfLoveCount)} sub="This Month" />
            <StatCard Icon={PartnerIcon} label="WITH PARTNER" value={String(overview.partnerCount)} sub="This Month" />
          </View>
        </View>

        {/* ── Calendar ── */}
        <View style={s.block}>
          <AppText style={s.blockTitle}>Calendar – {monthLabel}</AppText>

          <View style={s.calCard}>
            <View style={s.calHeader}>
              {WEEKDAYS.map(d => (
                <AppText key={d} style={s.calHeaderText}>{d}</AppText>
              ))}
            </View>

            <View style={s.calGrid} onLayout={onGridLayout}>
              {calendarDays.map((c, i) => {
                if (!c.day) return <View key={i} style={[s.calCell, { width: cellWidth }]} />;
                const isToday = c.iso === todayIso;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[s.calCell, { width: cellWidth }]}
                    activeOpacity={0.7}
                    // §8 — a date with entries opens them (History handles
                    // several on one day); an empty one offers to log instead
                    // of dropping the user on an empty list.
                    onPress={() => {
                      if (!c.iso) return;
                      if (c.emoji || c.partner) navigation.navigate('IntimacyHistory', { date: c.iso });
                      else navigation.navigate('LogIntimacy', { date: c.iso });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={c.iso
                      ? `${c.iso}${c.emoji || c.partner ? ', has an entry' : ', no entry'}`
                      : undefined}
                  >
                    <View style={[s.calNum, isToday && s.calNumToday]}>
                      <AppText
                        style={[
                          s.calNumText,
                          c.partner && s.calNumPartner,
                          isToday && s.calNumTodayText,
                        ]}
                      >
                        {c.day}
                      </AppText>
                    </View>
                    {c.emoji ? <AppText style={s.calEmoji}>{c.emoji}</AppText> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Quick actions ── */}
        <View style={s.block}>
          <AppText style={s.blockTitle}>Quick Actions</AppText>
          <View style={s.actionRow}>
            <QuickAction
              label="Log entry" tileBg="#FFF0F3"
              onPress={() => navigation.navigate('LogIntimacy')}
            >
              <AppText style={s.plusGlyph}>+</AppText>
            </QuickAction>

            <QuickAction
              label="History" tileBg="#F1F1FF"
              onPress={() => navigation.navigate('IntimacyHistory')}
            >
              <ListGlyph />
            </QuickAction>

            <QuickAction
              label="Insights" tileBg="#E9F2FF"
              onPress={() => navigation.navigate('IntimacyInsights')}
            >
              <ChartGlyph />
            </QuickAction>
          </View>
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
    </SafeAreaView>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function StatCard({
  Icon, label, value, valueSuffix, sub, subRight,
}: {
  Icon: React.ComponentType<SvgProps>; label: string; value: string;
  valueSuffix?: string; sub: string; subRight?: boolean;
}) {
  return (
    <View style={s.statCard}>
      <Icon width={40} height={40} />
      <View style={s.statBody}>
        <AppText style={s.statLabel} numberOfLines={1}>{label}</AppText>
        <View style={[s.statValueRow, subRight && s.statValueRowSpread]}>
          <View style={s.statValueGroup}>
            <AppText style={s.statValue}>{value}</AppText>
            {valueSuffix ? <AppText style={s.statValueSuffix}>{valueSuffix}</AppText> : null}
          </View>
          <AppText style={s.statSub} numberOfLines={1}>{sub}</AppText>
        </View>
      </View>
    </View>
  );
}

function QuickAction({
  label, tileBg, onPress, children,
}: { label: string; tileBg: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <TouchableOpacity style={s.action} activeOpacity={0.85} onPress={onPress}>
      <View style={[s.actionTile, { backgroundColor: tileBg }]}>{children}</View>
      <AppText style={s.actionLabel}>{label}</AppText>
    </TouchableOpacity>
  );
}

const ListGlyph = () => (
  <Svg width={22} height={19} viewBox="0 0 22 19" fill="none">
    {[2, 9, 16].map(y => (
      <React.Fragment key={y}>
        <Rect x={0} y={y} width={3} height={3} rx={1.5} fill="#8E8FFA" />
        <Rect x={7} y={y + 0.5} width={15} height={2} rx={1} fill="#8E8FFA" />
      </React.Fragment>
    ))}
  </Svg>
);

const ChartGlyph = () => (
  <Svg width={22} height={19} viewBox="0 0 22 19" fill="none">
    <Path
      d="M1 13.5L7 7.5L11 11.5L21 2"
      stroke="#4D96FF" strokeWidth={2.2}
      strokeLinecap="round" strokeLinejoin="round"
    />
    <Path d="M15 2H21V8" stroke="#4D96FF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

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
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  backBtn: { width: 40, height: 40, justifyContent: 'center', marginTop: 4 },
  backArrow: { fontSize: 24, color: '#141414' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12, marginBottom: 12,
  },
  errorRetry: { fontFamily: 'DMSans-Bold', fontSize: 13, color: '#141414' },

  // ── Loading / error (§11) ──
  centre: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingBottom: 80, gap: 12,
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

  block: { paddingTop: 20, gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blockTitle: { fontFamily: 'DMSans-Bold', fontSize: 20, color: '#141414' },
  blockTitleSm: { fontFamily: 'DMSans-Bold', fontSize: 18, color: '#141414' },
  blockAside: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#999999' },
  viewAll: { fontFamily: 'DMSans-Regular', fontSize: 14, color: '#999999' },

  // ── Last entry ──
  lastCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#141414', borderRadius: 24, padding: 20,
    overflow: 'hidden', ...CARD_SHADOW,
  },
  glow: { position: 'absolute', backgroundColor: '#008080', borderRadius: 9999 },
  glow1: { left: -60, top: -10, width: 200, height: 200, opacity: 0.10 },
  glow2: { left: -40, top: 10,  width: 150, height: 150, opacity: 0.12 },
  glow3: { left: -20, top: 30,  width: 100, height: 100, opacity: 0.14 },

  lastLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  lastTitle: { fontFamily: 'DMSans-Bold', fontSize: 16, color: Colors.white },
  lastProtection: { fontFamily: 'DMSans-Regular', fontSize: 14 },
  lastMeta: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#999999', paddingTop: 4 },

  lastMood: { alignItems: 'center', gap: 6 },
  lastMoodEmoji: { fontSize: 30, lineHeight: 38, includeFontPadding: false },
  lastMoodLabel: { fontFamily: 'DMSans-Bold', fontSize: 10, color: Colors.white },

  // ── Stats ──
  statRow: { flexDirection: 'row', gap: 16 },
  statCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
    minHeight: 74, padding: 16,
    backgroundColor: Colors.white, borderRadius: 24,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  statBody: { flex: 1, minWidth: 0 },
  statLabel: { fontFamily: 'DMSans-Bold', fontSize: 10, color: '#666666' },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValueRowSpread: { justifyContent: 'space-between', gap: 2 },
  statValueGroup: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: { fontFamily: 'DMSans-Bold', fontSize: 20, color: '#141414' },
  statValueSuffix: { fontFamily: 'DMSans-Bold', fontSize: 12, color: '#141414' },
  statSub: { fontFamily: 'DMSans-Regular', fontSize: 10, color: '#999999', flexShrink: 1 },

  // ── Calendar ──
  calCard: {
    backgroundColor: Colors.white, borderRadius: 24,
    paddingHorizontal: 10, paddingVertical: 20, gap: 16,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  calHeader: { flexDirection: 'row', paddingHorizontal: 8 },
  calHeaderText: {
    flex: 1, textAlign: 'center',
    fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#999999',
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  // Fixed 1/7 width plus a fixed height keeps every row aligned whether or not
  // its days carry an emoji.
  calCell: { height: 48, alignItems: 'center', gap: 2 },
  calNum: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  calNumToday: { backgroundColor: ACCENT },
  calNumText: { fontFamily: 'DMSans-Bold', fontSize: 14, color: '#141414' },
  // Partner entries carry the accent so the month reads at a glance.
  calNumPartner: { color: ACCENT },
  calNumTodayText: { color: Colors.white },
  calEmoji: { fontSize: 14, lineHeight: 18, includeFontPadding: false },

  // ── Quick actions ──
  actionRow: { flexDirection: 'row', gap: 16 },
  action: {
    flex: 1, alignItems: 'center', gap: 8, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: HAIRLINE,
  },
  actionTile: {
    alignSelf: 'stretch', marginHorizontal: 8, height: 98, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontFamily: 'DMSans-Bold', fontSize: 16, color: '#666666' },
  plusGlyph: { fontFamily: 'DMSans-Bold', fontSize: 24, color: '#FF728A' },

  // ── CTA ──
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    marginTop: 32, paddingVertical: 20, paddingHorizontal: 30,
    backgroundColor: '#141414', borderRadius: 9999, ...CARD_SHADOW,
  },
  ctaPlus: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  ctaPlusH: { position: 'absolute', width: 16, height: 2.5, borderRadius: 2, backgroundColor: Colors.white },
  ctaPlusV: { position: 'absolute', width: 2.5, height: 16, borderRadius: 2, backgroundColor: Colors.white },
  ctaText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: Colors.white },
});
