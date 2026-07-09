// TagPickerSheet — the Freestyle "Hashtags" tool: manage manual tags on this
// entry, plus a "Pin to Calendar" switch. Pinned entries show a star marker
// on their day in the Calendar tab (see CalendarScreen).
import React, { useState } from 'react';
import { Modal, View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';
import { DEFAULT_TAGS } from '../../types';

interface Props {
  visible: boolean;
  tags: string[];
  important: boolean;
  onChangeTags: (tags: string[]) => void;
  onChangeImportant: (v: boolean) => void;
  onClose: () => void;
}

export function TagPickerSheet({ visible, tags, important, onChangeTags, onChangeImportant, onClose }: Props) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '');
    if (!t || tags.includes(t)) { setDraft(''); return; }
    onChangeTags([...tags, t]);
    setDraft('');
  };
  const removeTag = (t: string) => onChangeTags(tags.filter(x => x !== t));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[s.sheet, { backgroundColor: colors.bgCard }]}>
          <AppText variant="headingSmall" color={colors.textPrimary} align="center" style={s.title}>Hashtags</AppText>

          {tags.length > 0 && (
            <View style={s.chipRow}>
              {tags.map(t => (
                <View key={t} style={[s.chip, { backgroundColor: colors.primary + '20' }]}>
                  <AppText variant="caption" color={colors.primary}>#{t}</AppText>
                  <TouchableOpacity onPress={() => removeTag(t)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <AppText variant="caption" color={colors.primary}> ✕</AppText>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={[s.inputRow, { borderColor: colors.border }]}>
            <TextInput
              style={[s.input, { color: colors.textPrimary, fontFamily: 'DMSans-Regular' }]}
              placeholder="Add a hashtag" placeholderTextColor={colors.textMuted}
              value={draft} onChangeText={setDraft}
              onSubmitEditing={() => addTag(draft)} returnKeyType="done"
            />
            <TouchableOpacity onPress={() => addTag(draft)}>
              <AppText variant="button" color={colors.primary}>Add</AppText>
            </TouchableOpacity>
          </View>

          <AppText variant="caption" color={colors.textMuted} style={s.suggestLabel}>Suggestions</AppText>
          <View style={s.chipRow}>
            {DEFAULT_TAGS.filter(t => !tags.includes(t)).map(t => (
              <TouchableOpacity key={t} style={[s.chip, { backgroundColor: colors.bgInput }]} activeOpacity={0.75} onPress={() => addTag(t)}>
                <AppText variant="caption" color={colors.textSecondary}>#{t}</AppText>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[s.pinRow, { borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => onChangeImportant(!important)}
          >
            <AppText variant="body" color={colors.textPrimary}>📌 Pin to Calendar</AppText>
            <View style={[s.toggle, { backgroundColor: important ? colors.primary : colors.bgInput }]}>
              <View style={[s.knob, { alignSelf: important ? 'flex-end' : 'flex-start' }]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[s.doneBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85} onPress={onClose}>
            <AppText variant="button" color={colors.bgCard}>Done</AppText>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000055', paddingHorizontal: Spacing.lg },
  sheet: { width: '100%', maxWidth: 420, borderRadius: 24, padding: Spacing.lg },
  title: { marginBottom: Spacing.base },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, marginBottom: Spacing.base, gap: Spacing.sm },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },
  suggestLabel: { marginBottom: Spacing.xs },
  pinRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.base, marginTop: Spacing.base },
  toggle: { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  doneBtn: { borderRadius: Radius.full, paddingVertical: Spacing.base, alignItems: 'center', marginTop: Spacing.lg },
});
