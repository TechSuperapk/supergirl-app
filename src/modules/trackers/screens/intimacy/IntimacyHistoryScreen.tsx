/**
 * IntimacyHistoryScreen — all entries grouped by month (newest first), with a
 * This Month / This Year / All filter. Tap a row to open its Entry Details
 * preview. If navigated with a `date` param (from the Home calendar), it
 * pre-filters to that single day.
 */
import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { useIntimacyTracker } from '../../hooks/useTrackers';
import { IntimacyEntry, IntimacyFeeling, IntimacyPeriod } from '../../types';

import PartnerIcon  from '../../components/PartnerIcon';
import SelfloveIcon from '../../components/SelfloveIcon';

type Props = NativeStackScreenProps<any, 'IntimacyHistory'>;

const FEELING_EMOJI: Record<IntimacyFeeling, string> = {
  loved: '🥰', happy: '😃', relaxed: '😌', passionate: '😍', neutral: '😐', disappointed: '😔',
};
const PERIODS: { key: IntimacyPeriod; label: string }[] = [
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year' },
  { key: 'all',   label: 'All' },
];

const fmtTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  // Zero-padded hour so the times form a straight column down the list.
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const monthLabel = (dateISO: string) =>
  new Date(dateISO + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export function IntimacyHistoryScreen({ navigation, route }: Props) {
  const filterDate: string | undefined = route.params?.date;
  const { entries, refreshing, refresh, statsFor } = useIntimacyTracker();
  // A date param from the calendar wins; otherwise use the period filter.
  const [period, setPeriod] = useState<IntimacyPeriod>('all');

  const filtered = filterDate
    ? entries.filter(e => e.date === filterDate)
    : statsFor(period).entries;

  const groups = useMemo(() => {
    const map = new Map<string, IntimacyEntry[]>();
    filtered.forEach(e => {
      const key = monthLabel(e.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries());
  }, [filtered]);

  // Render immediately; the empty state covers "still loading" and "nothing
  // logged yet" alike, so a slow/unreachable API never blocks the screen.
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>Intimacy history</AppText>
        <View style={s.hBtn} />
      </View>

      {!filterDate ? (
        <View style={s.filterRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[s.seg, period === p.key && s.segOn]}
              activeOpacity={0.85}
              onPress={() => setPeriod(p.key)}
            >
              <AppText style={[s.segText, period === p.key && s.segTextOn]}>{p.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {filtered.length === 0 ? (
        <AppEmptyState
          emoji="💗"
          title="No entries yet"
          subtitle="Log your first entry to see it here."
          actionLabel="Log entry"
          onAction={() => navigation.navigate('LogIntimacy')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.trackers} />
          }
        >
          {groups.map(([month, rows]) => (
            <View key={month} style={s.group}>
              <AppText style={s.monthLabel}>{month}</AppText>

              <View style={s.rows}>
                {rows.map(e => {
                  const isPartner = e.who === 'partner';
                  return (
                    <TouchableOpacity
                      key={e.id}
                      style={s.card}
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate('IntimacyEntryDetail', { id: e.id })}
                    >
                      <View style={s.cardInner}>
                        <View style={s.left}>
                          <View style={[s.avatar, { backgroundColor: isPartner ? '#F4F2F3' : '#FDF2F8' }]}>
                            {isPartner
                              ? <PartnerIcon width={40} height={40} />
                              : <SelfloveIcon width={40} height={40} />}
                          </View>
                          <View style={s.leftText}>
                            <AppText style={s.who} numberOfLines={1}>
                              {isPartner ? 'With Partner' : 'Self Love'}
                            </AppText>
                            <AppText style={s.time} numberOfLines={1}>{fmtTime(e.time)}</AppText>
                          </View>
                        </View>

                        <View style={s.right}>
                          {/* Fixed-width, right-aligned column so "Protected",
                              "Unprotected" and the self-love dash all end on the
                              same line and the mood pills stay in a column. */}
                          {e.protection ? (
                            <AppText
                              style={[
                                s.protection,
                                { color: e.protection === 'protected' ? '#059669' : '#FB7185' },
                              ]}
                              numberOfLines={1}
                            >
                              {e.protection === 'protected' ? 'Protected' : 'Unprotected'}
                            </AppText>
                          ) : (
                            <AppText style={[s.protection, s.dash]}>— —</AppText>
                          )}

                          <View style={s.moodPill}>
                            <AppText style={s.moodEmoji}>
                              {e.feeling ? FEELING_EMOJI[e.feeling] : '🙂'}
                            </AppText>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

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

  // Flat header — no card, shadow or rounded corners behind the title.
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingTop: 20 },
  seg: {
    flex: 1, paddingVertical: 8, borderRadius: 9999, alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6',
  },
  segOn: { backgroundColor: '#141414', borderColor: '#141414' },
  segText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#6B7280' },
  segTextOn: { fontFamily: 'DMSans-Bold', color: Colors.white },

  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 32 },
  group: { gap: 16 },
  monthLabel: { fontFamily: 'DMSans-Bold', fontSize: 16, lineHeight: 24, color: '#111827' },
  rows: { gap: 10 },

  card: {
    backgroundColor: Colors.white, borderRadius: 30, padding: 10,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  cardInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 6, paddingRight: 8, paddingVertical: 5,
  },

  // Left takes whatever the fixed-width right side leaves. minWidth:0 is what
  // actually lets the name truncate — without it a flex child refuses to
  // shrink below its content and pushes the right column off the card.
  left: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  leftText: { flex: 1, minWidth: 0 },
  who: { fontFamily: 'DMSans-Bold', fontSize: 16, lineHeight: 22, color: '#1F2937' },
  time: { fontFamily: 'DMSans-SemiBold', fontSize: 12, lineHeight: 16, color: '#10B981' },

  right: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  protection: {
    width: 74, textAlign: 'right',
    fontFamily: 'DMSans-SemiBold', fontSize: 12, lineHeight: 16,
  },
  dash: { fontFamily: 'DMSans-Bold', color: '#D1D5DB', letterSpacing: 1.2 },
  moodPill: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6',
  },
  moodEmoji: { fontSize: 24, lineHeight: 32, includeFontPadding: false },
});
