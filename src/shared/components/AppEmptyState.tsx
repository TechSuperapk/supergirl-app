import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';

interface Props {
  emoji:       string;
  title:       string;
  subtitle?:   string;
  actionLabel?: string;
  onAction?:   () => void;
}

export function AppEmptyState({ emoji, title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={s.wrap}>
      <AppText style={s.emoji}>{emoji}</AppText>
      <AppText variant="headingMedium" color={Colors.textPrimary} align="center">
        {title}
      </AppText>
      {!!subtitle && (
        <AppText variant="body" color={Colors.textMuted} align="center" style={s.sub}>
          {subtitle}
        </AppText>
      )}
      {!!actionLabel && !!onAction && (
        <AppButton
          label={actionLabel}
          onPress={onAction}
          variant="primary"
          size="md"
          style={s.btn}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  {
    flex: 1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical:   Spacing['3xl'],
    gap: Spacing.sm,
  },
  emoji: { fontSize: 52, marginBottom: Spacing.sm },
  sub:   { marginTop: 4, lineHeight: 22 },
  btn:   { marginTop: Spacing.base },
});
