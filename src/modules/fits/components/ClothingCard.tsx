import React from 'react';
import {
  View, TouchableOpacity, Image, StyleSheet, Text,
} from 'react-native';
import { AppText }   from '../../../shared/components/AppText';
import { Colors }    from '../../../shared/theme/colors';
import { FontFamily, FontSize } from '../../../shared/theme/typography';
import { Radius, Shadows, Spacing } from '../../../shared/theme/spacing';
import { ClothingItem } from '../types';

interface Props {
  item:        ClothingItem;
  onPress:     () => void;
  onLongPress?: () => void;
  selected?:   boolean;   // for outfit builder multi-select
  compact?:    boolean;
}

export function ClothingCard({
  item, onPress, onLongPress, selected = false, compact = false,
}: Props) {
  return (
    <TouchableOpacity
      style={[s.card, compact && s.compact, selected && s.selectedCard]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.88}
    >
      {/* Image */}
      <View style={[s.imageWrap, compact && s.imageCompact]}>
        {item.imageUri ? (
          <Image
            source={{ uri: item.imageUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, s.placeholder]}>
            <Text style={s.placeholderEmoji}>👗</Text>
          </View>
        )}

        {/* Favourite star */}
        {item.isFavourite && (
          <View style={s.favBadge}>
            <Text style={{ fontSize: 10 }}>⭐</Text>
          </View>
        )}

        {/* Selection checkmark */}
        {selected && (
          <View style={s.checkOverlay}>
            <View style={s.checkCircle}>
              <Text style={{ fontSize: 14, color: Colors.white }}>✓</Text>
            </View>
          </View>
        )}
      </View>

      {/* Info */}
      {!compact && (
        <View style={s.info}>
          <AppText
            variant="label"
            color={Colors.textPrimary}
            numberOfLines={1}
          >
            {item.name}
          </AppText>
          {item.colorTags.length > 0 && (
            <View style={s.colorRow}>
              {item.colorTags.slice(0, 3).map(color => (
                <View
                  key={color}
                  style={[s.colorDot, { backgroundColor: color.startsWith('#') ? color : Colors.bgInput }]}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const CARD_SIZE  = 160;
const COMPACT_SIZE = 80;

const s = StyleSheet.create({
  card: {
    width:           CARD_SIZE,
    borderRadius:    Radius.lg,
    backgroundColor: Colors.bgCard,
    overflow:        'hidden',
    ...Shadows.sm,
  },
  compact: { width: COMPACT_SIZE },
  selectedCard: {
    borderWidth:  2.5,
    borderColor:  Colors.fits,
  },
  imageWrap: {
    width:  CARD_SIZE,
    height: CARD_SIZE,
    backgroundColor: Colors.bgInput,
  },
  imageCompact: { width: COMPACT_SIZE, height: COMPACT_SIZE },
  placeholder: {
    alignItems:     'center',
    justifyContent: 'center',
    backgroundColor: Colors.fits + '12',
  },
  placeholderEmoji: { fontSize: 36 },
  favBadge: {
    position:        'absolute',
    top:             6, right: 6,
    width:           22, height: 22,
    borderRadius:    11,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  checkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(191,54,12,0.3)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  checkCircle: {
    width:           34, height: 34,
    borderRadius:    17,
    backgroundColor: Colors.fits,
    alignItems:      'center', justifyContent: 'center',
  },
  info:     { padding: Spacing.sm, gap: 4 },
  colorRow: { flexDirection: 'row', gap: 4 },
  colorDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
});
