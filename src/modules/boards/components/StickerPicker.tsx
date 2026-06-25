import React, { useState } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet, ScrollView,
} from 'react-native';
import { AppText }    from '../../../shared/components/AppText';
import { Colors }     from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';

const STICKER_SETS: { label: string; stickers: string[] }[] = [
  {
    label: '✨ Mood',
    stickers: ['😊','😂','🥰','😍','😎','🥳','😢','😤','🤯','😌','🥺','😴','🤩','🫶','💕'],
  },
  {
    label: '🌸 Nature',
    stickers: ['🌸','🌺','🌻','🌹','🌷','🍀','🌿','🍃','🦋','🌈','⭐','🌙','☀️','❄️','🌊'],
  },
  {
    label: '✈️ Travel',
    stickers: ['✈️','🗺️','🏔️','🏖️','🗼','🗽','🏰','⛩️','🌍','🧳','📸','🎒','🛖','🚢','🌅'],
  },
  {
    label: '💪 Goals',
    stickers: ['🏆','🎯','💪','🔥','⚡','🚀','💡','📚','✅','🎓','💰','🏅','🎉','🌟','💎'],
  },
  {
    label: '🎨 Art',
    stickers: ['🎨','🖌️','✏️','📝','🎭','🎬','🎵','🎸','🎹','🎤','🖼️','📷','🎪','🎠','🎡'],
  },
  {
    label: '❤️ Love',
    stickers: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💞','💓','💗','💖','💝','💘'],
  },
];

interface Props {
  onSelect: (emoji: string) => void;
  onClose:  () => void;
}

export function StickerPicker({ onSelect, onClose }: Props) {
  const [activeSet, setActiveSet] = useState(0);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <AppText variant="headingSmall" color={Colors.textPrimary}>Stickers</AppText>
        <TouchableOpacity onPress={onClose}>
          <AppText variant="headingSmall" color={Colors.textMuted}>✕</AppText>
        </TouchableOpacity>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabs}
      >
        {STICKER_SETS.map((set, i) => (
          <TouchableOpacity
            key={i}
            style={[s.tab, activeSet === i && s.tabActive]}
            onPress={() => setActiveSet(i)}
          >
            <AppText
              variant="caption"
              color={activeSet === i ? Colors.boards : Colors.textMuted}
              style={activeSet === i ? { fontFamily: 'DMSans-Bold' } : undefined}
            >
              {set.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sticker grid */}
      <View style={s.grid}>
        {STICKER_SETS[activeSet].stickers.map(emoji => (
          <TouchableOpacity
            key={emoji}
            style={s.stickerBtn}
            onPress={() => { onSelect(emoji); onClose(); }}
            activeOpacity={0.75}
          >
            <Text style={s.stickerEmoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  tabs: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgInput,
  },
  tabActive: { backgroundColor: Colors.boards + '20' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.sm,
    gap: 4,
  },
  stickerBtn: {
    width: '12.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  stickerEmoji: { fontSize: 28 },
});
