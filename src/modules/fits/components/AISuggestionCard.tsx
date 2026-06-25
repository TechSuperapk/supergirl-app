import React, { useState } from 'react';
import {
  View, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { AppText }       from '../../../shared/components/AppText';
import { AppButton }     from '../../../shared/components/AppButton';
import { ClothingCard }  from './ClothingCard';
import { Colors }        from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { AISuggestion, ClothingItem } from '../types';

interface Props {
  suggestion:  AISuggestion;
  items:       ClothingItem[];
  onSaveOutfit: (ids: string[], name: string) => Promise<void>;
}

const OCCASION_EMOJI: Record<string, string> = {
  casual:     '☀️',
  work:       '💼',
  'date night': '🌹',
  date:       '🌹',
  party:      '🎉',
  gym:        '💪',
  formal:     '👔',
  brunch:     '🥂',
};

export function AISuggestionCard({ suggestion, items, onSaveOutfit }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const emoji = OCCASION_EMOJI[suggestion.occasion?.toLowerCase() ?? ''] ?? '✨';

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveOutfit(
        suggestion.outfitItemIds,
        `${emoji} ${suggestion.occasion ?? 'AI Outfit'} ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
      );
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.card}>
      {/* Occasion badge */}
      <View style={s.header}>
        <View style={s.occasionPill}>
          <AppText style={{ fontSize: 14 }}>{emoji}</AppText>
          <AppText variant="label" color={Colors.fits}>
            {suggestion.occasion ?? 'Outfit suggestion'}
          </AppText>
        </View>
        <View style={s.aiBadge}>
          <AppText variant="caption" color={Colors.white} style={{ fontFamily: 'DMSans-Bold' }}>
            ✨ AI Pick
          </AppText>
        </View>
      </View>

      {/* Items horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.itemsRow}
      >
        {items.map(item => (
          <ClothingCard
            key={item.id}
            item={item}
            onPress={() => {}}
            compact
          />
        ))}
      </ScrollView>

      {/* AI reason */}
      <AppText variant="bodySmall" color={Colors.textSecondary} style={s.reason}>
        💡 {suggestion.reason}
      </AppText>

      {/* Save button */}
      <AppButton
        label={saved ? '✓ Saved to Outfits' : 'Save Outfit'}
        onPress={handleSave}
        loading={saving}
        disabled={saved}
        variant={saved ? 'ghost' : 'secondary'}
        size="sm"
        style={s.saveBtn}
      />
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.lg,
    padding:         Spacing.base,
    gap:             Spacing.sm,
    borderWidth:     1,
    borderColor:     Colors.fits + '30',
    ...Shadows.md,
  },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  occasionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.fits + '12',
    borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  aiBadge: {
    backgroundColor: Colors.fits,
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  itemsRow: { gap: 8, paddingVertical: 4 },
  reason:  { lineHeight: 19, fontStyle: 'italic' },
  saveBtn: { alignSelf: 'flex-end' },
});
