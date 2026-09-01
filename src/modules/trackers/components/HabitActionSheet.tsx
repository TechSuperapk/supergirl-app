/**
 * HabitActionSheet — tap a habit's ⋮ (or long-press) → bottom sheet with
 * Undo / Edit / Pause-or-Resume / Delete. Shared by the "Today" row
 * (HabitProgressRow) and the "My Habits" tab row on the Goals home, so both
 * surfaces present the same options in the same style. Delete always routes
 * through a confirm dialog first.
 */
import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../shared/components/AppText';
import { Colors } from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { BottomSheet, ConfirmDialog } from './HabitOverlays';

interface Props {
  visible:        boolean;
  habitName?:     string;
  isPaused?:      boolean;
  /**
   * Today's progress, when there is any. Drives the Undo row: marking a habit
   * done is a one-tap action, so it needs a one-tap way back — otherwise a
   * mis-tap is stuck until midnight.
   */
  progress?:      number;
  target?:        number;
  onClose:        () => void;
  onEdit:         () => void;
  onPauseResume:  () => void;
  onDelete:       () => void;
  /** Reset today's log to 0. Omit to hide the Undo row entirely. */
  onUndo?:        () => void;
}

export function HabitActionSheet({
  visible, habitName, isPaused, progress = 0, target = 1,
  onClose, onEdit, onPauseResume, onDelete, onUndo,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const canUndo = !!onUndo && progress > 0;
  const isDone = progress >= target;

  return (
    <>
      <BottomSheet visible={visible && !confirming} onClose={onClose} title={habitName || 'Habit'}>
        {canUndo && (
          <TouchableOpacity style={s.row} activeOpacity={0.75} onPress={() => { onClose(); onUndo!(); }}>
            <AppText style={{ fontSize: 18 }}>↩️</AppText>
            <AppText variant="body" color={Colors.textPrimary}>
              {isDone ? 'Undo — mark as not done' : `Undo — clear ${progress}/${target}`}
            </AppText>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.row} activeOpacity={0.75} onPress={() => { onClose(); onEdit(); }}>
          <AppText style={{ fontSize: 18 }}>✏️</AppText>
          <AppText variant="body" color={Colors.textPrimary}>Edit</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={s.row} activeOpacity={0.75} onPress={() => { onClose(); onPauseResume(); }}>
          <AppText style={{ fontSize: 18 }}>{isPaused ? '▶️' : '⏸️'}</AppText>
          <AppText variant="body" color={Colors.textPrimary}>{isPaused ? 'Resume' : 'Pause'}</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={s.row} activeOpacity={0.75} onPress={() => setConfirming(true)}>
          <AppText style={{ fontSize: 18 }}>🗑️</AppText>
          <AppText variant="body" color={Colors.error}>Delete</AppText>
        </TouchableOpacity>
      </BottomSheet>

      <ConfirmDialog
        visible={confirming}
        title="Delete habit"
        message={`Delete "${habitName || 'this habit'}"? This can't be undone.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={() => { setConfirming(false); onClose(); onDelete(); }}
      />
    </>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: 16, paddingHorizontal: Spacing.sm, borderRadius: Radius.md,
  },
});
