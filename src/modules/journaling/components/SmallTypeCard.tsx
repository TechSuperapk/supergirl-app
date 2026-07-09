// SmallTypeCard — the compact Quotes/Ideas/Affirmation card: real icon GIF
// (falls back to the plain emoji) on top, bold label underneath. Shared by
// every popup that lists these note types (AllTypesSheet, NoteTypePicker) so
// they all look identical.
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../shared/components/AppText';
import type { JournalTypeDef } from './home';
import { TypeIcon } from './BigTypeCard';

export function SmallTypeCard({ item, onPress }: { item: JournalTypeDef; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.smallCard} activeOpacity={0.85} onPress={onPress}>
      <TypeIcon item={item} imageStyle={s.smallIconImage} emojiStyle={s.smallEmoji} />
      <AppText variant="headingSmall" color="#000000" align="center" style={s.smallLabel}>{item.label}</AppText>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  smallCard: {
    flex: 1,
    height: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(153,153,153,0.20)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 12,
    paddingTop: 44,
    overflow: 'hidden',
  },
  smallEmoji: { position: 'absolute', top: 6, fontSize: 52 },
  smallIconImage: { position: 'absolute', top: 6, width: 64, height: 64 },
  smallLabel: { fontSize: 16 },
});
