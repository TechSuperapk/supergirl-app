// WeatherPickerSheet — small bottom sheet to pick the entry's weather chip.
import React from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';
import { WEATHER_OPTIONS } from '../../types';

interface Props {
  visible: boolean;
  value?: string;
  onSelect: (w?: string) => void;
  onClose: () => void;
}

export function WeatherPickerSheet({ visible, value, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[s.sheet, { backgroundColor: colors.bgCard }]}>
          <View style={[s.grabber, { backgroundColor: colors.divider }]} />
          <AppText variant="headingSmall" color={colors.textPrimary} align="center" style={s.title}>What's the weather?</AppText>
          <View style={s.grid}>
            {WEATHER_OPTIONS.map(w => {
              const on = w.value === value;
              return (
                <TouchableOpacity
                  key={w.value}
                  style={[s.opt, { backgroundColor: on ? colors.primary + '20' : 'transparent', borderColor: on ? colors.primary : colors.border }]}
                  activeOpacity={0.8}
                  onPress={() => onSelect(w.value)}
                >
                  <Text style={s.emoji}>{w.emoji}</Text>
                  <AppText variant="caption" color={colors.textSecondary}>{w.label}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
          {!!value && (
            <TouchableOpacity style={s.clearBtn} onPress={() => onSelect(undefined)}>
              <AppText variant="button" color={colors.textMuted}>Remove weather</AppText>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000055' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: Spacing['2xl'] },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.base },
  title: { marginBottom: Spacing.base },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  opt: { width: '28%', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1 },
  emoji: { fontSize: 24 },
  clearBtn: { alignItems: 'center', marginTop: Spacing.base },
});
