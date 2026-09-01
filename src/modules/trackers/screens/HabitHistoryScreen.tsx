/**
 * HabitHistoryScreen — deleted (and paused) habits. Restore or permanently
 * remove. Reached after deleting a habit from the Add Habit screen.
 */
import { BackArrowIcon } from '../../../shared/components/AppBackButton';
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState } from '../../../store';
import { AppText } from '../../../shared/components/AppText';
import { Colors } from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { useHabitBuilder } from '../hooks/useHabitBuilder';
import { ConfirmDialog } from '../components/HabitOverlays';
import { Habit } from '../types';

type Props = NativeStackScreenProps<any, 'HabitHistory'>;

export function HabitHistoryScreen({ navigation }: Props) {
  const habits = useSelector((st: RootState) => st.trackers.habits);
  const deleted = habits.filter(h => h.status === 'deleted');
  const { restoreHabit, purgeHabit } = useHabitBuilder();
  const [toPurge, setToPurge] = useState<Habit | null>(null);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <BackArrowIcon />
        </TouchableOpacity>
        <AppText variant="headingSmall">History</AppText>
        <View style={s.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {deleted.length === 0 ? (
          <View style={s.empty}>
            <AppText style={{ fontSize: 40, marginBottom: 8 }}>🗂️</AppText>
            <AppText variant="body" color={Colors.textMuted}>No deleted habits yet.</AppText>
          </View>
        ) : deleted.map(h => (
          <View key={h.id} style={s.card}>
            <View style={[s.dot, { backgroundColor: h.color }]} />
            <View style={{ flex: 1 }}>
              <AppText variant="headingSmall">{h.name}</AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                {h.targetAmount ? `${h.targetAmount} ${h.targetUnit ?? ''} · ` : ''}Deleted
              </AppText>
            </View>
            <TouchableOpacity style={s.restoreBtn} onPress={() => restoreHabit(h)}>
              <AppText variant="bodySmall" color={Colors.primary}>Restore</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={s.purgeBtn} onPress={() => setToPurge(h)}>
              <AppText variant="bodySmall" color={Colors.error}>Remove</AppText>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <ConfirmDialog
        visible={!!toPurge}
        title="Delete permanently"
        message={`Permanently remove "${toPurge?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete forever"
        destructive
        onCancel={() => setToPurge(null)}
        onConfirm={async () => { if (toPurge) await purgeHabit(toPurge); setToPurge(null); }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgSplash },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  headerBtn: { minWidth: 48, paddingVertical: 6 },
  scroll: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 48 },
  empty: { alignItems: 'center', paddingVertical: Spacing['4xl'] },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, ...Shadows.sm,
  },
  dot: { width: 32, height: 32, borderRadius: 16 },
  restoreBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  purgeBtn: { paddingHorizontal: 8, paddingVertical: 8 },
});
