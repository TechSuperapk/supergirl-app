// SegmentedYesNo — pill segmented control; the selected half turns solid dark.
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Radius } from '../../../../shared/theme/spacing';

interface Props { value: boolean; onChange: (v: boolean) => void; }

export function SegmentedYesNo({ value, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[s.wrap, { backgroundColor: colors.bgInput }]}>
      {[true, false].map(v => {
        const on = value === v;
        return (
          <TouchableOpacity key={String(v)} style={[s.seg, on && { backgroundColor: colors.textPrimary }]} activeOpacity={0.85} onPress={() => onChange(v)}>
            <AppText variant="button" color={on ? colors.bgCard : colors.textSecondary}>{v ? 'Yes' : 'No'}</AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: Radius.full, padding: 4 },
  seg: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.full },
});
