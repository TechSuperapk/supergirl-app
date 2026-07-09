// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader — bold section title on the left, optional "View more" action.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing } from '../../../../shared/theme/spacing';

interface Props {
  title:       string;
  actionLabel?: string;
  onAction?:   () => void;
}

export function SectionHeader({ title, actionLabel = 'View more', onAction }: Props) {
  const { colors } = useTheme();
  return (
    <View style={s.row}>
      <AppText variant="headingMedium" color={colors.textPrimary}>{title}</AppText>
      {onAction ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <AppText variant="label" color={colors.textMuted}>{actionLabel}</AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
});
