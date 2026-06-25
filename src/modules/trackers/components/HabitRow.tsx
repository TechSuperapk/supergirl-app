import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { AppText }   from '../../../shared/components/AppText';
import { Colors }    from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { Habit }     from '../types';

interface Props {
  habit:       Habit;
  completed:   boolean;
  onToggle:    () => void;
  onLongPress?: () => void;
}

export function HabitRow({ habit, completed, onToggle, onLongPress }: Props) {
  return (
    <TouchableOpacity
      style={[s.row, completed && { backgroundColor: habit.color + '10' }]}
      onPress={onToggle}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      {/* Checkbox */}
      <View style={[
        s.check,
        {
          borderColor:     completed ? habit.color : Colors.border,
          backgroundColor: completed ? habit.color : Colors.transparent,
        },
      ]}>
        {completed && <Text style={s.checkMark}>✓</Text>}
      </View>

      {/* Icon + Name */}
      <Text style={s.icon}>{habit.icon}</Text>
      <View style={s.info}>
        <AppText
          variant="headingSmall"
          color={completed ? Colors.textMuted : Colors.textPrimary}
          style={completed ? s.strikethrough : undefined}
        >
          {habit.name}
        </AppText>
        {habit.streak > 0 && (
          <AppText variant="caption" color={Colors.warning}>
            🔥 {habit.streak} day streak
          </AppText>
        )}
      </View>

      {/* Color dot */}
      <View style={[s.colorDot, { backgroundColor: habit.color }]} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  check: {
    width: 26, height: 26, borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark:   { fontSize: 14, color: Colors.white, fontFamily: 'DMSans-Bold' },
  icon:        { fontSize: 22, width: 28 },
  info:        { flex: 1, gap: 2 },
  strikethrough: { textDecorationLine: 'line-through', opacity: 0.6 },
  colorDot:    { width: 8, height: 8, borderRadius: 4 },
});
