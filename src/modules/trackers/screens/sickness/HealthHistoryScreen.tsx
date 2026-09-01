/**
 * HealthHistoryScreen — one chronological health record with three views:
 * Timeline (symptoms + doses merged), Symptoms, and Medication. Each supports
 * Today/Week/Month/Year/All filtering, keyword search, and status filtering for
 * medication.
 */
import { BackArrowIcon } from '../../../../shared/components/AppBackButton';
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';
import { useSicknessTracker } from '../../hooks/useTrackers';
import { useMedicationDoses } from '../../hooks/useMedicationDoses';
import { SicknessPeriod, MedicationStatus } from '../../types';
import { severityTag } from './sicknessMeta';

type Props = NativeStackScreenProps<any, 'HealthHistory'>;
type Tab = 'timeline' | 'symptoms' | 'medication';

const TABS: { key: Tab; label: string }[] = [
  { key: 'timeline',   label: 'Timeline' },
  { key: 'symptoms',   label: 'Symptoms' },
  { key: 'medication', label: 'Medication' },
];
const PERIODS: { key: SicknessPeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year',  label: 'Year' },
  { key: 'all',   label: 'All' },
];
const STATUS_FILTERS: (MedicationStatus | 'all')[] = ['all', 'taken', 'due', 'missed', 'skipped'];

const STATUS_COLOR: Record<MedicationStatus, string> = {
  taken:   '#16A34A',
  due:     '#F59E0B',
  missed:  '#DC2626',
  skipped: '#6B7280',
};

const fmtTime = (hhmm?: string) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

export function HealthHistoryScreen({ navigation, route }: Props) {
  const { symptoms, medications, removeSymptom } = useSicknessTracker();
  const { timelineFor, periodStart, doses } = useMedicationDoses(medications, symptoms);

  // The dashboard deep-links straight to the view the user asked for (§12):
  // "Active Symptoms → View" lands on Symptoms, not on the timeline.
  const [tab, setTab] = useState<Tab>(route.params?.view ?? 'timeline');
  const [period, setPeriod] = useState<SicknessPeriod>('week');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MedicationStatus | 'all'>('all');

  const q = query.trim().toLowerCase();
  const start = periodStart(period);

  const symptomRows = symptoms
    .filter(s => s.date >= start)
    .filter(s => !q || s.symptom.toLowerCase().includes(q) || (s.notes ?? '').toLowerCase().includes(q));

  const doseRows = doses
    .filter(d => d.date >= start)
    .filter(d => statusFilter === 'all' || d.status === statusFilter)
    .filter(d => !q || d.medicationName.toLowerCase().includes(q));

  const timelineRows = timelineFor(period).filter(item => {
    if (!q) return true;
    return item.kind === 'symptom'
      ? item.entry.symptom.toLowerCase().includes(q)
      : item.entry.medicationName.toLowerCase().includes(q);
  });

  const empty =
    (tab === 'timeline' && timelineRows.length === 0) ||
    (tab === 'symptoms' && symptomRows.length === 0) ||
    (tab === 'medication' && doseRows.length === 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}><BackArrowIcon /></TouchableOpacity>
        <AppText variant="headingSmall">Health history</AppText>
        <View style={s.hBtn} />
      </View>

      <View style={s.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && s.tabOn]} onPress={() => setTab(t.key)}>
            <AppText variant="label" color={tab === t.key ? Colors.white : Colors.textSecondary}>{t.label}</AppText>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={s.search as any}
        placeholder={tab === 'medication' ? 'Search medicine…' : 'Search symptom or note…'}
        placeholderTextColor={Colors.textLight}
        value={query}
        onChangeText={setQuery}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p.key} style={[s.seg, period === p.key && s.segOn]} onPress={() => setPeriod(p.key)}>
            <AppText variant="caption" color={period === p.key ? Colors.white : Colors.textSecondary}>{p.label}</AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'medication' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {STATUS_FILTERS.map(st => (
            <TouchableOpacity
              key={st}
              style={[s.seg, statusFilter === st && s.segOn]}
              onPress={() => setStatusFilter(st)}
            >
              <AppText variant="caption" color={statusFilter === st ? Colors.white : Colors.textSecondary}>
                {st === 'all' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      {empty ? (
        <AppEmptyState
          emoji="🩺"
          title={q ? 'No matches' : 'Nothing logged yet'}
          subtitle={q ? 'Try a different search or widen the date range.' : 'Log a symptom or a dose to build your history.'}
          actionLabel="Quick log"
          onAction={() => navigation.navigate('SicknessLog')}
        />
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {tab === 'timeline' && timelineRows.map(item => (
            <View key={`${item.kind}-${item.id}`} style={s.row}>
              <View style={[s.dot, { backgroundColor: item.kind === 'symptom' ? '#F97316' : STATUS_COLOR[item.entry.status] }]} />
              <View style={{ flex: 1 }}>
                {item.kind === 'symptom' ? (
                  <>
                    <AppText variant="headingSmall" color={Colors.textPrimary}>{item.entry.symptom}</AppText>
                    <AppText variant="caption" color={Colors.textMuted}>
                      {item.date} · {fmtTime(item.time)} · {severityTag(item.entry.severity).label}
                      {item.entry.temperature != null ? ` · ${item.entry.temperature}°${item.entry.temperatureUnit ?? 'C'}` : ''}
                    </AppText>
                  </>
                ) : (
                  <>
                    <AppText variant="headingSmall" color={Colors.textPrimary}>{item.entry.medicationName}</AppText>
                    <AppText variant="caption" color={Colors.textMuted}>
                      {item.date} · {fmtTime(item.time)} · {item.entry.status}
                    </AppText>
                  </>
                )}
              </View>
              <AppText style={{ fontSize: 15 }}>{item.kind === 'symptom' ? '🤒' : '💊'}</AppText>
            </View>
          ))}

          {tab === 'symptoms' && symptomRows.map(sx => {
            const sev = severityTag(sx.severity);
            return (
              <TouchableOpacity
                key={sx.id}
                style={s.row}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('SicknessLog', { id: sx.id })}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="headingSmall" color={Colors.textPrimary}>
                    {sx.symptom}{sx.resolved ? '  ✓' : ''}
                  </AppText>
                  <AppText variant="caption" color={Colors.textMuted}>
                    {sx.date}{sx.time ? ` · ${fmtTime(sx.time)}` : ''}
                    {sx.temperature != null ? ` · ${sx.temperature}°${sx.temperatureUnit ?? 'C'}` : ''}
                    {sx.duration ? ` · ${sx.duration}` : ''}
                  </AppText>
                  {sx.notes ? (
                    <AppText variant="caption" color={Colors.textLight} numberOfLines={1}>{sx.notes}</AppText>
                  ) : null}
                </View>
                <View style={[s.pill, { backgroundColor: sev.bg }]}>
                  <AppText variant="caption" color={sev.text}>{sev.label}</AppText>
                </View>
                <TouchableOpacity
                  onPress={() => removeSymptom(sx.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ paddingLeft: 8 }}
                >
                  <AppText style={{ fontSize: 15 }}>🗑️</AppText>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          {tab === 'medication' && doseRows.map(d => (
            <View key={d.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <AppText variant="headingSmall" color={Colors.textPrimary}>{d.medicationName}</AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  {d.date} · {fmtTime(d.time)}
                  {d.sideEffects?.length ? ` · ${d.sideEffects.join(', ')}` : ''}
                </AppText>
              </View>
              <View style={[s.pill, { backgroundColor: STATUS_COLOR[d.status] + '22' }]}>
                <AppText variant="caption" color={STATUS_COLOR[d.status]}>{d.status.toUpperCase()}</AppText>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  hBtn: { minWidth: 40 },

  tabRow: {
    flexDirection: 'row', gap: 6, backgroundColor: Colors.bgInput, borderRadius: Radius.full,
    padding: 4, marginHorizontal: Spacing.base,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: Radius.full },
  tabOn: { backgroundColor: Colors.black },

  search: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md, paddingHorizontal: Spacing.md,
    paddingVertical: 10, marginHorizontal: Spacing.base, marginTop: Spacing.sm,
    fontFamily: 'DMSans-Regular', fontSize: 14, color: Colors.textPrimary,
  } as any,

  filterRow: { gap: 6, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  seg: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.bgInput },
  segOn: { backgroundColor: Colors.black },

  scroll: { padding: Spacing.base, paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 8, ...Shadows.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
});
