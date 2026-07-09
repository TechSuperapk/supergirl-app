// ChipMultiSelect — wrap of emoji pills; tap to toggle. Selected = filled.
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Radius, Spacing } from '../../../../shared/theme/spacing';
import type { ChipDef } from './guidedConfig';

interface Props { options: ChipDef[]; selected: string[]; onToggle: (key: string) => void; }

export function ChipMultiSelect({ options, selected, onToggle }: Props) {
  const { colors } = useTheme();
  return (
    <View style={s.wrap}>
      {options.map(o => {
        const on = selected.includes(o.key);
        return (
          <TouchableOpacity
            key={o.key}
            style={[s.chip, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primaryLight : 'transparent' }]}
            activeOpacity={0.75}
            onPress={() => onToggle(o.key)}
          >
            <Text style={s.emoji}>{o.emoji}</Text>
            <AppText variant="bodySmall" color={on ? colors.primary : colors.textSecondary}>{o.label}</AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 7 },
  emoji: { fontSize: 14 },
});
