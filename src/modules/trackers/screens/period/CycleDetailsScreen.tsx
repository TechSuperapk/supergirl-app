/**
 * CycleDetailsScreen — the full picture of the cycle currently running: day
 * count, the period's date range, current phase, and the estimated fertile
 * window, ovulation and next period.
 *
 * Everything here is derived from `usePeriodTracker`, the same source the
 * dashboard, calendar, history and insights read, so the numbers can never
 * disagree between screens. Predictions are labelled "Estimated" without
 * exception — they're an average of tracked cycles, not a guarantee.
 */
import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path, Circle } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { usePeriodTracker } from '../../hooks/useTrackers';

type Props = NativeStackScreenProps<any, 'CycleDetails'>;

const PHASE_LABEL: Record<string, string> = {
  menstrual: 'Menstrual Phase',
  follicular: 'Follicular Phase',
  ovulation: 'Ovulation',
  luteal: 'Luteal Phase',
};
const PHASE_NOTE: Record<string, string> = {
  menstrual: 'Your period is underway.',
  follicular: 'Your body is preparing to release an egg.',
  ovulation: 'An egg is estimated to be released around now.',
  luteal: 'The stretch between ovulation and your next period.',
};

const fmt = (iso?: string | null) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

const InfoGlyph = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9.2} stroke="#9CA3AF" strokeWidth={1.6} />
    <Path d="M12 11v5.5" stroke="#9CA3AF" strokeWidth={1.8} strokeLinecap="round" />
    <Circle cx={12} cy={7.8} r={1.1} fill="#9CA3AF" />
  </Svg>
);

export function CycleDetailsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const {
    hasHistory, currentCycleDay, avgCycleLength, prediction, phase,
    currentPeriodRange, fertileWindow, ovulationDate, activePeriod, currentCycle,
  } = usePeriodTracker();

  const cycleLength = avgCycleLength ?? prediction.cycleLength ?? null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>Cycle Details</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {!hasHistory ? (
          <View style={s.emptyCard}>
            <AppText style={s.emptyTitle}>Start tracking your cycle</AppText>
            <AppText style={s.emptySub}>
              Log your period to start seeing your cycle patterns.
            </AppText>
            <TouchableOpacity
              style={s.cta}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('LogPeriod', {})}
            >
              <AppText style={s.ctaText}>Log Period</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Current cycle ── */}
            <View style={s.heroCard}>
              <AppText style={s.heroLabel}>Current Cycle</AppText>
              <AppText style={s.heroValue}>
                Day {currentCycleDay ?? '—'}
                {cycleLength ? <AppText style={s.heroValueSub}> of {cycleLength}</AppText> : null}
              </AppText>
              {!cycleLength ? (
                <AppText style={s.heroNote}>
                  Cycle length needs a second logged period before it can be estimated.
                </AppText>
              ) : null}
            </View>

            <View style={s.card}>
              <Row
                label="Period"
                value={currentPeriodRange
                  ? `${fmt(currentPeriodRange.start)} – ${currentPeriodRange.end ? fmt(currentPeriodRange.end) : 'ongoing'}`
                  : '—'}
                tint="#FE5151"
              />
              <Row
                label="Current Phase"
                value={phase ? PHASE_LABEL[phase] : '—'}
                caption={phase ? PHASE_NOTE[phase] : undefined}
                tint="#A855F7"
              />
              <Row
                label="Estimated Fertile Window"
                value={fertileWindow ? `${fmt(fertileWindow.start)} – ${fmt(fertileWindow.end)}` : 'Not enough data'}
                tint="#FF9F43"
                estimated={!!fertileWindow}
              />
              <Row
                label="Estimated Ovulation"
                value={ovulationDate ? fmt(ovulationDate) : 'Not enough data'}
                tint="#FF9F43"
                estimated={!!ovulationDate}
              />
              <Row
                label="Next Expected Period"
                value={activePeriod
                  ? 'Period ongoing'
                  : prediction.nextStart ? fmt(prediction.nextStart) : 'Not enough data'}
                tint="#FE5151"
                estimated={!activePeriod && !!prediction.nextStart}
                last
              />
            </View>

            <View style={s.infoCard}>
              <InfoGlyph />
              <AppText style={s.infoText}>
                Cycle predictions are estimates based on your tracked history and may vary from
                cycle to cycle.
              </AppText>
            </View>

            <TouchableOpacity
              style={s.cta}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('EditCycle', { id: currentCycle?.id })}
            >
              <AppText style={s.ctaText}>Edit Cycle</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.ghostBtn}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('PeriodInsights')}
            >
              <AppText style={s.ghostText}>View Insights</AppText>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label, value, caption, tint, estimated, last,
}: {
  label: string; value: string; caption?: string;
  tint?: string; estimated?: boolean; last?: boolean;
}) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      <View style={s.rowText}>
        <AppText style={s.rowLabel}>{label}</AppText>
        {caption ? <AppText style={s.rowCaption}>{caption}</AppText> : null}
      </View>
      <View style={s.rowRight}>
        <AppText style={[s.rowValue, tint ? { color: tint } : null]} numberOfLines={1}>{value}</AppText>
        {estimated ? <AppText style={s.rowBadge}>Estimated</AppText> : null}
      </View>
    </View>
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
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  scroll: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },

  heroCard: {
    padding: 24, borderRadius: 30, gap: 4, alignItems: 'center',
    backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FFE0E0',
  },
  heroLabel: { fontFamily: 'DMSans-Medium', fontSize: 13, letterSpacing: 0.4, color: '#B45252' },
  heroValue: { fontFamily: 'DMSans-Bold', fontSize: 32, lineHeight: 40, color: '#141414' },
  heroValueSub: { fontFamily: 'DMSans-Medium', fontSize: 20, color: '#9CA3AF' },
  heroNote: {
    fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 18,
    color: '#B45252', textAlign: 'center', marginTop: 4,
  },

  card: {
    borderRadius: 24, paddingHorizontal: 18, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#141414' },
  rowCaption: { fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 17, color: '#9CA3AF' },
  rowRight: { alignItems: 'flex-end', gap: 2, flexShrink: 0, maxWidth: 150 },
  rowValue: { fontFamily: 'DMSans-Bold', fontSize: 14, color: '#141414', textAlign: 'right' },
  rowBadge: {
    fontFamily: 'DMSans-Medium', fontSize: 10, letterSpacing: 0.3, color: '#9CA3AF',
  },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 14, borderRadius: 16, backgroundColor: '#F9FAFB',
  },
  infoText: { flex: 1, minWidth: 0, fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 18, color: '#6B7280' },

  emptyCard: {
    padding: 24, borderRadius: 30, gap: 8, alignItems: 'center',
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  emptyTitle: { fontFamily: 'DMSans-Bold', fontSize: 18, color: '#141414' },
  emptySub: {
    fontFamily: 'DMSans-Regular', fontSize: 14, lineHeight: 21,
    color: '#999999', textAlign: 'center', marginBottom: 8,
  },

  cta: {
    alignSelf: 'stretch', height: 60, borderRadius: 9999, backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { fontFamily: 'DMSans-Bold', fontSize: 16, color: Colors.white },
  ghostBtn: {
    height: 56, borderRadius: 9999, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: HAIRLINE,
  },
  ghostText: { fontFamily: 'DMSans-Bold', fontSize: 15, color: '#141414' },
});
