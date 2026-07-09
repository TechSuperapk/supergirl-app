// ModeToggle — the "Freestyle / Guided" segmented control shown at the top
// of a journal entry screen (matches the reference design: a light track
// with the active tab rendered as a raised white pill).
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';

export type EntryMode = 'freestyle' | 'guided';

interface Props {
  value:    EntryMode;
  onChange: (v: EntryMode) => void;
  /** Small, right-aligned pill instead of the full-width bar — used for the
   *  extra quick-switch toggle pinned at the very top of the screen. */
  compact?: boolean;
}

const OPTIONS: { key: EntryMode; label: string }[] = [
  { key: 'freestyle', label: 'Freestyle' },
  { key: 'guided',    label: 'Guided' },
];

export function ModeToggle({ value, onChange, compact }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[compact ? s.wrapCompact : s.wrap, { backgroundColor: colors.bgInput }]}>
      {OPTIONS.map(o => {
        const on = value === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            style={[compact ? s.segCompact : s.seg, on && [compact ? s.segActiveCompact : s.segActive, Shadows.sm, { backgroundColor: colors.bgCard }]]}
            activeOpacity={0.85}
            onPress={() => onChange(o.key)}
          >
            <AppText variant={compact ? 'caption' : 'button'} color={on ? colors.textPrimary : colors.textMuted}>{o.label}</AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: Radius.full, padding: 4, marginHorizontal: Spacing.lg, marginBottom: Spacing.base },
  seg: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.full },
  segActive: {},

  wrapCompact: { flexDirection: 'row', borderRadius: Radius.full, padding: 3, alignSelf: 'flex-end' },
  segCompact: { alignItems: 'center', paddingVertical: 5, paddingHorizontal: 12, borderRadius: Radius.full },
  segActiveCompact: {},
});
