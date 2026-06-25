import React from 'react';
import {
  View, TouchableOpacity, StyleSheet, ScrollView,
  Alert, TextInput,
} from 'react-native';
import { AppText }      from '../../../shared/components/AppText';
import { Colors }       from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { FontFamily }   from '../../../shared/theme/typography';
import { BoardElement } from '../types';

interface Props {
  element:         BoardElement;
  onUpdate:        (patch: Partial<BoardElement>) => void;
  onDelete:        () => void;
  onDuplicate:     () => void;
  onBringForward:  () => void;
  onSendBackward:  () => void;
}

const TEXT_COLORS = [
  '#111111','#FFFFFF','#2979FF','#E91E63','#F9A825',
  '#43A047','#E53935','#7B1FA2','#FF7043','#546E7A',
];

const FONT_SIZES = [14, 18, 24, 32, 40, 56];

const BG_COLORS = [
  'transparent','#FFFFFF','#FFF9C4','#F3E5F5',
  '#E3F2FD','#E8F5E9','#FCE4EC','#111111',
];

function ToolBtn({
  emoji, label, onPress, active,
}: { emoji: string; label: string; onPress: () => void; active?: boolean }) {
  return (
    <TouchableOpacity
      style={[s.toolBtn, active && s.toolBtnActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <AppText style={{ fontSize: 18 }}>{emoji}</AppText>
      <AppText style={[s.toolLabel, active && { color: Colors.boards }]}>{label}</AppText>
    </TouchableOpacity>
  );
}

export function ElementToolbar({
  element, onUpdate, onDelete, onDuplicate, onBringForward, onSendBackward,
}: Props) {
  return (
    <View style={s.container}>
      {/* Common actions */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        <ToolBtn emoji="📋" label="Duplicate" onPress={onDuplicate} />
        <ToolBtn emoji="⬆️" label="Forward"   onPress={onBringForward} />
        <ToolBtn emoji="⬇️" label="Backward"  onPress={onSendBackward} />
        <ToolBtn emoji="🗑️" label="Delete"    onPress={() =>
          Alert.alert('Delete element?', undefined, [
            { text: 'Delete', style: 'destructive', onPress: onDelete },
            { text: 'Cancel', style: 'cancel' },
          ])
        } />
      </ScrollView>

      {/* Text element controls */}
      {element.type === 'text' && (
        <>
          {/* Editable text */}
          <TextInput
            style={s.textEdit}
            value={element.text}
            onChangeText={text => onUpdate({ text })}
            multiline
            placeholder="Your text…"
            placeholderTextColor={Colors.textLight}
          />

          {/* Font size */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
            {FONT_SIZES.map(size => (
              <TouchableOpacity
                key={size}
                style={[s.sizeBtn, element.fontSize === size && s.sizeBtnActive]}
                onPress={() => onUpdate({ fontSize: size })}
              >
                <AppText
                  variant="caption"
                  color={element.fontSize === size ? Colors.white : Colors.textSecondary}
                  style={{ fontFamily: element.fontSize === size ? FontFamily.bold : FontFamily.regular }}
                >
                  {size}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Text colours */}
          <View style={s.colorLabel}>
            <AppText variant="caption" color={Colors.textMuted}>Text color</AppText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
            {TEXT_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  s.colorDot,
                  { backgroundColor: c, borderColor: c === '#FFFFFF' ? Colors.border : c },
                  element.color === c && s.colorDotSelected,
                ]}
                onPress={() => onUpdate({ color: c })}
              />
            ))}
          </ScrollView>

          {/* Background colours */}
          <View style={s.colorLabel}>
            <AppText variant="caption" color={Colors.textMuted}>Background</AppText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
            {BG_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  s.colorDot,
                  {
                    backgroundColor: c === 'transparent' ? Colors.bgInput : c,
                    borderColor: Colors.border,
                  },
                  element.bgColor === c && s.colorDotSelected,
                ]}
                onPress={() => onUpdate({ bgColor: c })}
              >
                {c === 'transparent' && (
                  <AppText style={{ fontSize: 10, color: Colors.textMuted }}>∅</AppText>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Image opacity */}
      {element.type === 'image' && (
        <View style={s.opacityRow}>
          <AppText variant="caption" color={Colors.textMuted}>Opacity</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
            {[0.2, 0.4, 0.6, 0.8, 1.0].map(op => (
              <TouchableOpacity
                key={op}
                style={[s.sizeBtn, Math.abs((element.opacity ?? 1) - op) < 0.05 && s.sizeBtnActive]}
                onPress={() => onUpdate({ opacity: op })}
              >
                <AppText
                  variant="caption"
                  color={Math.abs((element.opacity ?? 1) - op) < 0.05 ? Colors.white : Colors.textSecondary}
                >
                  {Math.round(op * 100)}%
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 0.5,
    borderTopColor: Colors.divider,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  row:       { paddingHorizontal: Spacing.sm, gap: 8, alignItems: 'center' },
  toolBtn: {
    alignItems: 'center', gap: 2,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgInput,
  },
  toolBtnActive: { backgroundColor: Colors.boards + '20' },
  toolLabel: { fontSize: 9, fontFamily: FontFamily.regular, color: Colors.textMuted },
  textEdit: {
    marginHorizontal: Spacing.sm,
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 44,
    borderWidth: 1, borderColor: Colors.border,
  },
  sizeBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgInput,
    minWidth: 36, alignItems: 'center',
  },
  sizeBtnActive: { backgroundColor: Colors.boards },
  colorLabel:    { paddingHorizontal: Spacing.base },
  colorDot: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  colorDotSelected: { borderWidth: 3, borderColor: Colors.boards, transform: [{ scale: 1.15 }] },
  opacityRow:   { paddingHorizontal: Spacing.sm, gap: 4 },
});
