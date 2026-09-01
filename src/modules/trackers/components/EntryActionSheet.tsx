/**
 * EntryActionSheet — generic "tap a history row → bottom sheet with Edit /
 * Delete" pattern used by Intimacy, Sickness, and Measurement history
 * screens. Delete always routes through a confirm dialog before firing.
 */
import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../shared/components/AppText';
import { Colors } from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { BottomSheet, ConfirmDialog } from './HabitOverlays';

interface Props {
  visible:               boolean;
  title?:                string;
  subtitle?:             string;
  onClose:               () => void;
  onEdit:                () => void;
  onDelete:              () => void;
  deleteConfirmMessage?: string;
}

export function EntryActionSheet({
  visible, title, subtitle, onClose, onEdit, onDelete, deleteConfirmMessage,
}: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <BottomSheet visible={visible && !confirming} onClose={onClose} title={title}>
        {subtitle ? (
          <AppText variant="caption" color={Colors.textMuted} style={s.subtitle}>{subtitle}</AppText>
        ) : null}
        <TouchableOpacity style={s.row} activeOpacity={0.75} onPress={() => { onClose(); onEdit(); }}>
          <AppText style={{ fontSize: 18 }}>✏️</AppText>
          <AppText variant="body" color={Colors.textPrimary}>Edit</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={s.row} activeOpacity={0.75} onPress={() => setConfirming(true)}>
          <AppText style={{ fontSize: 18 }}>🗑️</AppText>
          <AppText variant="body" color={Colors.error}>Delete</AppText>
        </TouchableOpacity>
      </BottomSheet>

      <ConfirmDialog
        visible={confirming}
        title="Delete entry"
        message={deleteConfirmMessage ?? 'This will permanently delete this entry. This cannot be undone.'}
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={() => { setConfirming(false); onClose(); onDelete(); }}
      />
    </>
  );
}

const s = StyleSheet.create({
  subtitle: { marginTop: -8, marginBottom: Spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: 16, paddingHorizontal: Spacing.sm, borderRadius: Radius.md,
  },
});
