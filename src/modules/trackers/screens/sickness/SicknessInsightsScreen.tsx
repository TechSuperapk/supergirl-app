/**
 * SicknessInsightsScreen — symptom frequency (last 30 days), medication
 * adherence rate, and a recovery timeline (average symptom severity per
 * week, so a downward trend reads as "recovering").
 */
import { BackArrowIcon } from '../../../../shared/components/AppBackButton';
import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';
import { MiniBarChart } from '../../components/MiniBarChart';
import { MiniLineChart } from '../../components/MiniLineChart';
import { useSicknessTracker } from '../../hooks/useTrackers';

type Props = NativeStackScreenProps<any, 'SicknessInsights'>;
const SEVERITY_SCORE: Record<string, number> = { mild: 1, moderate: 2, severe: 3 };

export function SicknessInsightsScreen({ navigation }: Props) {
  const { symptoms, medications, loading, topSymptoms, adherencePct, takenCount, skippedCount, missedCount } = useSicknessTracker();

  // Recovery timeline — average severity score per week, last 6 weeks.
  const weeklySeverity = Array.from({ length: 6 }, (_, i) => {
    const end = new Date(); end.setDate(end.getDate() - (5 - i) * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    const startISO = start.toISOString().split('T')[0];
    const endISO = end.toISOString().split('T')[0];
    const inRange = symptoms.filter(sy => sy.date >= startISO && sy.date <= endISO);
    const avg = inRange.length
      ? inRange.reduce((sum, sy) => sum + (SEVERITY_SCORE[sy.severity] ?? 2), 0) / inRange.length
      : 0;
    return { label: `W${i + 1}`, value: Math.round(avg * 10) / 10 };
  });
  const trendingDown = weeklySeverity[5].value > 0 && weeklySeverity[5].value < weeklySeverity[0].value;
  const hasRecentData = weeklySeverity.some(w => w.value > 0);

  // Render immediately; stats read as "—" until data arrives.

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}><BackArrowIcon /></TouchableOpacity>
        <AppText variant="headingSmall">Sickness Insights</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Symptom Frequency (30 days)</AppText>
        {topSymptoms.length === 0 ? (
          <View style={s.card}><AppText variant="body" color={Colors.textMuted}>No symptoms logged in the last 30 days.</AppText></View>
        ) : (
          <View style={s.card}>
            <MiniBarChart data={topSymptoms.map(([label, value]) => ({ label, value, color: Colors.trackers }))} />
          </View>
        )}

        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Medication Adherence</AppText>
        <View style={s.card}>
          {adherencePct === null ? (
            <AppText variant="body" color={Colors.textMuted}>Log a few medication doses to see your adherence rate.</AppText>
          ) : (
            <>
              <View style={s.rowBetween}>
                <AppText variant="displayMedium" color={adherencePct >= 80 ? Colors.success : adherencePct >= 50 ? Colors.warning : Colors.error}>
                  {adherencePct}%
                </AppText>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="caption" color={Colors.textMuted}>{takenCount} taken · {skippedCount} skipped · {missedCount} missed</AppText>
                </View>
              </View>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${adherencePct}%`, backgroundColor: adherencePct >= 80 ? Colors.success : adherencePct >= 50 ? Colors.warning : Colors.error }]} />
              </View>
            </>
          )}
        </View>

        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Recovery Timeline</AppText>
        <View style={s.card}>
          {!hasRecentData ? (
            <AppText variant="body" color={Colors.textMuted}>Not enough recent symptom logs to show a trend yet.</AppText>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <MiniLineChart data={weeklySeverity} color={trendingDown ? Colors.success : Colors.error} height={130} />
              </ScrollView>
              <AppText variant="body" color={trendingDown ? Colors.success : Colors.textSecondary} style={{ marginTop: Spacing.sm }}>
                {trendingDown ? '📉 Symptom severity is trending down — looking like recovery.' : 'Average weekly symptom severity (1 = mild, 3 = severe).'}
              </AppText>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgApp },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  hBtn: { minWidth: 40 },
  scroll: { padding: Spacing.base, paddingBottom: 60 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLbl: { marginTop: Spacing.lg, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.base, ...Shadows.sm },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: Colors.bgInput, overflow: 'hidden', marginTop: Spacing.sm },
  barFill: { height: 10, borderRadius: 5 },
});
