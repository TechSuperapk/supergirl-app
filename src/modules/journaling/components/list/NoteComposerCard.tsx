// NoteComposerCard — the "Title / Write Anything here / Start writing" entry card.
import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';

interface Props {
  onStart: () => void;
  onAddTag?: () => void;
  // The active tab's animated type icon (from JOURNAL_TYPE_ICONS) — shown
  // next to Title when a specific note type is selected; undefined on "All".
  icon?: any;
}

export function NoteComposerCard({ onStart, onAddTag, icon }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[s.card, Shadows.sm, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={s.top}>
        <View style={s.titleRow}>
          {!!icon && <Image source={icon} style={s.typeLogo} resizeMode="contain" />}
          <AppText variant="headingMedium" color={colors.textPrimary}>Title</AppText>
        </View>
        <TouchableOpacity style={[s.tagBtn, { borderColor: colors.border }]} activeOpacity={0.7} onPress={onAddTag ?? onStart}>
          <AppText variant="caption" color={colors.textSecondary}>Add Tag</AppText>
        </TouchableOpacity>
      </View>
      <View style={[s.divider, { backgroundColor: colors.divider }]} />

      <AppText variant="bodySmall" color={colors.textMuted} style={s.placeholder} numberOfLines={1}>Write Anything here……</AppText>
      <TouchableOpacity style={[s.startBtn, { backgroundColor: colors.textPrimary }]} activeOpacity={0.85} onPress={onStart}>
        <AppText variant="button" color={colors.bgCard}>Start writing</AppText>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  typeLogo: { width: 28, height: 28 },
  tagBtn: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  // Full-width line — breaks out of the card's own padding so it touches
  // both edges, matching TodayQuickCard.
  divider: { height: StyleSheet.hairlineWidth, marginTop: Spacing.sm, marginHorizontal: -Spacing.md },
  placeholder: { marginTop: Spacing.sm, marginBottom: Spacing.sm },
  startBtn: { marginTop: Spacing.sm, borderRadius: Radius.full, paddingVertical: Spacing.sm, alignItems: 'center' },
});
