// NoteCard — full-width note row: title + tag chip on the right + body preview.
import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { TagChip } from './TagChip';
import { tagDef } from './noteTags';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';

export interface NoteCardData { id: string; title: string; body: string; tag?: string; checklist?: { done: number; total: number }; }

interface Props { note: NoteCardData; onPress?: () => void; onLongPress?: () => void; }

export function NoteCard({ note, onPress, onLongPress }: Props) {
  const { colors } = useTheme();
  const td = tagDef(note.tag);
  return (
    <TouchableOpacity
      style={[s.card, Shadows.sm, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={s.top}>
        <AppText variant="headingSmall" color={colors.textPrimary} numberOfLines={1} style={s.title}>{note.title}</AppText>
        {td && <TagChip label={td.label} emoji={td.emoji} bg={td.bg} color={td.color} />}
      </View>
      {!!note.checklist && (
        <AppText variant="caption" color={colors.textMuted} style={s.checklistLine}>
          ☑ {note.checklist.done}/{note.checklist.total} checked
        </AppText>
      )}
      {!!note.body && <AppText variant="body" color={colors.textSecondary} numberOfLines={3}>{note.body}</AppText>}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.base },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: Spacing.sm },
  title: { flex: 1 },
  checklistLine: { marginBottom: 4 },
});
