// JournalCalendarStrip — month label (tap to open full calendar) + a horizontally
// scrollable strip of the month's days. Days with entries show a dot.
import React, { useMemo, useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing } from '../../../../shared/theme/spacing';

interface Props {
  selected: string;
  onSelect: (iso: string) => void;
  markedDays?: Set<string>;
  onOpenMonth?: () => void;
}

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CELL = 52;

export function JournalCalendarStrip({ selected, onSelect, markedDays, onOpenMonth }: Props) {
  const { colors } = useTheme();
  const sel = dayjs(selected);
  const monthKey = sel.format('YYYY-MM');

  const days = useMemo(() => {
    const start = sel.startOf('month');
    return Array.from({ length: sel.daysInMonth() }, (_, i) => start.date(i + 1));
  }, [monthKey]);

  const ref = useRef<ScrollView>(null);
  useEffect(() => {
    const idx = sel.date() - 1;
    ref.current?.scrollTo({ x: Math.max(0, (idx - 2) * CELL), animated: false });
  }, [selected]);

  const dowIndex = (d: dayjs.Dayjs) => (d.day() + 6) % 7;

  return (
    <View style={s.wrap}>
      <TouchableOpacity style={s.month} activeOpacity={0.7} onPress={onOpenMonth}>
        <AppText variant="headingSmall" color={colors.textPrimary}>{sel.format('MMM YYYY')}</AppText>
        <AppText variant="headingSmall" color={colors.textMuted}>  ⌄</AppText>
      </TouchableOpacity>
      <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        {days.map(d => {
          const iso = d.format('YYYY-MM-DD');
          const on = iso === selected;
          const marked = !!markedDays?.has(iso) && !on;
          return (
            <TouchableOpacity key={iso} style={[s.day, { width: CELL }]} activeOpacity={0.75} onPress={() => onSelect(iso)}>
              <AppText variant="caption" color={colors.textMuted}>{DOW[dowIndex(d)]}</AppText>
              <View style={[s.num, on && { backgroundColor: colors.textPrimary }]}>
                <AppText variant="label" color={on ? colors.bgCard : colors.textPrimary}>{d.date()}</AppText>
              </View>
              <View style={[s.dot, { backgroundColor: marked ? colors.primary : 'transparent' }]} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingTop: Spacing.base, paddingBottom: Spacing.sm },
  month: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  row: { paddingHorizontal: Spacing.lg - 6 },
  day: { alignItems: 'center', gap: 6 },
  num: { width: 34, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
