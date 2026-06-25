import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Text } from 'react-native';
import { AppText }   from '../../../shared/components/AppText';
import { Colors }    from '../../../shared/theme/colors';
import { Radius, Spacing } from '../../../shared/theme/spacing';
import { Outfit, ClothingItem } from '../types';

interface Props {
  date:       string;    // YYYY-MM-DD
  outfit:     Outfit | null;
  items:      ClothingItem[];
  isToday:    boolean;
  onPress:    () => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function PlannerDayCell({ date, outfit, items, isToday, onPress }: Props) {
  const d        = new Date(date + 'T00:00:00');
  const dayLabel = DAY_LABELS[d.getDay()];
  const dayNum   = d.getDate();
  const previewImages = items.slice(0, 2).map(i => i.imageUri).filter(Boolean);

  return (
    <TouchableOpacity
      style={[s.cell, isToday && s.todayCell]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Day label */}
      <View style={[s.dayHeader, isToday && s.todayHeader]}>
        <AppText
          variant="caption"
          color={isToday ? Colors.white : Colors.textMuted}
          style={{ fontFamily: isToday ? 'DMSans-Bold' : 'DMSans-Regular' }}
        >
          {dayLabel}
        </AppText>
        <AppText
          variant="headingSmall"
          color={isToday ? Colors.white : Colors.textPrimary}
        >
          {dayNum}
        </AppText>
      </View>

      {/* Outfit preview */}
      <View style={s.preview}>
        {outfit && previewImages.length > 0 ? (
          <View style={s.imageStack}>
            {previewImages.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={[s.previewImg, { left: i * 14, zIndex: i }]}
                resizeMode="cover"
              />
            ))}
          </View>
        ) : outfit ? (
          <Text style={s.outfitEmoji}>👗</Text>
        ) : (
          <View style={s.emptySlot}>
            <Text style={s.plusIcon}>+</Text>
          </View>
        )}
      </View>

      {/* Outfit name */}
      {outfit && (
        <AppText
          variant="caption"
          color={Colors.textMuted}
          numberOfLines={1}
          style={s.outfitName}
        >
          {outfit.name}
        </AppText>
      )}
    </TouchableOpacity>
  );
}

const CELL_W = 86;

const s = StyleSheet.create({
  cell: {
    width:           CELL_W,
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.lg,
    overflow:        'hidden',
    borderWidth:     1.5,
    borderColor:     Colors.border,
    alignItems:      'center',
  },
  todayCell: { borderColor: Colors.fits, borderWidth: 2 },
  dayHeader: {
    width: '100%',
    alignItems:      'center',
    paddingVertical: 6,
    backgroundColor: Colors.bgInput,
    gap: 1,
  },
  todayHeader: { backgroundColor: Colors.fits },
  preview: {
    height:          80,
    width:           '100%',
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: Spacing.sm,
  },
  imageStack: { position: 'relative', width: 60, height: 60 },
  previewImg: {
    position:     'absolute',
    width:        42,
    height:       42,
    borderRadius: 8,
    borderWidth:  1.5,
    borderColor:  Colors.white,
    top: 0,
  },
  outfitEmoji: { fontSize: 32 },
  emptySlot: {
    width: 44, height: 44, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  plusIcon:    { fontSize: 22, color: Colors.textLight },
  outfitName: {
    paddingHorizontal: 6,
    paddingBottom:     6,
    textAlign:         'center',
  },
});
