// PeopleGrid — 4-per-row circular avatars (emoji), tap to select. Ring when on.
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing } from '../../../../shared/theme/spacing';
import type { ChipDef } from './guidedConfig';

interface Props { options: ChipDef[]; selected: string[]; onToggle: (key: string) => void; }

export function PeopleGrid({ options, selected, onToggle }: Props) {
  const { colors } = useTheme();
  return (
    <View style={s.grid}>
      {options.map(o => {
        const on = selected.includes(o.key);
        return (
          <TouchableOpacity key={o.key} style={s.item} activeOpacity={0.75} onPress={() => onToggle(o.key)}>
            <View style={[s.avatar, { backgroundColor: colors.bgInput, borderColor: on ? colors.primary : 'transparent' }]}>
              <Text style={s.emoji}>{o.emoji}</Text>
            </View>
            <AppText variant="caption" color={on ? colors.primary : colors.textSecondary} align="center">{o.label}</AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  item: { width: '25%', alignItems: 'center', marginBottom: Spacing.base, gap: 5 },
  avatar: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26 },
});
