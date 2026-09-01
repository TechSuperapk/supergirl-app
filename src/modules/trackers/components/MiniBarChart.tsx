/**
 * MiniBarChart — dependency-free vertical bar chart (Views only). Used for the
 * Expense daily-trend and income-vs-expense visuals.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../../../shared/components/AppText';
import { Colors } from '../../../shared/theme/colors';

export interface Bar { label: string; value: number; color?: string; value2?: number; color2?: string; }

export function MiniBarChart({ data, height = 120 }: { data: Bar[]; height?: number }) {
  const max = Math.max(1, ...data.map(d => Math.max(d.value, d.value2 ?? 0)));
  return (
    <View style={[s.wrap, { height: height + 22 }]}>
      {data.map((d, i) => (
        <View key={`${d.label}-${i}`} style={s.col}>
          <View style={[s.barsRow, { height }]}>
            <View style={[s.bar, { height: Math.max(3, (d.value / max) * height), backgroundColor: d.color ?? Colors.primary }]} />
            {d.value2 !== undefined && (
              <View style={[s.bar, { height: Math.max(3, (d.value2 / max) * height), backgroundColor: d.color2 ?? Colors.success }]} />
            )}
          </View>
          <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>{d.label}</AppText>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 10, borderRadius: 4 },
});
