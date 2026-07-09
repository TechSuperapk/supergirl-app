// PriorityList — numbered priority inputs with a dark "+ Add task" button.
import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';

interface Props { values: string[]; onChange: (v: string[]) => void; }

export function PriorityList({ values, onChange }: Props) {
  const { colors } = useTheme();
  const setAt = (i: number, v: string) => onChange(values.map((x, idx) => (idx === i ? v : x)));
  const add = () => onChange([...values, '']);
  return (
    <View>
      {values.map((v, i) => (
        <TextInput
          key={i}
          style={[s.input, { borderColor: colors.border, color: colors.textPrimary, fontFamily: 'DMSans-Regular' }]}
          placeholder={`Priority ${i + 1}`}
          placeholderTextColor={colors.textMuted}
          value={v}
          onChangeText={t => setAt(i, t)}
        />
      ))}
      <TouchableOpacity style={[s.add, { backgroundColor: colors.textPrimary }]} activeOpacity={0.85} onPress={add}>
        <AppText variant="button" color={colors.bgCard}>+ Add task</AppText>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: Spacing.sm },
  add: { borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 2 },
});
