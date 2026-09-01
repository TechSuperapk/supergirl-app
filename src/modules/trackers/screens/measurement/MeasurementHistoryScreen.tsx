/**
 * MeasurementHistoryScreen — Week/Month/Year/All filter, a metric chip
 * selector (Weight/Bust/Waist/Hips/…), a trend line for the selected
 * metric, a dated log list with delta-vs-previous, and highest/lowest/
 * total-change summary cards. Tap a row → Edit/Delete bottom sheet.
 */
import { BackArrowIcon } from '../../../../shared/components/AppBackButton';
import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';
import { Period, periodStart } from '../../utils/expenseAnalytics';
import { MiniLineChart } from '../../components/MiniLineChart';
import { EntryActionSheet } from '../../components/EntryActionSheet';
import { useMeasurementTracker } from '../../hooks/useTrackers';
import { MEASUREMENT_FIELDS, MeasurementEntry, MeasurementField } from '../../types';

type Props = NativeStackScreenProps<any, 'MeasurementHistory'>;
const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }, { key: 'year', label: 'Year' }, { key: 'all', label: 'All' },
];

export function MeasurementHistoryScreen({ navigation }: Props) {
  const { entries, refreshing, refresh, seriesFor, statsFor, removeMeasurement } = useMeasurementTracker();
  const [period, setPeriod] = useState<Period>('month');
  const [metric, setMetric] = useState<MeasurementField>('weightKg');
  const [selected, setSelected] = useState<MeasurementEntry | null>(null);

  const metricMeta = MEASUREMENT_FIELDS.find(f => f.key === metric)!;
  const filtered = period === 'all' ? entries : entries.filter(e => e.date >= periodStart(period));
  const withMetric = filtered.filter(e => e[metric] != null);

  const series = useMemo(() => seriesFor(metric, 12).map(p => ({ label: p.date.slice(5), value: p.value })), [entries, metric]);
  const stats = statsFor(metric);

  // Render immediately; the empty state covers both "loading" and "nothing yet".
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}><BackArrowIcon /></TouchableOpacity>
        <AppText variant="headingSmall">Measurement History</AppText>
        <View style={s.hBtn} />
      </View>

      <View style={s.filters}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p.key} style={[s.seg, period === p.key && s.segActive]} onPress={() => setPeriod(p.key)}>
            <AppText variant="caption" color={period === p.key ? Colors.white : Colors.textSecondary}>{p.label}</AppText>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.trackers} />}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: Spacing.sm }}>
          {MEASUREMENT_FIELDS.map(f => (
            <TouchableOpacity key={f.key} style={[s.metricChip, metric === f.key && s.metricChipActive]} onPress={() => setMetric(f.key)}>
              <AppText variant="label" color={metric === f.key ? Colors.white : Colors.textSecondary}>{f.label}</AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.rowBetween}>
          <AppText variant="headingSmall" color={Colors.textPrimary}>{metricMeta.label} ({metricMeta.unit})</AppText>
        </View>
        <View style={s.chartCard}>
          {withMetric.length === 0 ? (
            <AppText variant="body" color={Colors.textMuted}>No {metricMeta.label.toLowerCase()} logs in this range yet.</AppText>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <MiniLineChart data={series} height={180} />
            </ScrollView>
          )}
        </View>

        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>History</AppText>
        {withMetric.length === 0 ? (
          <AppEmptyState emoji="📏" title="Nothing here" subtitle="Log a measurement to see it here." actionLabel="Add measurement" onAction={() => navigation.navigate('MeasurementLog')} />
        ) : withMetric.map((e, i) => {
          const prev = withMetric[i + 1];
          const delta = prev ? Math.round(((e[metric] as number) - (prev[metric] as number)) * 10) / 10 : null;
          return (
            <TouchableOpacity
              key={e.id}
              style={s.row}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('MeasurementDetail', { id: e.id })}
              onLongPress={() => setSelected(e)}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="body" color={Colors.textPrimary}>{e.date}</AppText>
              </View>
              <AppText variant="headingSmall" color={Colors.textPrimary} style={{ width: 90, textAlign: 'right' }}>{e[metric]} {metricMeta.unit}</AppText>
              <AppText variant="caption" color={delta == null ? Colors.textLight : delta < 0 ? Colors.success : delta > 0 ? Colors.error : Colors.textLight} style={{ width: 70, textAlign: 'right' }}>
                {delta == null ? '—' : delta === 0 ? 'No change' : `${delta < 0 ? '↓' : '↑'} ${Math.abs(delta)}`}
              </AppText>
            </TouchableOpacity>
          );
        })}

        {stats && (
          <View style={s.statsRow}>
            <MiniStat label="Highest" value={`${stats.highest} ${metricMeta.unit}`} sub={stats.highestDate} icon="↑" color={Colors.error} />
            <MiniStat label="Lowest" value={`${stats.lowest} ${metricMeta.unit}`} sub={stats.lowestDate} icon="↓" color={Colors.success} />
            <MiniStat label="Total Change" value={`${stats.totalChange > 0 ? '+' : ''}${stats.totalChange} ${metricMeta.unit}`} sub="since first log" icon="•" color={Colors.textPrimary} />
          </View>
        )}
      </ScrollView>

      <EntryActionSheet
        visible={!!selected}
        title={selected?.date}
        subtitle={selected ? `${metricMeta.label}: ${selected[metric] ?? '—'} ${metricMeta.unit}` : undefined}
        onClose={() => setSelected(null)}
        onEdit={() => selected && navigation.navigate('MeasurementLog', { id: selected.id })}
        onDelete={() => selected && removeMeasurement(selected.id)}
        deleteConfirmMessage="Delete this measurement log? This cannot be undone."
      />
    </SafeAreaView>
  );
}

function MiniStat({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: string; color: string }) {
  return (
    <View style={s.statCard}>
      <AppText variant="caption" color={Colors.textMuted}>{icon} {label}</AppText>
      <AppText variant="headingSmall" color={color}>{value}</AppText>
      {sub ? <AppText variant="caption" color={Colors.textLight}>{sub}</AppText> : null}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgApp },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  hBtn: { minWidth: 40 },
  filters: { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm },
  seg: { flex: 1, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.bgInput, alignItems: 'center' },
  segActive: { backgroundColor: Colors.black },

  scroll: { padding: Spacing.base, paddingBottom: 60 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  sectionLbl: { marginTop: Spacing.lg, marginBottom: Spacing.sm },

  metricChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.bgInput },
  metricChipActive: { backgroundColor: Colors.black },

  chartCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.base, marginTop: Spacing.sm, ...Shadows.sm, minHeight: 120, justifyContent: 'center' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8, ...Shadows.sm,
  },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.base },
  statCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, ...Shadows.sm },
});
