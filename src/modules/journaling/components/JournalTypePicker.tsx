// JournalTypePicker — bottom sheet to choose which journal to write:
// Morning · Night · Dream · Vent. Selecting one hands the type back to the
// caller. Uses the same real-GIF big cards as AllTypesSheet so every "new
// journal" popup in the app looks identical.
import React from 'react';
import { Modal, View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { AppText } from '../../../shared/components/AppText';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spacing } from '../../../shared/theme/spacing';
import { PRIMARY_TYPES, JournalTypeDef } from './home';
import { BigTypeCard } from './BigTypeCard';

interface Props { visible: boolean; onSelect: (t: JournalTypeDef) => void; onClose: () => void; }

export function JournalTypePicker({ visible, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[s.sheet, { backgroundColor: '#FCFCFC' }]}>
          <View style={[s.grabber, { backgroundColor: colors.divider }]} />
          <AppText variant="headingMedium" color={colors.textPrimary} align="center">New Journal</AppText>
          <AppText variant="body" color={colors.textMuted} align="center" style={s.sub}>Which journal would you like to write?</AppText>

          <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
            {PRIMARY_TYPES.map(t => (
              <BigTypeCard key={t.key} item={t} onPress={() => onSelect(t)} />
            ))}
          </ScrollView>

          <TouchableOpacity style={s.cancel} activeOpacity={0.7} onPress={onClose}>
            <AppText variant="button" color={colors.textMuted}>Cancel</AppText>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000055' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: Spacing['2xl'] },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.base },
  sub: { marginTop: 2, marginBottom: Spacing.lg },
  list: { gap: 8, paddingBottom: 4 },
  cancel: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.xs },
});
