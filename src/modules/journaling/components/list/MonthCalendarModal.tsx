// MonthCalendarModal — full month grid to pick any date (with prev/next month).
import React, { useState, useEffect } from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';

interface Props {
  visible: boolean;
  selected: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
  markedDays?: Set<string>;
}

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function MonthCalendarModal({ visible, selected, onSelect, onClose, markedDays }: Props) {
  const { colors } = useTheme();
  const [cursor, setCursor] = useState(dayjs(selected).startOf('month'));
  useEffect(() => { if (visible) setCursor(dayjs(selected).startOf('month')); }, [visible, selected]);

  const firstDow = (cursor.day() + 6) % 7;
  const cells: (dayjs.Dayjs | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: cursor.daysInMonth() }, (_, i) => cursor.date(i + 1)),
  ];
  const today = dayjs().format('YYYY-MM-DD');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[s.sheet, { backgroundColor: colors.bgCard }]}>
          <View style={s.nav}>
            <TouchableOpacity onPress={() => setCursor(c => c.subtract(1, 'month'))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[s.arr, { color: colors.textPrimary }]}>‹</Text>
            </TouchableOpacity>
            <AppText variant="headingSmall" color={colors.textPrimary}>{cursor.format('MMMM YYYY')}</AppText>
            <TouchableOpacity onPress={() => setCursor(c => c.add(1, 'month'))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[s.arr, { color: colors.textPrimary }]}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={s.dowRow}>
            {DOW.map((d, i) => <AppText key={i} variant="caption" color={colors.textMuted} align="center" style={s.dowCell}>{d}</AppText>)}
          </View>
          <View style={s.grid}>
            {cells.map((d, i) => {
              if (!d) return <View key={i} style={s.cell} />;
              const iso = d.format('YYYY-MM-DD');
              const on = iso === selected;
              const isToday = iso === today;
              return (
                <TouchableOpacity key={i} style={s.cell} activeOpacity={0.75} onPress={() => { onSelect(iso); onClose(); }}>
                  <View style={[s.num, on && { backgroundColor: colors.textPrimary }]}>
                    <AppText variant="body" color={on ? colors.bgCard : (isToday ? colors.primary : colors.textPrimary)}>{d.date()}</AppText>
                  </View>
                  <View style={[s.dot, { backgroundColor: markedDays?.has(iso) && !on ? colors.primary : 'transparent' }]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: Spacing.lg, backgroundColor: '#00000066' },
  sheet: { borderRadius: Radius.xl, padding: Spacing.lg },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.base },
  arr: { fontSize: 26, paddingHorizontal: 8 },
  dowRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  dowCell: { width: `${100 / 7}%` },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4, gap: 3 },
  num: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
