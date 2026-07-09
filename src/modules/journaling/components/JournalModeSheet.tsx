// JournalModeSheet — bottom sheet asking how to journal a chosen type:
// "Write your own" (freeform editor) or "Guided journal" (answer prompts).
import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../shared/components/AppText';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../shared/theme/spacing';

interface Props {
  visible:   boolean;
  typeLabel?: string;
  onManual:  () => void;
  onGuided:  () => void;
  onClose:   () => void;
}

export function JournalModeSheet({ visible, typeLabel, onManual, onGuided, onClose }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[s.sheet, { backgroundColor: colors.bgCard }]}>
          <View style={[s.grabber, { backgroundColor: colors.divider }]} />
          <AppText variant="headingMedium" color={colors.textPrimary} align="center">
            {typeLabel ?? 'New journal'}
          </AppText>
          <AppText variant="body" color={colors.textMuted} align="center" style={s.sub}>
            How would you like to journal?
          </AppText>

          <TouchableOpacity style={[s.opt, { borderColor: colors.border }]} activeOpacity={0.85} onPress={onManual}>
            <AppText variant="headingSmall" color={colors.textPrimary}>✍️  Write your own</AppText>
            <AppText variant="bodySmall" color={colors.textMuted} style={s.optSub}>Freeform editor — a blank page</AppText>
          </TouchableOpacity>

          <TouchableOpacity style={[s.opt, s.optPrimary, { backgroundColor: colors.textPrimary }]} activeOpacity={0.85} onPress={onGuided}>
            <AppText variant="headingSmall" color={colors.bgCard}>🧭  Guided journal</AppText>
            <AppText variant="bodySmall" color={colors.bgCard} style={[s.optSub, { opacity: 0.8 }]}>Answer a few gentle prompts</AppText>
          </TouchableOpacity>

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
  opt: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.base, marginBottom: Spacing.md },
  optPrimary: { borderWidth: 0 },
  optSub: { marginTop: 2 },
  cancel: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.xs },
});
