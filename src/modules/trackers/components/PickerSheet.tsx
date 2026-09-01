/**
 * PickerSheet — generic "tap a field → bottom sheet list of options" picker,
 * with an optional free-text "Other" entry. Used by the Sickness tracker's
 * symptom / severity / medication / frequency fields.
 */
import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { AppText } from '../../../shared/components/AppText';
import { Colors } from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { BottomSheet, PrimaryButton } from './HabitOverlays';

interface Props {
  visible:      boolean;
  title:        string;
  options:      string[];
  value?:       string;
  allowCustom?: boolean;
  onSelect:     (value: string) => void;
  onClose:      () => void;
}

export function PickerSheet({ visible, title, options, value, allowCustom, onSelect, onClose }: Props) {
  const [custom, setCustom] = useState('');
  const showCustomInput = allowCustom && value === 'Other';

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={s.list}>
        {options.map(opt => (
          <TouchableOpacity key={opt} style={s.row} activeOpacity={0.75} onPress={() => { onSelect(opt); if (opt !== 'Other') onClose(); }}>
            <AppText variant="body" color={value === opt ? Colors.textPrimary : Colors.textSecondary}
              style={value === opt ? { fontFamily: 'DMSans-Bold' } : undefined}>
              {opt}
            </AppText>
            {value === opt && <AppText color={Colors.primary}>✓</AppText>}
          </TouchableOpacity>
        ))}
      </View>
      {showCustomInput && (
        <>
          <TextInput
            style={s.input}
            placeholder="Type it in…"
            placeholderTextColor={Colors.textLight}
            value={custom}
            onChangeText={setCustom}
          />
          <PrimaryButton label="Use this" onPress={() => { if (custom.trim()) { onSelect(custom.trim()); onClose(); } }} />
        </>
      )}
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  list: { maxHeight: 360 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.base, marginTop: Spacing.sm, marginBottom: Spacing.md,
    fontFamily: 'DMSans-Regular', fontSize: 15, color: Colors.textPrimary,
  } as any,
});
