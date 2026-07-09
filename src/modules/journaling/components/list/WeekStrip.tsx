// WeekStrip — month label + a Monday-based week row with a selectable day.
// Days that have entries show a small dot. Purely a date scrubber/indicator.
import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing } from '../../../../shared/theme/spacing';

interface Props {
  selected: string;                 // yyyy-mm-dd
  onSelect: (iso: string) => void;
  markedDays?: Set<string>;         // days with entries
}

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function WeekStrip({ selected, onSelect, markedDays }: Props) {
  const { colors } = useTheme();
  const sel = dayjs(selected);

  const week = useMemo(() => {
    const dow = (sel.day() + 6) % 7;      // 0 = Monday
    const monday = sel.subtract(dow, 'day');
    return Array.from({ length: 7 }, (_, i) => monday.add(i, 'day'));
  }, [selected]);

  return (
    <View style={s.wrap}>
      <View style={s.monthRow}>
        <AppText variant="headingSmall" color={colors.textPrimary}>{sel.format('MMM YYYY')}</AppText>
        <AppText variant="headingSmall" color={colors.textMuted}>  ⌄</AppText>
      </View>
      <View style={s.week}>
        {week.map((d, i) => {
          const iso = d.format('YYYY-MM-DD');
          const on = iso === selected;
          const marked = !!markedDays?.has(iso) && !on;
          return (
            <TouchableOpacity key={iso} style={s.day} activeOpacity={0.75} onPress={() => onSelect(iso)}>
              <AppText variant="caption" color={colors.textMuted}>{DOW[i]}</AppText>
              <View style={[s.num, on && { backgroundColor: colors.textPrimary }]}>
                <AppText variant="label" color={on ? colors.bgCard : colors.textPrimary}>{d.format('D')}</AppText>
              </View>
              <View style={[s.dot, { backgroundColor: marked ? colors.primary : 'transparent' }]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.base, paddingBottom: Spacing.sm },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 6, flex: 1 },
  num: { width: 34, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
