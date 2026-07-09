// LocationPickerSheet — small bottom sheet to type in the entry's location
// chip (no maps/GPS integration — a simple free-text label, same spirit as
// the Dream variant's existing "Location In Dream" field).
import React, { useEffect, useState } from 'react';
import { Modal, View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';

interface Props {
  visible: boolean;
  value?: string;
  onSelect: (v?: string) => void;
  onClose: () => void;
}

export function LocationPickerSheet({ visible, value, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  const [text, setText] = useState(value ?? '');
  useEffect(() => { if (visible) setText(value ?? ''); }, [visible, value]);

  const save = () => { onSelect(text.trim() || undefined); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[s.sheet, { backgroundColor: colors.bgCard }]}>
          <View style={[s.grabber, { backgroundColor: colors.divider }]} />
          <AppText variant="headingSmall" color={colors.textPrimary} align="center" style={s.title}>Where are you?</AppText>
          <View style={[s.inputWrap, { borderColor: colors.border }]}>
            <AppText variant="body" color={colors.textMuted}>📍 </AppText>
            <TextInput
              style={[s.input, { color: colors.textPrimary, fontFamily: 'DMSans-Regular' }]}
              placeholder="Add a location"
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              autoFocus
            />
          </View>
          <TouchableOpacity style={[s.doneBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85} onPress={save}>
            <AppText variant="button" color={colors.bgCard}>Save</AppText>
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
  title: { marginBottom: Spacing.base },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 15, paddingVertical: 14 },
  doneBtn: { borderRadius: Radius.full, paddingVertical: Spacing.base, alignItems: 'center', marginTop: Spacing.base },
});
