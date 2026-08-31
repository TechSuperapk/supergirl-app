/**
 * SymptomDetailScreen — how often one symptom shows up and where it lands in
 * the cycle. Reached by tapping a symptom card on Insights.
 *
 * The percentage is computed the same way as on Insights (days carrying the
 * symptom ÷ days logged in the window), so the two screens can't disagree. The
 * phase breakdown answers the question the Insights card can't: not just "how
 * often", but "when".
 */
import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { usePeriodTracker } from '../../hooks/useTrackers';
import { symptomIcon } from '../../components/PeriodTimeline';

type Props = NativeStackScreenProps<any, 'SymptomDetail'>;

const PHASES = [
  { key: 'menstrual',  label: 'Menstrual',  color: '#FE5151' },
  { key: 'follicular', label: 'Follicular', color: '#FF9F43' },
  { key: 'ovulation',  label: 'Ovulation',  color: '#F59E0B' },
  { key: 'luteal',     label: 'Luteal',     color: '#A855F7' },
] as const;

const fmt = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function SymptomDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const symptom: string = route.params?.symptom ?? '';
  const { dayLogs, phaseFor } = usePeriodTracker();

  const since = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  }, []);

  const stats = useMemo(() => {
    const window = dayLogs.filter(l => l.date >= since);
    const hits = window.filter(l => l.symptoms.includes(symptom));
    // Denominator is days actually logged, not calendar days — a day with no
    // entry is unknown, not a day without the symptom.
    const pct = window.length ? Math.round((hits.length / window.length) * 100) : 0;

    const byPhase: Record<string, number> = {};
    hits.forEach(l => {
      const p = phaseFor(l.date);
      if (p) byPhase[p] = (byPhase[p] ?? 0) + 1;
    });
    const phased = Object.values(byPhase).reduce((a, b) => a + b, 0);

    return {
      loggedDays: window.length,
      hits: hits.slice(0, 8),
      hitCount: hits.length,
      pct,
      byPhase,
      phased,
    };
  }, [dayLogs, since, symptom, phaseFor]);

  const { Icon, color } = symptomIcon(symptom);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle} numberOfLines={1}>{symptom}</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.heroCard}>
          <Icon width={48} height={48} color={color} />
          <AppText style={s.heroValue}>{stats.pct}%</AppText>
          <AppText style={s.heroSub}>
            {stats.hitCount} of {stats.loggedDays} logged day{stats.loggedDays === 1 ? '' : 's'} in the last 6 months
          </AppText>
        </View>

        {stats.hitCount === 0 ? (
          <View style={s.emptyCard}>
            <AppText style={s.emptyTitle}>Nothing recorded yet</AppText>
            <AppText style={s.emptySub}>
              Keep tracking to build your cycle history — patterns need a few cycles of data.
            </AppText>
          </View>
        ) : (
          <>
            <View style={s.card}>
              <AppText style={s.cardTitle}>When it shows up</AppText>
              {stats.phased === 0 ? (
                <AppText style={s.muted}>
                  Log a period so these days can be placed within a cycle.
                </AppText>
              ) : (
                PHASES.map(p => {
                  const n = stats.byPhase[p.key] ?? 0;
                  const pct = Math.round((n / stats.phased) * 100);
                  return (
                    <View key={p.key} style={s.barRow}>
                      <AppText style={s.barLabel}>{p.label}</AppText>
                      <View style={s.barTrack}>
                        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: p.color }]} />
                      </View>
                      <AppText style={s.barPct}>{pct}%</AppText>
                    </View>
                  );
                })
              )}
            </View>

            <View style={s.card}>
              <AppText style={s.cardTitle}>Recent days</AppText>
              {stats.hits.map(l => (
                <TouchableOpacity
                  key={l.id}
                  style={s.dayRow}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('PeriodDayDetail', { date: l.date })}
                >
                  <AppText style={s.dayDate}>{fmt(l.date)}</AppText>
                  <AppText style={s.dayMeta} numberOfLines={1}>
                    {l.symptoms.length > 1 ? `+${l.symptoms.length - 1} other` : 'Only this'}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={s.infoCard}>
          <AppText style={s.infoText}>
            This is a summary of what you've logged, not a medical assessment. Talk to a clinician
            about symptoms that worry you.
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const HAIRLINE = 'rgba(153,153,153,0.20)';
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
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'DMSans-SemiBold', fontSize: 22, color: '#141414' },

  scroll: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },

  heroCard: {
    padding: 24, borderRadius: 30, gap: 6, alignItems: 'center',
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  heroValue: { fontFamily: 'DMSans-Bold', fontSize: 34, lineHeight: 42, color: '#141414' },
  heroSub: { fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 19, color: '#999999', textAlign: 'center' },

  card: {
    padding: 18, borderRadius: 24, gap: 12, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  cardTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: '#141414' },
  muted: { fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 19, color: '#999999' },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 78, fontFamily: 'DMSans-Medium', fontSize: 12, color: '#6B7280' },
  barTrack: { flex: 1, minWidth: 0, height: 8, borderRadius: 999, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 999 },
  barPct: { width: 36, textAlign: 'right', fontFamily: 'DMSans-Bold', fontSize: 12, color: '#141414' },

  dayRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  dayDate: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#141414' },
  dayMeta: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#9CA3AF', flexShrink: 1 },

  emptyCard: {
    padding: 24, borderRadius: 24, gap: 6, alignItems: 'center',
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  emptyTitle: { fontFamily: 'DMSans-Bold', fontSize: 16, color: '#141414' },
  emptySub: { fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 20, color: '#999999', textAlign: 'center' },

  infoCard: { padding: 14, borderRadius: 16, backgroundColor: '#F9FAFB' },
  infoText: { fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 18, color: '#6B7280' },
});
