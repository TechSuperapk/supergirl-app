// CardCheckGrid — selectable cards with a checkbox in the corner.
//   'grid2' — 2-per-row, left-aligned emoji/title/subtitle (Dream details).
//   'row3'  — 3-per-row, centered emoji/title only (Vent's "What do you need").
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';
import type { CardChoiceDef } from './guidedConfig';

interface Props {
  options: CardChoiceDef[];
  selected: string[];
  onToggle: (key: string) => void;
  variant?: 'grid2' | 'row3';
}

export function CardCheckGrid({ options, selected, onToggle, variant = 'grid2' }: Props) {
  const { colors } = useTheme();
  const isRow3 = variant === 'row3';
  return (
    <View style={s.wrap}>
      {options.map(o => {
        const on = selected.includes(o.key);
        return (
          <TouchableOpacity
            key={o.key}
            style={[
              isRow3 ? s.cardRow3 : s.cardGrid2,
              { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primaryLight : colors.bgCard },
            ]}
            activeOpacity={0.8}
            onPress={() => onToggle(o.key)}
          >
            <View style={[s.checkbox, { borderColor: colors.border, backgroundColor: on ? colors.textPrimary : 'transparent' }]} />
            {isRow3 ? (
              <View style={s.row3Body}>
                <Text style={s.emojiLg}>{o.emoji}</Text>
                <AppText variant="bodySmall" color={colors.textPrimary} align="center">{o.label}</AppText>
              </View>
            ) : (
              <View style={s.grid2Body}>
                <Text style={s.emojiLg}>{o.emoji}</Text>
                <AppText variant="label" color={colors.textPrimary}>{o.label}</AppText>
                {!!o.sub && <AppText variant="caption" color={colors.textMuted} style={s.sub}>{o.sub}</AppText>}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cardGrid2: { width: '47%', borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: 6 },
  cardRow3: { flex: 1, minWidth: 90, borderWidth: 1, borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xs, alignItems: 'center', gap: 6 },
  checkbox: { position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 9, borderWidth: 1.5 },
  grid2Body: { gap: 2 },
  row3Body: { alignItems: 'center', gap: 6 },
  emojiLg: { fontSize: 22 },
  sub: { marginTop: 2 },
});
