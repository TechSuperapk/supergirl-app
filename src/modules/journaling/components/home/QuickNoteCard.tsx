// ─────────────────────────────────────────────────────────────────────────────
// QuickNoteCard — a single note in the "Quick Notes" 2-column grid.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';

export interface QuickNote {
  id:    string;
  title: string;
  body:  string;
}

interface Props {
  note:     QuickNote;
  onPress?: () => void;
}

export function QuickNoteCard({ note, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[s.card, Shadows.sm, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <AppText variant="headingSmall" color={colors.textPrimary} numberOfLines={1} style={s.title}>
        {note.title}
      </AppText>
      <AppText variant="body" color={colors.textSecondary} numberOfLines={8}>
        {note.body}
      </AppText>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    width: '47%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  title: { marginBottom: Spacing.sm },
});
