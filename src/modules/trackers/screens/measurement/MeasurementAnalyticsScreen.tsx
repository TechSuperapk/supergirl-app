/**
 * MeasurementAnalyticsScreen — weight analytics, per-field movement, progress
 * summary (weekly/monthly rate), and comparison against the previous entry /
 * last week / last month / a custom date.
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
import { DatePickerSheet } from '../../components/HabitOverlays';
import { useMeasurementTracker } from '../../hooks/useTrackers';

type Props = NativeStackScreenProps<any, 'MeasurementAnalytics'>;
type CompareKey = 'previous' | 'lastWeek' | 'lastMonth' | 'custom';

const COMPARE_TABS: { key: CompareKey; label: string }[] = [
  { key: 'previous',  label: 'Previous' },
  { key: 'lastWeek',  label: 'Last week' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'custom',    label: 'Custom' },
];

export function MeasurementAnalyticsScreen({ navigation }: Props) {
  const {
    entries, refreshing, refresh, error, analytics, comparisons, compareWithDate,
  } = useMeasurementTracker();

  const [tab, setTab] = useState<CompareKey>('previous');
  const [customDate, setCustomDate] = useState('');
  const [dateSheet, setDateSheet] = useState(false);

  const comparison = tab === 'custom'
    ? (customDate ? compareWithDate(customDate) : null)
    : comparisons[tab];

  if (entries.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}><BackArrowIcon /></TouchableOpacity>
          <AppText variant="headingSmall">Analytics</AppText>
          <View style={s.hBtn} />
        </View>
        <AppEmptyState
          emoji="📊"
          title="Start tracking your body measurements today."
          subtitle="Log a couple of entries and your analytics will appear here."
          actionLabel="Add First Measurement"
          onAction={() => navigation.navigate('MeasurementLog')}
        />
      </SafeAreaView>
    );
  }

  const a = analytics;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}><BackArrowIcon /></TouchableOpacity>
        <AppText variant="headingSmall">Analytics</AppText>
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

        {/* Weight analytics */}
        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Weight</AppText>
        <View style={s.grid}>
          <Stat label="Highest" value={a.highestWeight != null ? `${a.highestWeight} kg` : '—'} sub={a.highestWeightDate ?? undefined} />
          <Stat label="Lowest" value={a.lowestWeight != null ? `${a.lowestWeight} kg` : '—'} sub={a.lowestWeightDate ?? undefined} />
          <Stat label="Average" value={a.averageWeight != null ? `${a.averageWeight} kg` : '—'} />
          {/* §16 — a body measurement moving is not good or bad, so this is
              "Total change" with a sign rather than "lost"/"gained" in green
              and amber. The old version told anyone pregnant, building muscle
              or recovering from illness that their body was a warning. */}
          <Stat
            label="Total change"
            value={a.totalWeightChange != null
              ? `${a.totalWeightChange > 0 ? '+' : ''}${a.totalWeightChange} kg`
              : '—'}
          />
        </View>

        {/* Progress summary */}
        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Progress Summary</AppText>
        <View style={s.card}>
          <Row label="Measurements logged" value={String(a.totalMeasurements)} />
          <Row
            label="Average weekly change"
            value={a.avgWeeklyKg != null ? `${a.avgWeeklyKg > 0 ? '+' : ''}${a.avgWeeklyKg} kg` : '—'}
          />
          <Row
            label="Average monthly change"
            value={a.avgMonthlyKg != null ? `${a.avgMonthlyKg > 0 ? '+' : ''}${a.avgMonthlyKg} kg` : '—'}
            last
          />
          {a.avgWeeklyKg == null ? (
            <AppText variant="caption" color={Colors.textLight} style={{ marginTop: 6 }}>
              Log at least two entries with a weight to see your rate of change.
            </AppText>
          ) : null}
        </View>

        {/* Per-field movement since the first log */}
        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Change Since First Log</AppText>
        <View style={s.card}>
          {a.fieldChanges.map((f, i) => (
            <View key={f.field} style={[s.row, i === a.fieldChanges.length - 1 && { borderBottomWidth: 0 }]}>
              <AppText variant="body" color={Colors.textSecondary} style={{ flex: 1 }}>{f.label}</AppText>
              {f.totalChange == null ? (
                <AppText variant="caption" color={Colors.textLight}>Not enough data</AppText>
              ) : f.totalChange === 0 ? (
                <AppText variant="caption" color={Colors.textLight}>No change</AppText>
              ) : (
                /* Neutral: an arrow shows direction, colour doesn't grade it. */
                <AppText variant="headingSmall" color={Colors.textPrimary}>
                  {f.totalChange < 0 ? '↓' : '↑'} {Math.abs(f.totalChange)} {f.unit}
                </AppText>
              )}
            </View>
          ))}
        </View>

        {/* Comparison */}
        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Comparison</AppText>
        <View style={s.tabRow}>
          {COMPARE_TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, tab === t.key && s.tabOn]}
              activeOpacity={0.85}
              onPress={() => { setTab(t.key); if (t.key === 'custom' && !customDate) setDateSheet(true); }}
            >
              <AppText variant="caption" color={tab === t.key ? Colors.white : Colors.textSecondary}>{t.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'custom' ? (
          <TouchableOpacity style={s.customBtn} activeOpacity={0.85} onPress={() => setDateSheet(true)}>
            <AppText variant="body" color={customDate ? Colors.textPrimary : Colors.textLight}>
              {customDate ? `Comparing against ${customDate}` : 'Pick a date to compare against'}
            </AppText>
            <AppText style={{ fontSize: 15 }}>📅</AppText>
          </TouchableOpacity>
        ) : null}

        {!comparison ? (
          <View style={s.card}>
            <AppText variant="body" color={Colors.textMuted}>
              {tab === 'custom' && !customDate
                ? 'Pick a date above to compare.'
                : 'No earlier entry to compare against for this range yet.'}
            </AppText>
          </View>
        ) : (
          <View style={s.card}>
            <AppText variant="caption" color={Colors.textMuted} style={{ marginBottom: Spacing.sm }}>
              Latest vs {new Date(comparison.baseline.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </AppText>
            {comparison.rows.map((r, i) => (
              <View key={r.field} style={[s.row, i === comparison.rows.length - 1 && { borderBottomWidth: 0 }]}>
                <AppText variant="body" color={Colors.textSecondary} style={{ flex: 1 }}>{r.label}</AppText>
                {r.diff == null ? (
                  <AppText variant="caption" color={Colors.textLight}>—</AppText>
                ) : (
                  <>
                    <AppText variant="caption" color={Colors.textMuted}>
                      {r.then} → {r.now} {r.unit}
                    </AppText>
                    <View style={{ width: 96, alignItems: 'flex-end' }}>
                      {r.dir === 'none' ? (
                        <AppText variant="caption" color={Colors.textLight}>No change</AppText>
                      ) : (
                        /* §16 — direction only. Green for down and red for up
                           would be grading the user's body. */
                        <AppText variant="caption" color={Colors.textPrimary}>
                          {r.dir === 'down' ? '↓' : '↑'} {Math.abs(r.diff)} {r.unit}
                          {r.pct != null ? ` (${Math.abs(r.pct)}%)` : ''}
                        </AppText>
                      )}
                    </View>
                  </>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <DatePickerSheet
        visible={dateSheet}
        title="Compare against"
        value={customDate || new Date().toISOString().split('T')[0]}
        onConfirm={setCustomDate}
        onClose={() => setDateSheet(false)}
      />
    </SafeAreaView>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={s.statCard}>
      <AppText variant="caption" color={Colors.textMuted}>{label}</AppText>
      <AppText variant="headingLarge" color={color ?? Colors.textPrimary}>{value}</AppText>
      {sub ? <AppText variant="caption" color={Colors.textLight}>{sub}</AppText> : null}
    </View>
  );
}

function Row({ label, value, color, last }: { label: string; value: string; color?: string; last?: boolean }) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      <AppText variant="body" color={Colors.textSecondary} style={{ flex: 1 }}>{label}</AppText>
      <AppText variant="headingSmall" color={color ?? Colors.textPrimary}>{value}</AppText>
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
  errorBanner: { backgroundColor: '#FDE7EA', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: { width: '48%', backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, gap: 2, ...Shadows.sm },

  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.base, ...Shadows.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 11,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },

  tabRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.sm },
  tab: { flex: 1, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.bgInput, alignItems: 'center' },
  tabOn: { backgroundColor: Colors.black },

  customBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.base,
    marginBottom: Spacing.sm, ...Shadows.sm,
  },
});
