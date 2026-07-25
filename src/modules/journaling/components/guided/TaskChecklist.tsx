// TaskChecklist — a row per task: a round checkbox + a text input, with a
// plain "+ Add…" link underneath (matches the To-Do/Gratitude-task cards).
import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';
import { sentenceCase } from '../../utils/textCase';

export interface TaskItem { text: string; done: boolean; }
interface Props {
  items: TaskItem[];
  onChange: (items: TaskItem[]) => void;
  placeholder?: string;
  addLabel?: string;
  /** false hides the round checkbox — used for plain gratitude-line lists
   *  that don't have a done/undone state, just free text rows. */
  showCheckbox?: boolean;
  /** Show a bullet dot in front of each row (appears filled once the row has
   *  text), and auto-append a fresh empty row as soon as the last one is
   *  typed into — so the list grows on its own like a note app. */
  bullet?: boolean;
  /** Sentence-case each line as it's typed (first letter caps). */
  autoCase?: boolean;
}

export function TaskChecklist({ items, onChange, placeholder = 'Add your task….', addLabel = '+ Add task', showCheckbox = true, bullet = false, autoCase = false }: Props) {
  const { colors } = useTheme();
  const setText = (i: number, v: string) => {
    const val = autoCase ? sentenceCase(v) : v;
    let next = items.map((it, idx) => (idx === i ? { ...it, text: val } : it));
    // Auto-grow: typing into the last row spawns a new empty one beneath it.
    if (bullet && i === items.length - 1 && val.trim().length > 0) {
      next = [...next, { text: '', done: false }];
    }
    onChange(next);
  };
  const toggle = (i: number) => onChange(items.map((it, idx) => (idx === i ? { ...it, done: !it.done } : it)));
  const add = () => onChange([...items, { text: '', done: false }]);

  return (
    <View>
      {items.map((it, i) => (
        <View key={i} style={s.row}>
          {bullet ? (
            <View style={[s.bullet, { backgroundColor: it.text.trim() ? colors.textPrimary : 'transparent', borderColor: colors.border }]} />
          ) : showCheckbox ? (
            <TouchableOpacity
              style={[s.checkbox, { borderColor: colors.border, backgroundColor: it.done ? colors.textPrimary : 'transparent' }]}
              activeOpacity={0.7}
              onPress={() => toggle(i)}
            />
          ) : null}
          <TextInput
            style={[s.input, { borderColor: colors.border, color: colors.textPrimary, fontFamily: 'DMSans-Regular' }]}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            value={it.text}
            onChangeText={v => setText(i, v)}
            autoCapitalize={autoCase ? 'sentences' : 'none'}
          />
        </View>
      ))}
      {!bullet && (
        <TouchableOpacity onPress={add} activeOpacity={0.7} style={s.addTap}>
          <AppText variant="bodySmall" color={colors.textSecondary}>{addLabel}</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5 },
  bullet: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, marginHorizontal: 7 },
  input: { flex: 1, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  addTap: { marginTop: 2, alignSelf: 'flex-start' },
});
