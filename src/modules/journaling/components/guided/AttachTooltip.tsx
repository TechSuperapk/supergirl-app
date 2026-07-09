// AttachTooltip — small tooltip-style popup anchored above the paperclip
// button in BottomSaveBar. Tapping the paperclip opens this instead of a full
// sheet; pick Photo or Video to attach media to the entry.
import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';

interface Props {
  visible: boolean;
  onPhoto: () => void;
  onVideo: () => void;
  onClose: () => void;
}

export function AttachTooltip({ visible, onPhoto, onVideo, onClose }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={[s.tooltip, Shadows.md, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <TouchableOpacity style={s.row} activeOpacity={0.75} onPress={() => { onClose(); onPhoto(); }}>
            <AppText style={s.icon}>📷</AppText>
            <AppText variant="body" color={colors.textPrimary}>Photo</AppText>
          </TouchableOpacity>
          <View style={[s.sep, { backgroundColor: colors.divider }]} />
          <TouchableOpacity style={s.row} activeOpacity={0.75} onPress={() => { onClose(); onVideo(); }}>
            <AppText style={s.icon}>🎥</AppText>
            <AppText variant="body" color={colors.textPrimary}>Video</AppText>
          </TouchableOpacity>
          {/* Little pointer nub aiming down at the paperclip button. */}
          <View style={[s.nub, { backgroundColor: colors.bgCard, borderColor: colors.border }]} />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  tooltip: {
    position: 'absolute', left: Spacing.lg, bottom: 96,
    borderRadius: Radius.lg, borderWidth: 1, paddingVertical: 4, minWidth: 150,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  icon: { fontSize: 16 },
  sep: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.sm },
  nub: {
    position: 'absolute', bottom: -7, left: 20, width: 14, height: 14,
    borderRightWidth: 1, borderBottomWidth: 1, borderColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
});
