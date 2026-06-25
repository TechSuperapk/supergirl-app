import React from 'react';
import {
  View, TouchableOpacity, Image, StyleSheet, Text,
} from 'react-native';
import { AppText }   from '../../../shared/components/AppText';
import { Colors }    from '../../../shared/theme/colors';
import { Radius, Shadows, Spacing } from '../../../shared/theme/spacing';
import { Board, BoardType } from '../types';

const BOARD_TYPE_META: Record<BoardType, { emoji: string; label: string; color: string }> = {
  vision:      { emoji: '🌟', label: 'Vision',      color: '#7B1FA2' },
  achievement: { emoji: '🏆', label: 'Achievement', color: '#F9A825' },
  mood:        { emoji: '🎨', label: 'Mood',        color: '#E91E63' },
  travel:      { emoji: '✈️', label: 'Travel',       color: '#0277BD' },
  personal:    { emoji: '💫', label: 'Personal',    color: '#2E7D32' },
  custom:      { emoji: '📌', label: 'Custom',      color: '#546E7A' },
};

interface Props {
  board:    Board;
  onPress:  () => void;
  onLongPress?: () => void;
}

export function BoardCard({ board, onPress, onLongPress }: Props) {
  const meta = BOARD_TYPE_META[board.type];

  return (
    <TouchableOpacity
      style={s.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.88}
    >
      {/* Thumbnail / canvas preview */}
      <View style={[s.preview, { backgroundColor: board.bgColor }]}>
        {board.thumbnail ? (
          <Image source={{ uri: board.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, s.previewPlaceholder]}>
            {/* Render first few elements as emoji hints */}
            {board.elements.slice(0, 4).map((el, i) => (
              <Text
                key={el.id}
                style={[
                  s.previewEl,
                  { left: (i % 2) * 55 + 20, top: Math.floor(i / 2) * 55 + 20 },
                ]}
              >
                {el.type === 'sticker' ? el.emoji
                  : el.type === 'image' ? '🖼️'
                  : el.type === 'text'  ? '📝'
                  : '▪️'}
              </Text>
            ))}
            {board.elements.length === 0 && (
              <Text style={s.emptyEmoji}>{meta.emoji}</Text>
            )}
          </View>
        )}

        {/* Type badge */}
        <View style={[s.typeBadge, { backgroundColor: meta.color }]}>
          <Text style={s.typeEmoji}>{meta.emoji}</Text>
        </View>

        {/* Public badge */}
        {board.isPublic && (
          <View style={s.publicBadge}>
            <AppText variant="caption" color={Colors.white}>🌍</AppText>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={s.info}>
        <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={1}>
          {board.title}
        </AppText>
        <View style={s.metaRow}>
          <AppText variant="caption" color={Colors.textMuted}>{meta.label}</AppText>
          <AppText variant="caption" color={Colors.textMuted}>·</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {board.elements.length} element{board.elements.length !== 1 ? 's' : ''}
          </AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export { BOARD_TYPE_META };

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.lg,
    overflow:        'hidden',
    ...Shadows.md,
  },
  preview: {
    height:           170,
    overflow:         'hidden',
    backgroundColor:  '#FAFAFA',
    position:         'relative',
  },
  previewPlaceholder: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  previewEl: {
    position: 'absolute',
    fontSize: 26,
  },
  emptyEmoji: { fontSize: 48, opacity: 0.25 },
  typeBadge: {
    position:         'absolute',
    top:              10,
    left:             10,
    width:            28,
    height:           28,
    borderRadius:     8,
    alignItems:       'center',
    justifyContent:   'center',
  },
  typeEmoji:  { fontSize: 14 },
  publicBadge: {
    position:         'absolute',
    top:              10,
    right:            10,
    backgroundColor:  'rgba(0,0,0,0.45)',
    borderRadius:     Radius.full,
    paddingHorizontal: 6,
    paddingVertical:  3,
  },
  info:    { padding: Spacing.sm, gap: 3 },
  metaRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
});
