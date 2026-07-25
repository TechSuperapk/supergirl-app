// PageHeader — large screen title with a muted subtitle, and an optional
// accessory (e.g. a date pill) pinned to the right of the title row.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing } from '../../../../shared/theme/spacing';

interface Props { title: string; subtitle?: string; right?: React.ReactNode; left?: React.ReactNode; }

export function PageHeader({ title, subtitle, right, left }: Props) {
  const { colors } = useTheme();
  return (
    <View style={s.wrap}>
      <View style={s.row}>
        {!!left && <View style={s.left}>{left}</View>}
        <View style={s.titleCol}>
          <AppText variant="displayMedium" color={colors.textPrimary}>{title}</AppText>
          {!!subtitle && (
            <AppText variant="body" color={colors.textMuted} style={{ marginTop: 2 }}>{subtitle}</AppText>
          )}
        </View>
        {!!right && <View style={s.right}>{right}</View>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.base },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  titleCol: { flex: 1 },
  right: { flexShrink: 0, maxWidth: '55%' },
  left: { flexShrink: 0, marginRight: 4 },
});
