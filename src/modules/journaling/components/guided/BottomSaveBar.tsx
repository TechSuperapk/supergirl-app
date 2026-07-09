// BottomSaveBar — sticky footer: a small attach button + the dark Save
// button. The private/public flag now lives in the Freestyle toolbar's lock
// icon (see FreestyleToolbar) rather than an inline switch here.
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';

interface Props {
  saveLabel: string;
  onSave: () => void;
  onAttach?: () => void;
}

export function BottomSaveBar({ saveLabel, onSave, onAttach }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[s.bar, { backgroundColor: colors.bgCard, borderTopColor: colors.divider }]}>
      <TouchableOpacity style={[s.attach, { borderColor: colors.border, backgroundColor: colors.bgInput }]} activeOpacity={0.7} onPress={onAttach}>
        <Text style={s.attachIcon}>📎</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.save, { backgroundColor: colors.textPrimary }]} activeOpacity={0.85} onPress={onSave}>
        <AppText variant="button" color={colors.bgCard}>{saveLabel}</AppText>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xl, borderTopWidth: StyleSheet.hairlineWidth },
  attach: { width: 48, height: 48, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  attachIcon: { fontSize: 18 },
  save: { flex: 1, borderRadius: Radius.full, paddingVertical: Spacing.base, alignItems: 'center' },
});
