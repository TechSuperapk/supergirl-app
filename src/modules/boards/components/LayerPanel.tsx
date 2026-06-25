import React from 'react';
import {
  View, TouchableOpacity, ScrollView, StyleSheet, Text,
} from 'react-native';
import { AppText }      from '../../../shared/components/AppText';
import { Colors }       from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { BoardElement } from '../types';

interface Props {
  elements:  BoardElement[];
  selected:  string | null;
  onSelect:  (id: string) => void;
  onDelete:  (id: string) => void;
  onClose:   () => void;
}

const TYPE_EMOJI: Record<BoardElement['type'], string> = {
  image:   '🖼️',
  text:    '📝',
  sticker: '🎭',
  shape:   '⬛',
};

export function LayerPanel({ elements, selected, onSelect, onDelete, onClose }: Props) {
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex); // top layer first

  return (
    <View style={s.container}>
      <View style={s.header}>
        <AppText variant="headingSmall" color={Colors.textPrimary}>
          Layers ({elements.length})
        </AppText>
        <TouchableOpacity onPress={onClose}>
          <AppText variant="headingSmall" color={Colors.textMuted}>✕</AppText>
        </TouchableOpacity>
      </View>

      {sorted.length === 0 ? (
        <AppText variant="bodySmall" color={Colors.textMuted} style={s.empty}>
          No elements yet. Add images, text, or stickers.
        </AppText>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260 }}>
          {sorted.map((el, i) => (
            <TouchableOpacity
              key={el.id}
              style={[s.layerRow, selected === el.id && s.layerRowSelected]}
              onPress={() => onSelect(el.id)}
              activeOpacity={0.8}
            >
              {/* Type icon */}
              <Text style={s.typeEmoji}>{TYPE_EMOJI[el.type]}</Text>

              {/* Label */}
              <View style={s.labelCol}>
                <AppText
                  variant="label"
                  color={selected === el.id ? Colors.boards : Colors.textPrimary}
                  numberOfLines={1}
                >
                  {el.type === 'text'    ? (el.text?.slice(0, 20) ?? 'Text') :
                   el.type === 'sticker' ? `Sticker ${el.emoji}` :
                   el.type === 'image'   ? 'Image' : 'Shape'}
                </AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  Layer {el.zIndex + 1} · {el.type}
                </AppText>
              </View>

              {/* Delete */}
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={() => onDelete(el.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AppText style={{ fontSize: 14, color: Colors.error }}>✕</AppText>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  empty:     { textAlign: 'center', padding: Spacing.xl },
  layerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  layerRowSelected: { backgroundColor: Colors.boards + '10' },
  typeEmoji:  { fontSize: 22, width: 30 },
  labelCol:   { flex: 1, gap: 2 },
  deleteBtn:  { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
});
