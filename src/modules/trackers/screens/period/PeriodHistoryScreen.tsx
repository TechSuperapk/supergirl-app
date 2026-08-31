/**
 * PeriodHistoryScreen — all "Log Today" day-entries grouped by month, shown on
 * the same dated timeline as the Insights preview. Tap a row for the day
 * detail, long-press for the Edit/Delete sheet.
 */
import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { EntryActionSheet } from '../../components/EntryActionSheet';
import { PeriodTimeline } from '../../components/PeriodTimeline';
import { usePeriodTracker } from '../../hooks/useTrackers';
import { PeriodDayLog } from '../../types';

type Props = NativeStackScreenProps<any, 'PeriodHistory'>;

const monthLabel = (dateISO: string) =>
  new Date(dateISO + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export function PeriodHistoryScreen({ navigation }: Props) {
  const { dayLogs, refreshing, refresh, removeDayLog } = usePeriodTracker();
  const [selected, setSelected] = useState<PeriodDayLog | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, PeriodDayLog[]>();
    dayLogs.forEach(l => {
      const key = monthLabel(l.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    });
    return Array.from(map.entries());
  }, [dayLogs]);

  // Render immediately; the empty state covers loading and no-data alike.
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>Period history</AppText>
        <View style={s.hBtn} />
      </View>

      {dayLogs.length === 0 ? (
        <AppEmptyState
          emoji="🩸"
          title="No entries yet"
          subtitle="Log today's entry to see it here."
          actionLabel="Log Today"
          onAction={() => navigation.navigate('LogPeriod')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#FF5A5F" />
          }
        >
          {groups.map(([month, rows]) => (
            <View key={month} style={s.group}>
              <AppText style={s.monthLabel}>{month}</AppText>
              {/* History has room to breathe, so it shows more symptom chips
                  per row than the Insights preview does. */}
              <PeriodTimeline
                logs={rows}
                maxSymptoms={5}
                onPressLog={l => navigation.navigate('PeriodDayDetail', { date: l.date })}
                onLongPressLog={setSelected}
              />
            </View>
          ))}
        </ScrollView>
      )}

      <EntryActionSheet
        visible={!!selected}
        title={selected?.date}
        subtitle={selected ? `${selected.flow} flow${selected.mood ? ` · ${selected.mood}` : ''}` : undefined}
        onClose={() => setSelected(null)}
        onEdit={() => selected && navigation.navigate('LogPeriod', { date: selected.date })}
        onDelete={() => selected && removeDayLog(selected.id)}
        deleteConfirmMessage="Delete this day's log? This cannot be undone."
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  scroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, gap: 32 },
  group: { gap: 24 },
  monthLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 18, color: '#141414' },
});
