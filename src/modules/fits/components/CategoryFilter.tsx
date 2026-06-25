import React from 'react';
import { ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Colors }    from '../../../shared/theme/colors';
import { FontFamily, FontSize } from '../../../shared/theme/typography';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { ClothingCategory } from '../types';

const CATEGORIES: { key: ClothingCategory | 'all'; label: string; emoji: string }[] = [
  { key: 'all',         label: 'All',         emoji: '👚' },
  { key: 'tops',        label: 'Tops',        emoji: '👕' },
  { key: 'bottoms',     label: 'Bottoms',     emoji: '👖' },
  { key: 'dresses',     label: 'Dresses',     emoji: '👗' },
  { key: 'jackets',     label: 'Jackets',     emoji: '🧥' },
  { key: 'shoes',       label: 'Shoes',       emoji: '👟' },
  { key: 'accessories', label: 'Accessories', emoji: '💍' },
  { key: 'watches',     label: 'Watches',     emoji: '⌚' },
  { key: 'bags',        label: 'Bags',        emoji: '👜' },
];

interface Props {
  active:   ClothingCategory | 'all';
  onChange: (cat: ClothingCategory | 'all') => void;
}

export function CategoryFilter({ active, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
    >
      {CATEGORIES.map(cat => {
        const isActive = cat.key === active;
        return (
          <TouchableOpacity
            key={cat.key}
            style={[s.pill, isActive && s.pillActive]}
            onPress={() => onChange(cat.key)}
            activeOpacity={0.75}
          >
            <Text style={s.emoji}>{cat.emoji}</Text>
            <Text style={[s.label, { color: isActive ? Colors.white : Colors.textSecondary },
              isActive && { fontFamily: FontFamily.bold }]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export { CATEGORIES };

const s = StyleSheet.create({
  row: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: 8 },
  pill: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius:    Radius.full,
    backgroundColor: Colors.bgInput,
    borderWidth:     1.5,
    borderColor:     Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.fits,
    borderColor:     Colors.fits,
  },
  emoji: { fontSize: 15 },
  label: { fontFamily: FontFamily.regular, fontSize: FontSize.sm },
});
