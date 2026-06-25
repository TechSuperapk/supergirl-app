import React from 'react';
import {
  View, TouchableOpacity, Image, StyleSheet, Text,
} from 'react-native';
import { AppText }      from '../../../shared/components/AppText';
import { Colors }       from '../../../shared/theme/colors';
import { Radius, Shadows, Spacing } from '../../../shared/theme/spacing';
import { Outfit, ClothingItem } from '../types';

interface Props {
  outfit:  Outfit;
  items:   ClothingItem[];   // resolved wardrobe items
  onPress: () => void;
}

export function OutfitCard({ outfit, items, onPress }: Props) {
  const preview = items.slice(0, 4);

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.88}>
      {/* Image mosaic */}
      <View style={s.mosaic}>
        {preview.length === 0 ? (
          <View style={[StyleSheet.absoluteFill, s.emptyMosaic]}>
            <Text style={{ fontSize: 32 }}>👗</Text>
          </View>
        ) : preview.length === 1 ? (
          <Image source={{ uri: preview[0].imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={s.grid}>
            {preview.map((item, i) => (
              <View key={item.id} style={s.gridTile}>
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <View style={[StyleSheet.absoluteFill, s.tilePlaceholder]}>
                    <Text style={{ fontSize: 18 }}>👗</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Favourite */}
        {outfit.isFavourite && (
          <View style={s.favBadge}><Text style={{ fontSize: 11 }}>⭐</Text></View>
        )}

        {/* Item count chip */}
        <View style={s.countChip}>
          <AppText variant="caption" color={Colors.white} style={{ fontFamily: 'DMSans-Bold' }}>
            {items.length} items
          </AppText>
        </View>
      </View>

      {/* Info */}
      <View style={s.info}>
        <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={1}>
          {outfit.name}
        </AppText>
        {outfit.occasion && (
          <AppText variant="caption" color={Colors.textMuted}>{outfit.occasion}</AppText>
        )}
        {outfit.tags.length > 0 && (
          <View style={s.tagsRow}>
            {outfit.tags.slice(0, 2).map(tag => (
              <View key={tag} style={s.tagPill}>
                <AppText variant="caption" color={Colors.fits} style={{ fontSize: 10 }}>
                  {tag}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.lg,
    overflow:        'hidden',
    ...Shadows.md,
  },
  mosaic:      { height: 160, position: 'relative', backgroundColor: Colors.bgInput },
  emptyMosaic: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.fits + '12' },
  grid: {
    flex:        1,
    flexDirection: 'row',
    flexWrap:    'wrap',
  },
  gridTile: { width: '50%', height: '50%', overflow: 'hidden' },
  tilePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgInput },
  favBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 11, width: 22, height: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  countChip: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  info:    { padding: Spacing.sm, gap: 3 },
  tagsRow: { flexDirection: 'row', gap: 4, marginTop: 2 },
  tagPill: {
    backgroundColor: Colors.fits + '18',
    borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
  },
});
