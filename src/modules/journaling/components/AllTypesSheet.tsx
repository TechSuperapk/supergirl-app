// AllTypesSheet — the "+" popup listing every writing type.
// Rebuilt to match the Figma spec exactly:
//   • 4 large cards (Morning/Night/Dream/Vent Journal) — title + subtitle on
//     the left, a big icon bleeding off the top-right corner.
//   • A row of 3 compact cards (Quotes/Ideas/Affirmation) — icon on top,
//     bold label underneath.
import React from 'react';
import { Modal, View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { AppText } from '../../../shared/components/AppText';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spacing } from '../../../shared/theme/spacing';
import { PRIMARY_TYPES, SECONDARY_TYPES, JournalTypeDef } from './home';
import { BigTypeCard } from './BigTypeCard';
import { SmallTypeCard } from './SmallTypeCard';

interface Props { visible: boolean; onSelect: (t: JournalTypeDef) => void; onClose: () => void; }

export function AllTypesSheet({ visible, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[s.sheet, { backgroundColor: '#FCFCFC' }]}>
          <View style={[s.grabber, { backgroundColor: colors.divider }]} />
          {/* <AppText variant="headingMedium" color={colors.textPrimary} align="center">What would you like to write?</AppText> */}

          <ScrollView style={{ maxHeight: 560 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
            {PRIMARY_TYPES.map(t => (
              <BigTypeCard key={t.key} item={t} onPress={() => onSelect(t)} />
            ))}

            <View style={s.smallRow}>
              {SECONDARY_TYPES.map(t => (
                <SmallTypeCard key={t.key} item={t} onPress={() => onSelect(t)} />
              ))}
            </View>
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

  list: { gap: 8, paddingTop: Spacing.base, paddingBottom: 4 },

  // ── Small cards (Quotes / Ideas / Affirmation) ──────────────────────────
  smallRow: { flexDirection: 'row', gap: 8 },

  cancel: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.xs },
});
