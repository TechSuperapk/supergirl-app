/**
 * HabitProgressRow — reusable "today's habit" row for the Goals home.
 *
 * Tap the circle to add +1 toward the daily target (e.g. Drink Water 3×/day →
 * 1/3, 2/3, 3/3). At the target the row marks complete with a pop animation.
 * The ⋮ menu offers Edit / Pause / Delete (Delete confirms first).
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { AppText } from '../../../shared/components/AppText';
import { Colors } from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { HabitActionSheet } from './HabitActionSheet';
import { Habit } from '../types';

interface Props {
  habit: Habit;
  progress: number;
  target: number;
  completed: boolean;
  onTap: () => void;
  onEdit: () => void;
  onPause: () => void;
  onDelete: () => void;
  /** Reset today's progress. Omit and the ⋮ menu hides its Undo row. */
  onUndo?: () => void;
  /**
   * Render without the row's own card chrome, for use inside a single grouped
   * card (the "Today" list) where the parent owns the surface and rows are
   * separated by dividers instead.
   */
  flat?: boolean;
  /** Hide the divider on the last row of a grouped card. */
  isLast?: boolean;
}

export function HabitProgressRow({
  habit, progress, target, completed, onTap, onEdit, onPause, onDelete, onUndo, flat, isLast,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevCompleted = useRef(completed);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (completed && !prevCompleted.current) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.35, useNativeDriver: true, friction: 4, tension: 160 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }),
      ]).start();
    }
    prevCompleted.current = completed;
  }, [completed]);

  /**
   * The target belongs in the title: "Laugh 10 times" reads as the instruction
   * it is, where "Laugh" with a separate "10" underneath reads as a name with a
   * footnote. Falls back to the bare name when no target was set.
   */
  const unit = habit.targetUnit?.trim();
  const amount = habit.targetAmount;
  const title = amount
    ? `${habit.name} ${amount}${unit ? ` ${unit}` : ''}`
    : habit.name;

  // The unit is whatever the user typed — km, litres, pages — so it can't be
  // hardcoded to "Times" without mislabelling every non-count habit.
  const targetLabel = amount && unit
    ? `${amount} ${unit} per day`
    : target > 1 ? `${target} times per day` : 'Once a day';

  return (
    <View style={[s.row, flat && s.rowFlat, flat && isLast && { borderBottomWidth: 0 }]}>
      {/* Tap target — circular progress */}
      <TouchableOpacity onPress={onTap} activeOpacity={0.8} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Animated.View
          style={[
            s.dot,
            { borderColor: habit.color || Colors.primary, transform: [{ scale }] },
            completed && { backgroundColor: Colors.success, borderColor: Colors.success },
          ]}
        >
          {completed
            ? <Text style={s.check}>✓</Text>
            : progress > 0
              ? <AppText variant="caption" color={habit.color || Colors.primary}>{progress}</AppText>
              : null}
        </Animated.View>
      </TouchableOpacity>

      {habit.icon ? <AppText style={{ fontSize: 20 }}>{habit.icon}</AppText> : null}

      <View style={{ flex: 1 }}>
        <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={1}>{title}</AppText>
        <AppText variant="caption" color={Colors.textMuted}>
          {targetLabel}{target > 1 ? `  ·  ${progress}/${target}` : ''}
        </AppText>
      </View>

      <TouchableOpacity onPress={() => setMenuOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.menuBtn}>
        <Text style={s.menuDots}>⋮</Text>
      </TouchableOpacity>

      <HabitActionSheet
        visible={menuOpen}
        habitName={habit.name}
        isPaused={habit.isPaused}
        progress={progress}
        target={target}
        onClose={() => setMenuOpen(false)}
        onEdit={onEdit}
        onPauseResume={onPause}
        onDelete={onDelete}
        onUndo={onUndo}
      />
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgCard, borderRadius: Radius.full,
    paddingVertical: 12, paddingHorizontal: Spacing.base, marginBottom: 8, ...Shadows.sm,
  },
  // Inside a grouped card: no surface of its own, divider between rows.
  rowFlat: {
    backgroundColor: 'transparent', borderRadius: 0, marginBottom: 0,
    paddingHorizontal: 6, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(153,153,153,0.20)',
    shadowOpacity: 0, elevation: 0,
  },
  dot: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  check: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  menuBtn: { paddingHorizontal: 4 },
  menuDots: { fontSize: 20, color: Colors.textMuted, fontFamily: 'DMSans-Bold' },
});
