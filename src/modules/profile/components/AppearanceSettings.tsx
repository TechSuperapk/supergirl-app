/**
 * AppearanceSettings.tsx
 *
 * Drop this into PrivacySettingsScreen (or a dedicated Appearance screen)
 * to let users toggle light / dark / system theme.
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText }    from '../../../shared/components/AppText';
import { useTheme }   from '../../../shared/hooks/useTheme';
import { Colors }     from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import type { ThemeMode } from '../../../contexts/ThemeContext';

const MODES: { key: ThemeMode; emoji: string; label: string; sub: string }[] = [
  { key: 'light',  emoji: '☀️', label: 'Light',  sub: 'Always light mode' },
  { key: 'dark',   emoji: '🌙', label: 'Dark',   sub: 'Always dark mode'  },
  { key: 'system', emoji: '📱', label: 'System', sub: 'Follow device setting' },
];

export function AppearanceSettings() {
  const { mode, setTheme, colors } = useTheme();

  return (
    <View style={s.section}>
      <AppText variant="label" color={colors.textMuted} style={s.title}>APPEARANCE</AppText>
      <View style={[s.card, { backgroundColor: colors.bgCard }]}>
        {MODES.map((m, i) => {
          const isActive = mode === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              style={[
                s.row,
                { borderBottomWidth: i < MODES.length - 1 ? 0.5 : 0 },
                { borderBottomColor: colors.divider },
              ]}
              onPress={() => setTheme(m.key)}
              activeOpacity={0.75}
            >
              <AppText style={s.emoji}>{m.emoji}</AppText>
              <View style={s.textCol}>
                <AppText variant="body" color={colors.textPrimary}>{m.label}</AppText>
                <AppText variant="caption" color={colors.textMuted}>{m.sub}</AppText>
              </View>
              <View style={[
                s.radio,
                { borderColor: isActive ? Colors.primary : colors.border },
              ]}>
                {isActive && <View style={s.radioFill} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section:  { gap: 8 },
  title:    { paddingHorizontal: 4 },
  card:     { borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
  },
  emoji:    { fontSize: 22, width: 32 },
  textCol:  { flex: 1, gap: 2 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioFill: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.primary,
  },
});
