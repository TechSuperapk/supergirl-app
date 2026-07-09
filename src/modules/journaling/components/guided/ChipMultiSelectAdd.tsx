// ChipMultiSelectAdd — ChipMultiSelect plus a trailing "+ Add your own" chip.
// Tapping it reveals a small inline text field; submitting adds a brand-new
// custom chip (via onAddCustom) and selects it immediately.
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Radius, Spacing } from '../../../../shared/theme/spacing';
import { ChipMultiSelect } from './ChipMultiSelect';
import type { ChipDef } from './guidedConfig';

interface Props {
  options: ChipDef[];
  extra?: ChipDef[];
  selected: string[];
  onToggle: (key: string) => void;
  onAddCustom: (label: string) => void;
  addLabel?: string;
}

export function ChipMultiSelectAdd({ options, extra = [], selected, onToggle, onAddCustom, addLabel = '+ Add your own' }: Props) {
  const { colors } = useTheme();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const submit = () => {
    const v = draft.trim();
    if (v) onAddCustom(v);
    setDraft('');
    setAdding(false);
  };

  return (
    <View>
      <ChipMultiSelect options={[...options, ...extra]} selected={selected} onToggle={onToggle} />
      {adding ? (
        <View style={[s.addRow, { borderColor: colors.border }]}>
          <TextInput
            style={[s.addInput, { color: colors.textPrimary, fontFamily: 'DMSans-Regular' }]}
            placeholder="Type your own…"
            placeholderTextColor={colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            autoFocus
            onSubmitEditing={submit}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={submit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <AppText variant="label" color={colors.primary}>Add</AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={s.addChip} activeOpacity={0.7} onPress={() => setAdding(true)}>
          <AppText variant="bodySmall" color={colors.textSecondary}>{addLabel}</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  addChip: { marginTop: Spacing.sm, alignSelf: 'flex-start' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, marginTop: Spacing.sm },
  addInput: { flex: 1, fontSize: 14, paddingVertical: 4 },
});
