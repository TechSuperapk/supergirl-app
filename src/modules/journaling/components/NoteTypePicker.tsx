// NoteTypePicker — bottom sheet to choose which note to write:
// Quotes · Ideas · Affirmation. Uses the same real-GIF small cards as
// AllTypesSheet so every "new note" popup in the app looks identical.
import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../shared/components/AppText';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spacing } from '../../../shared/theme/spacing';
import { SECONDARY_TYPES, JournalTypeDef } from './home';
import { SmallTypeCard } from './SmallTypeCard';

interface Props { visible: boolean; onSelect: (t: JournalTypeDef) => void; onClose: () => void; }

export function NoteTypePicker({ visible, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[s.sheet, { backgroundColor: '#FCFCFC' }]}>
          <View style={[s.grabber, { backgroundColor: colors.divider }]} />
          <AppText variant="headingMedium" color={colors.textPrimary} align="center">New Note</AppText>
          <AppText variant="body" color={colors.textMuted} align="center" style={s.sub}>Which note would you like to write?</AppText>

          <View style={s.row}>
            {SECONDARY_TYPES.map(t => (
              <SmallTypeCard key={t.key} item={t} onPress={() => onSelect(t)} />
            ))}
          </View>

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
  row: { flexDirection: 'row', gap: 8 },
  cancel: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.xs },
});
