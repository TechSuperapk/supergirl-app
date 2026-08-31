/**
 * WaterDayScreen — every individual water entry for one date, with that day's
 * total against the goal. Reached by tapping a day in Water History. Rows open
 * the entry detail; the goal-met state is celebrated inline.
 */
import { BackArrowIcon } from '../../../../shared/components/AppBackButton';
import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';
import { useWaterTracker } from '../../hooks/useTrackers';

type Props = NativeStackScreenProps<any, 'WaterDay'>;

const fmtTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};
const litres = (ml: number) => `${Math.round((ml / 1000) * 100) / 100} L`;

export function WaterDayScreen({ navigation, route }: Props) {
  const date: string = route.params?.date;
  const { logsFor, byDate, goalMl } = useWaterTracker();

  const rows = date ? logsFor(date) : [];
  const total = date ? (byDate[date] ?? 0) : 0;
  const pct = goalMl ? Math.round((total / goalMl) * 100) : 0;
  const met = goalMl > 0 && total >= goalMl;

  const dateLabel = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}><BackArrowIcon /></TouchableOpacity>
        <AppText variant="headingSmall">Day details</AppText>
        <View style={s.hBtn} />
      </View>

      {rows.length === 0 ? (
        <AppEmptyState
          emoji="💧"
          title={`Nothing logged on ${date ?? 'this day'}`}
          subtitle="Add an entry for this day to see it here."
          actionLabel="Log water"
          onAction={() => navigation.replace('LogWater', { date })}
        />
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <AppText variant="headingLarge" color={Colors.textPrimary}>{dateLabel}</AppText>

          <View style={[s.totalCard, met && { backgroundColor: '#DCFCE7' }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color={Colors.textMuted}>Total intake</AppText>
              <AppText variant="displayMedium" color={met ? '#15803D' : Colors.textPrimary}>{litres(total)}</AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                Goal {litres(goalMl)} · {pct}% complete
              </AppText>
            </View>
            <AppText style={{ fontSize: 34 }}>{met ? '🎉' : '💧'}</AppText>
          </View>

          {met ? (
            <AppText variant="caption" color={Colors.success} style={{ marginTop: 6 }}>
              Goal reached on this day — nicely done.
            </AppText>
          ) : null}

          <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>
            Entries ({rows.length})
          </AppText>
          {rows.map(l => (
            <TouchableOpacity
              key={l.id}
              style={s.row}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('WaterEntryDetail', { id: l.id })}
            >
              <View style={s.icon}><AppText style={{ fontSize: 16 }}>💧</AppText></View>
              <View style={{ flex: 1 }}>
                <AppText variant="headingSmall" color={Colors.textPrimary}>{l.amountMl} ml</AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  {fmtTime(l.time)}{l.notes ? ` · ${l.notes}` : ''}
                </AppText>
              </View>
              <AppText style={{ fontSize: 16, color: Colors.textLight }}>›</AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={s.fab} activeOpacity={0.9} onPress={() => navigation.navigate('LogWater', { date })}>
        <AppText style={{ fontSize: 18, color: Colors.white }}>＋</AppText>
        <AppText variant="button" color={Colors.white}>Add to this day</AppText>
      </TouchableOpacity>
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
  scroll: { padding: Spacing.base, paddingBottom: 110 },
  sectionLbl: { marginTop: Spacing.lg, marginBottom: Spacing.sm },

  totalCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.base,
    marginTop: Spacing.base, ...Shadows.sm,
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 8, ...Shadows.sm,
  },
  icon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#E0F2FE',
    alignItems: 'center', justifyContent: 'center',
  },

  fab: {
    position: 'absolute', left: Spacing.lg, right: Spacing.lg, bottom: Spacing.lg,
    flexDirection: 'row', gap: 8, backgroundColor: Colors.black, borderRadius: Radius.full,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center', ...Shadows.lg,
  },
});
