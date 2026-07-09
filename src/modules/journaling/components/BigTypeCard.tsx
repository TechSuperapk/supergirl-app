// BigTypeCard — the large Morning/Night/Dream/Vent row card: title + subtitle
// on the left, a real icon GIF (falls back to the plain emoji) bleeding off
// the top-right corner. Shared by every popup that lists journal types
// (AllTypesSheet, JournalTypePicker) so they all look identical.
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from '../../../shared/components/AppText';
import type { JournalTypeDef } from './home';
import { JOURNAL_TYPE_ICONS } from './home/journalTypeIcons';

export function TypeIcon({ item, imageStyle, emojiStyle }: { item: JournalTypeDef; imageStyle: any; emojiStyle: any }) {
  const source = JOURNAL_TYPE_ICONS[item.key];
  if (source) {
    return <Image source={source} style={imageStyle} contentFit="contain" autoplay />;
  }
  return <Text style={emojiStyle}>{item.emoji}</Text>;
}

export function BigTypeCard({ item, onPress }: { item: JournalTypeDef; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.bigCard} activeOpacity={0.85} onPress={onPress}>
      <View style={s.bigCardText}>
        <AppText variant="headingMedium" color="#000000" style={s.bigTitle}>{item.label}</AppText>
        {!!item.subtitle && (
          <AppText variant="bodySmall" color="#BFBFBF" style={s.bigSubtitle}>{item.subtitle}</AppText>
        )}
      </View>
      <TypeIcon item={item} imageStyle={s.bigIconImage} emojiStyle={s.bigEmoji} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  bigCard: {
    height: 100,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(153,153,153,0.20)',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  bigCardText: { flex: 1, gap: 4 },
  bigTitle: { fontSize: 20 },
  bigSubtitle: { maxWidth: 170 },
  bigEmoji: {
    position: 'absolute',
    right: -6,
    top: -8,
    fontSize: 92,
  },
  bigIconImage: {
    position: 'absolute',
    right: -6,
    top: -8,
    width: 112,
    height: 112,
  },
});
