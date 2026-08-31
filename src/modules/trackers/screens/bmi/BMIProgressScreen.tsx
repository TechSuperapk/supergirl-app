/**
 * BMIProgressScreen — weight and BMI trend charts plus analytics summary,
 * filtered by range. Reached from "View Progress" on the log screen.
 */
import { BackArrowIcon } from '../../../../shared/components/AppBackButton';
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';
import { MiniLineChart } from '../../components/MiniLineChart';
import { useBMITracker } from '../../hooks/useTrackers';
import { BMIPeriod } from '../../types';
import { BMI_CATEGORY_META } from './bmiMeta';

type Props = NativeStackScreenProps<any, 'BMIProgress'>;

const PERIODS: { key: BMIPeriod; label: string }[] = [
  { key: '7d',  label: '7D' },
  { key: '30d', label: '30D' },
  { key: '3m',  label: '3M' },
  { key: '6m',  label: '6M' },
  { key: '1y',  label: '1Y' },
  { key: 'all', label: 'All' },
];

export function BMIProgressScreen({ navigation }: Props) {
  const {
    entries, refreshing, refresh, error, statsFor,
    weightGoal, goalProgressPct, goalRemainingKg, goalAchieved,
  } = useBMITracker();
  const [period, setPeriod] = useState<BMIPeriod>('30d');

  const st = statsFor(period);
  const periodLabel = PERIODS.find(p => p.key === period)!.label;

  if (entries.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}><BackArrowIcon /></TouchableOpacity>
          <AppText variant="headingSmall">Progress</AppText>
          <View style={s.hBtn} />
        </View>
        <AppEmptyState
          emoji="📈"
          title="Start tracking your BMI today."
          subtitle="Save a couple of measurements and your trends will appear here."
          actionLabel="Add First Measurement"
          onAction={() => navigation.navigate('BMILog')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}><BackArrowIcon /></TouchableOpacity>
        <AppText variant="headingSmall">Progress</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.trackers} />}
      >
        {error ? (
          <View style={s.errorBanner}><AppText variant="caption" color={Colors.error}>{error}</AppText></View>
        ) : null}

        <View style={s.filterRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[s.seg, period === p.key && s.segActive]}
              activeOpacity={0.85}
              onPress={() => setPeriod(p.key)}
            >
              <AppText variant="caption" color={period === p.key ? Colors.white : Colors.textSecondary}>{p.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {st.total < 2 ? (
          <View style={s.card}>
            <AppText variant="body" color={Colors.textMuted}>
              Only {st.total} measurement{st.total === 1 ? '' : 's'} in this range — add more, or widen the range, to see trends.
            </AppText>
          </View>
        ) : (
          <>
            <View style={s.card}>
              <View style={s.rowBetween}>
                <AppText variant="headingSmall" color={Colors.textPrimary}>Weight Trend</AppText>
                <AppText variant="caption" color={Colors.textMuted}>{periodLabel}</AppText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.sm }}>
                <MiniLineChart data={st.weightSeries} color="#7C3AED" height={150} />
              </ScrollView>
            </View>

            <View style={[s.card, { marginTop: Spacing.md }]}>
              <View style={s.rowBetween}>
                <AppText variant="headingSmall" color={Colors.textPrimary}>BMI Trend</AppText>
                <AppText variant="caption" color={Colors.textMuted}>{periodLabel}</AppText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.sm }}>
                <MiniLineChart data={st.bmiSeries} color="#16A34A" height={150} />
              </ScrollView>
            </View>
          </>
        )}

        {/* Goal progress */}
        {weightGoal ? (
          <>
            <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Goal Progress</AppText>
            <View style={s.card}>
              <View style={s.rowBetween}>
                <AppText variant="body" color={Colors.textSecondary}>Target</AppText>
                <AppText variant="headingSmall" color={Colors.textPrimary}>{weightGoal.targetWeightKg} kg</AppText>
              </View>
              {weightGoal.targetDate ? (
                <View style={[s.rowBetween, { marginTop: 8 }]}>
                  <AppText variant="body" color={Colors.textSecondary}>Target date</AppText>
                  <AppText variant="headingSmall" color={Colors.textPrimary}>{weightGoal.targetDate}</AppText>
                </View>
              ) : null}
              <View style={[s.rowBetween, { marginTop: 8 }]}>
                <AppText variant="body" color={Colors.textSecondary}>Remaining</AppText>
                <AppText variant="headingSmall" color={goalAchieved ? Colors.success : Colors.textPrimary}>
                  {goalAchieved ? 'Reached 🎉' : goalRemainingKg != null ? `${Math.abs(goalRemainingKg)} kg` : '—'}
                </AppText>
              </View>
              {goalProgressPct != null ? (
                <>
                  <View style={s.track}>
                    <View style={[s.fill, { width: `${Math.min(100, goalProgressPct)}%` }]} />
                  </View>
                  <AppText variant="caption" color={Colors.textMuted} style={{ marginTop: 6 }}>
                    {goalProgressPct}% of the way there
                  </AppText>
                </>
              ) : null}
            </View>
          </>
        ) : null}

        {/* Analytics */}
        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Analytics</AppText>
        <View style={s.grid}>
          <Stat label="Current BMI" value={st.currentBmi != null ? String(st.currentBmi) : '—'} />
          <Stat label="Average BMI" value={st.averageBmi != null ? String(st.averageBmi) : '—'} />
          <Stat label="Lowest BMI" value={st.lowestBmi != null ? String(st.lowestBmi) : '—'} color={Colors.success} />
          <Stat label="Highest BMI" value={st.highestBmi != null ? String(st.highestBmi) : '—'} color={Colors.error} />
          <Stat label="Average Weight" value={st.averageWeight != null ? `${st.averageWeight} kg` : '—'} />
          <Stat
            label={st.weightChange != null && st.weightChange < 0 ? 'Weight Lost' : 'Weight Gained'}
            value={st.weightChange != null ? `${Math.abs(st.weightChange)} kg` : '—'}
            color={st.weightChange != null ? (st.weightChange < 0 ? Colors.success : Colors.warning) : undefined}
          />
          <Stat label="Measurements" value={String(st.total)} />
          <Stat
            label="Goal Achievement"
            value={goalProgressPct != null ? `${Math.min(100, goalProgressPct)}%` : '—'}
          />
        </View>

        {/* Records in range */}
        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Measurements</AppText>
        {st.entries.map(e => {
          const meta = BMI_CATEGORY_META[e.category];
          return (
            <TouchableOpacity
              key={e.id}
              style={s.recordRow}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('BMIRecordDetail', { id: e.id })}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="body" color={Colors.textPrimary}>{e.date}</AppText>
                <AppText variant="caption" color={Colors.textMuted}>{e.weightKg} kg · {e.heightCm} cm</AppText>
              </View>
              <AppText variant="headingSmall" color={Colors.textPrimary}>{e.bmi}</AppText>
              <View style={[s.tag, { backgroundColor: meta.color + '22' }]}>
                <AppText variant="caption" color={meta.color}>{meta.label}</AppText>
              </View>
              <AppText style={{ fontSize: 15, color: Colors.textLight }}>›</AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.statCard}>
      <AppText variant="caption" color={Colors.textMuted}>{label}</AppText>
      <AppText variant="headingLarge" color={color ?? Colors.textPrimary}>{value}</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  hBtn: { minWidth: 40 },
  scroll: { padding: Spacing.base, paddingBottom: 60 },
  sectionLbl: { marginTop: Spacing.lg, marginBottom: Spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorBanner: { backgroundColor: '#FDE7EA', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },

  filterRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.base },
  seg: { flex: 1, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.bgInput, alignItems: 'center' },
  segActive: { backgroundColor: Colors.black },

  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.base, ...Shadows.sm },
  track: { height: 8, borderRadius: 4, backgroundColor: Colors.bgInput, marginTop: Spacing.base, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: Colors.success },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: { width: '48%', backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, gap: 2, ...Shadows.sm },

  recordRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgCard,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 6, ...Shadows.sm,
  },
  tag: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4 },
});
