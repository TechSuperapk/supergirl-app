// StickerPickerSheet — pick a sticker to drop onto the Freestyle canvas.
// The placed sticker is then draggable / rotatable / pinch-zoomable via
// StickerLayer (see that file for the gesture handling).
import React from 'react';
import { Modal, View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';
import { STICKER_ASSETS } from '../../stickers';

interface Props {
  visible: boolean;
  onSelect: (key: string) => void;
  onClose:  () => void;
}

export function StickerPickerSheet({ visible, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[s.sheet, { backgroundColor: colors.bgCard }]}>
          <View style={[s.grabber, { backgroundColor: colors.divider }]} />
          <AppText variant="headingSmall" color={colors.textPrimary} align="center" style={s.title}>Stickers</AppText>
          <AppText variant="caption" color={colors.textMuted} align="center" style={s.sub}>Tap to place · drag, pinch or twist to adjust</AppText>
          <View style={s.grid}>
            {STICKER_ASSETS.map(st => (
              <TouchableOpacity key={st.key} style={[s.opt, { backgroundColor: colors.bgInput }]} activeOpacity={0.8} onPress={() => onSelect(st.key)}>
                <Image source={st.source} style={s.img} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000055' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: Spacing['2xl'], maxHeight: '70%' },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.base },
  title: {},
  sub: { marginTop: 2, marginBottom: Spacing.base },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  opt: { width: 56, height: 56, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  img: { width: 36, height: 36 },
});
