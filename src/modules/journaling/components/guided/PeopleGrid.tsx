// PeopleGrid — 4-per-row circular avatars (emoji), tap to select. Ring when on.
// An optional "+ Add" tile lets the user add a person by name.
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';
import type { ChipDef } from './guidedConfig';

interface Props {
  options: ChipDef[];
  selected: string[];
  onToggle: (key: string) => void;
  /** When provided, a "+ Add" tile appears; submitting a name calls this. */
  onAddPerson?: (name: string) => void;
}

export function PeopleGrid({ options, selected, onToggle, onAddPerson }: Props) {
  const { colors } = useTheme();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const submit = () => {
    const v = name.trim();
    if (v && onAddPerson) onAddPerson(v);
    setName('');
    setAdding(false);
  };

  return (
    <View>
      <View style={s.grid}>
        {options.map(o => {
          const on = selected.includes(o.key);
          return (
            <TouchableOpacity key={o.key} style={s.item} activeOpacity={0.75} onPress={() => onToggle(o.key)}>
              <View style={[s.avatar, { backgroundColor: colors.bgInput, borderColor: on ? colors.primary : 'transparent' }]}>
                <Text style={s.emoji}>{o.emoji}</Text>
              </View>
              <AppText variant="caption" color={on ? colors.primary : colors.textSecondary} align="center" numberOfLines={1}>{o.label}</AppText>
            </TouchableOpacity>
          );
        })}
        {onAddPerson && (
          <TouchableOpacity style={s.item} activeOpacity={0.75} onPress={() => setAdding(true)}>
            <View style={[s.avatar, s.addAvatar, { borderColor: colors.border }]}>
              <Text style={[s.emoji, { color: colors.textMuted }]}>＋</Text>
            </View>
            <AppText variant="caption" color={colors.textSecondary} align="center">Add</AppText>
          </TouchableOpacity>
        )}
      </View>

      {adding && (
        <View style={[s.addRow, { borderColor: colors.border }]}>
          <TextInput
            style={[s.addInput, { color: colors.textPrimary, fontFamily: 'DMSans-Regular' }]}
            placeholder="Enter a name…"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
            onSubmitEditing={submit}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={submit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <AppText variant="label" color={colors.primary}>Add</AppText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  item: { width: '25%', alignItems: 'center', marginBottom: Spacing.base, gap: 5 },
  avatar: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  addAvatar: { borderStyle: 'dashed', borderWidth: 1.5 },
  emoji: { fontSize: 26 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, marginTop: Spacing.xs },
  addInput: { flex: 1, fontSize: 14, paddingVertical: 4 },
});
