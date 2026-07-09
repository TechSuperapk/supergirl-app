// CalendarPickerSheet — bottom-sheet month calendar for choosing an entry's
// date. Same backdrop/sheet chrome as the app's other bottom-sheet popups
// (e.g. AllTypesSheet) so it feels consistent.
import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';

interface Props {
  visible:  boolean;
  date:     Date;
  onSelect: (d: Date) => void;
  onClose:  () => void;
}

const MONTHS   = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_HDRS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarPickerSheet({ visible, date, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  const [yr, setYr] = useState(date.getFullYear());
  const [mo, setMo] = useState(date.getMonth());

  // Re-sync the visible month to the entry's date each time the sheet opens.
  React.useEffect(() => {
    if (visible) { setYr(date.getFullYear()); setMo(date.getMonth()); }
  }, [visible]);

  const prevMonth = () => (mo === 0 ? (setMo(11), setYr(y => y - 1)) : setMo(m => m - 1));
  const nextMonth = () => (mo === 11 ? (setMo(0), setYr(y => y + 1)) : setMo(m => m + 1));

  // Monday-first grid — leading/trailing cells from the previous/next month
  // are shown faded so the grid always fills complete rows.
  const firstOffset = (new Date(yr, mo, 1).getDay() + 6) % 7;
  const daysInMonth  = new Date(yr, mo + 1, 0).getDate();
  const daysInPrev   = new Date(yr, mo, 0).getDate();
  const totalCells   = Math.ceil((firstOffset + daysInMonth) / 7) * 7;
  const trailing     = totalCells - firstOffset - daysInMonth;

  type Cell = { day: number; inMonth: boolean; y: number; m: number };
  const cells: Cell[] = [];
  for (let i = firstOffset - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, inMonth: false, y: mo === 0 ? yr - 1 : yr, m: mo === 0 ? 11 : mo - 1 });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true, y: yr, m: mo });
  for (let d = 1; d <= trailing; d++) cells.push({ day: d, inMonth: false, y: mo === 11 ? yr + 1 : yr, m: mo === 11 ? 0 : mo + 1 });

  const isSelected = (c: Cell) => c.y === date.getFullYear() && c.m === date.getMonth() && c.day === date.getDate();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[s.sheet, { backgroundColor: colors.bgCard }]}>
          <View style={[s.grabber, { backgroundColor: colors.divider }]} />

          <View style={s.nav}>
            <TouchableOpacity onPress={prevMonth} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[s.arrow, { color: colors.textPrimary }]}>‹</Text>
            </TouchableOpacity>
            <AppText variant="headingSmall" color={colors.textPrimary}>{MONTHS[mo]} {yr}</AppText>
            <TouchableOpacity onPress={nextMonth} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[s.arrow, { color: colors.textPrimary }]}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={s.hdrRow}>
            {DAY_HDRS.map(h => (
              <View key={h} style={s.cell}>
                <AppText variant="caption" color={colors.textMuted}>{h}</AppText>
              </View>
            ))}
          </View>

          <View style={s.grid}>
            {cells.map((c, i) => {
              const sel = isSelected(c);
              return (
                <TouchableOpacity
                  key={i}
                  style={s.cell}
                  activeOpacity={0.7}
                  onPress={() => onSelect(new Date(c.y, c.m, c.day))}
                >
                  <View style={[s.dayCircle, sel && { backgroundColor: colors.primary }]}>
                    <AppText
                      variant="body"
                      color={sel ? '#FFFFFF' : c.inMonth ? colors.textPrimary : colors.textMuted}
                      style={!c.inMonth && !sel ? { opacity: 0.4 } : undefined}
                    >
                      {String(c.day).padStart(2, '0')}
                    </AppText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const CELL = `${100 / 7}%` as const;

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000055' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: Spacing['2xl'] },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.base },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  arrow: { fontSize: 24, paddingHorizontal: Spacing.sm },
  hdrRow: { flexDirection: 'row', marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // Percentage-based cell width (not a fixed px) so the 7-column grid always
  // fits the sheet's width on any screen size.
  cell: { width: CELL, alignItems: 'center', paddingVertical: 6 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
