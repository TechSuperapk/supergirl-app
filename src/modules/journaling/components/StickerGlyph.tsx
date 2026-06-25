/**
 * StickerGlyph — renders a sticker's visual (image or legacy emoji).
 * Shared by the editor and the preview so they match exactly.
 */
import React from 'react';
import { Image, Text } from 'react-native';
import { StickerPlacement, STICKER_BASE } from '../types';
import { getStickerSource } from '../stickers';

export function StickerGlyph({ sp }: { sp: StickerPlacement }) {
  const size = STICKER_BASE;
  const src = getStickerSource(sp.asset);
  if (src) {
    return <Image source={src} style={{ width: size, height: size }} resizeMode="contain" />;
  }
  return <Text style={{ fontSize: size * 0.86 }}>{sp.emoji ?? '⭐'}</Text>;
}
