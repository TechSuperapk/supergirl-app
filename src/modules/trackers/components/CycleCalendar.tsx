import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { AppText }       from '../../../shared/components/AppText';
import { Colors }        from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { PeriodEntry }   from '../types';

interface Props {
  entries:    PeriodEntry[];
  nextPeriod: string | null;
  onDayPress: (date: string) => void;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getDayColor(
  dateStr:    string,
  entries:    PeriodEntry[],
  nextPeriod: string | null,
): { bg: string; text: string; dot?: string } {
  const today = new Date().toISOString().split('T')[0];

  // Check if date is in a period range
  for (const entry of entries) {
    const start = entry.startDate;
    const end   = entry.endDate ?? today;
    if (dateStr >= start && dateStr <= end) {
      return { bg: '#E53935', text: Colors.white };
    }
  }

  // Predicted next period (3-day window)
  if (nextPeriod) {
    const np   = new Date(nextPeriod);
    const date = new Date(dateStr + 'T00:00:00');
    const diff = (date.getTime() - np.getTime()) / 86400000;
    if (diff >= 0 && diff <= 2) {
      return { bg: '#FFCDD2', text: '#C62828', dot: '#E53935' };
    }
    // Fertile window estimate (day 10–17 of cycle, roughly 14 days before period)
    if (diff >= -17 && diff <= -10) {
      return { bg: '#E1F5FE', text: '#0277BD' };
    }
  }

  if (dateStr === today) return { bg: Colors.primary + '20', text: Colors.primary };
  return { bg: Colors.transparent, text: Colors.textPrimary };
}

export function CycleCalendar({ entries, nextPeriod, onDayPress }: Props) {
  // Build 35-day grid starting from Sunday of current week - 2 weeks
  const today  = new Date();
  const start  = new Date(today);
  start.setDate(today.getDate() - today.getDay() - 14);

  const days: Date[] = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  return (
    <View style={s.wrap}>
      {/* Day labels */}
      <View style={s.headerRow}>
        {DAY_LABELS.map((l, i) => (
          <View key={i} style={s.cell}>
            <AppText variant="caption" color={Colors.textMuted}>{l}</AppText>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={s.grid}>
        {days.map((date, i) => {
          const dateStr  = date.toISOString().split('T')[0];
          const colors   = getDayColor(dateStr, entries, nextPeriod);
          const isToday  = dateStr === new Date().toISOString().split('T')[0];
          return (
            <TouchableOpacity
              key={i}
              style={[s.cell, s.dayCell, { backgroundColor: colors.bg }]}
              onPress={() => onDayPress(dateStr)}
              activeOpacity={0.7}
            >
              <Text style={[s.dayNum, { color: colors.text }, isToday && s.todayNum]}>
                {date.getDate()}
              </Text>
              {colors.dot && (
                <View style={[s.dot, { backgroundColor: colors.dot }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#E53935' }]} />
          <AppText variant="caption" color={Colors.textMuted}>Period</AppText>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#FFCDD2' }]} />
          <AppText variant="caption" color={Colors.textMuted}>Predicted</AppText>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#E1F5FE' }]} />
          <AppText variant="caption" color={Colors.textMuted}>Fertile</AppText>
        </View>
      </View>
    </View>
  );
}

const CELL_SIZE = 42;

const s = StyleSheet.create({
  wrap:       { gap: 4 },
  headerRow:  { flexDirection: 'row' },
  grid:       { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width:          `${100 / 7}%`,
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayCell:    { height: CELL_SIZE, borderRadius: CELL_SIZE / 2 },
  dayNum:     { fontSize: 13, fontFamily: 'DMSans-Regular' },
  todayNum:   { fontFamily: 'DMSans-Bold' },
  dot: {
    width: 4, height: 4, borderRadius: 2,
    position: 'absolute', bottom: 4,
  },
  legend:     { flexDirection: 'row', gap: Spacing.base, justifyContent: 'center', marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
});
