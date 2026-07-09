// SectionCard — white rounded card with a bold title, optional subtitle and a
// right-side action (e.g. "+Add") or custom node.
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';

interface Props {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  right?: React.ReactNode;
  children?: React.ReactNode;
}

export function SectionCard({ title, subtitle, action, onAction, right, children }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[s.card, Shadows.sm, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={s.head}>
        <AppText variant="headingSmall" color={colors.textPrimary}>{title}</AppText>
        {right ?? (action ? (
          <TouchableOpacity onPress={onAction} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <AppText variant="label" color={colors.primary}>{action}</AppText>
          </TouchableOpacity>
        ) : null)}
      </View>
      {!!subtitle && <AppText variant="bodySmall" color={colors.textMuted} style={s.sub}>{subtitle}</AppText>}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.base },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sub: { marginTop: 2, marginBottom: Spacing.md },
});
