// ThemePickerSheet — pick the entry's background theme (Freestyle "Themes" tool).
import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';
import { JOURNAL_THEMES, JournalTheme } from '../../types';

interface Props {
  visible: boolean;
  value:   JournalTheme;
  onSelect: (t: JournalTheme) => void;
  onClose:  () => void;
}

export function ThemePickerSheet({ visible, value, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[s.sheet, { backgroundColor: colors.bgCard }]}>
          <View style={[s.grabber, { backgroundColor: colors.divider }]} />
          <AppText variant="headingSmall" color={colors.textPrimary} align="center" style={s.title}>Choose Theme</AppText>
          <View style={s.grid}>
            {JOURNAL_THEMES.map(t => {
              const on = t.id === value;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[s.opt, { backgroundColor: t.bg, borderColor: on ? t.accent : colors.border, borderWidth: on ? 2.5 : 1 }]}
                  activeOpacity={0.85}
                  onPress={() => onSelect(t.id as JournalTheme)}
                >
                  <View style={[s.dot, { backgroundColor: t.accent }]} />
                  <AppText variant="caption" color={t.id === 'night' ? '#FFFFFF' : '#333333'}>{t.label}</AppText>
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
  opt: { width: '28%', alignItems: 'center', gap: 6, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  dot: { width: 20, height: 20, borderRadius: 10 },
});
