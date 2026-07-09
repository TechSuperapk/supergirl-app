// MoodPickerSheet — small bottom sheet to pick the entry's mood emoji.
import React from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';
import { MOOD_OPTIONS, Mood } from '../../types';

interface Props {
  visible: boolean;
  value:   Mood;
  onSelect: (m: Mood) => void;
  onClose:  () => void;
}

export function MoodPickerSheet({ visible, value, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[s.sheet, { backgroundColor: colors.bgCard }]}>
          <View style={[s.grabber, { backgroundColor: colors.divider }]} />
          <AppText variant="headingSmall" color={colors.textPrimary} align="center" style={s.title}>How are you feeling?</AppText>
          <View style={s.grid}>
            {MOOD_OPTIONS.map(m => {
              const on = m.value === value;
              return (
                <TouchableOpacity
                  key={m.value}
                  style={[s.opt, { backgroundColor: on ? m.color + '30' : 'transparent', borderColor: on ? m.color : colors.border }]}
                  activeOpacity={0.8}
                  onPress={() => onSelect(m.value)}
                >
                  <Text style={s.emoji}>{m.emoji}</Text>
                  <AppText variant="caption" color={colors.textSecondary}>{m.label}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
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
});
