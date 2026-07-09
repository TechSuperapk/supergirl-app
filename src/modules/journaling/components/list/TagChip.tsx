// TagChip — small filled pastel pill (emoji + label) used on note cards.
// Falls back to a neutral outlined pill when no tag colour is supplied.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Radius } from '../../../../shared/theme/spacing';

interface Props { label: string; emoji?: string; bg?: string; color?: string; }

export function TagChip({ label, emoji, bg, color }: Props) {
  const { colors } = useTheme();
  const filled = !!bg;
  return (
    <View
      style={[
        s.chip,
        filled ? { backgroundColor: bg } : { borderWidth: 1, borderColor: colors.border },
      ]}
    >
      {!!emoji && <Text style={s.emoji}>{emoji}</Text>}
      <AppText variant="caption" color={color ?? colors.textSecondary}>{label}</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  emoji: { fontSize: 12 },
});
