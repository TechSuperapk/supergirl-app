/**
 * stickers.ts — Image sticker registry for the journal.
 * Add new stickers by dropping a PNG into assets/stickers and
 * registering its key + require() below.
 */
import { ImageSourcePropType } from 'react-native';

export interface StickerAsset {
  key: string;
  label: string;
  source: ImageSourcePropType;
}

export const STICKER_ASSETS: StickerAsset[] = [
  { key: 'heart',          label: 'Heart',     source: require('../../../assets/stickers/heart.png') },
  { key: 'heart_blue',     label: 'Heart',     source: require('../../../assets/stickers/heart_blue.png') },
  { key: 'hearteyes',      label: 'Love',      source: require('../../../assets/stickers/hearteyes.png') },
  { key: 'smiley',         label: 'Smile',     source: require('../../../assets/stickers/smiley.png') },
  { key: 'star',           label: 'Star',      source: require('../../../assets/stickers/star.png') },
  { key: 'star_pink',      label: 'Star',      source: require('../../../assets/stickers/star_pink.png') },
  { key: 'sparkle',        label: 'Sparkle',   source: require('../../../assets/stickers/sparkle.png') },
  { key: 'sparkle_purple', label: 'Sparkle',   source: require('../../../assets/stickers/sparkle_purple.png') },
  { key: 'flower',         label: 'Flower',    source: require('../../../assets/stickers/flower.png') },
  { key: 'flower_blue',    label: 'Flower',    source: require('../../../assets/stickers/flower_blue.png') },
  { key: 'leaf',           label: 'Leaf',      source: require('../../../assets/stickers/leaf.png') },
  { key: 'butterfly',      label: 'Butterfly', source: require('../../../assets/stickers/butterfly.png') },
  { key: 'sun',            label: 'Sun',       source: require('../../../assets/stickers/sun.png') },
  { key: 'cloud',          label: 'Cloud',     source: require('../../../assets/stickers/cloud.png') },
  { key: 'rainbow',        label: 'Rainbow',   source: require('../../../assets/stickers/rainbow.png') },
  { key: 'fire',           label: 'Fire',      source: require('../../../assets/stickers/fire.png') },
  { key: 'crown',          label: 'Crown',     source: require('../../../assets/stickers/crown.png') },
  { key: 'coffee',         label: 'Coffee',    source: require('../../../assets/stickers/coffee.png') },
];

const STICKER_MAP: Record<string, StickerAsset> = STICKER_ASSETS.reduce(
  (acc, s) => { acc[s.key] = s; return acc; },
  {} as Record<string, StickerAsset>,
);

export function getStickerSource(key?: string): ImageSourcePropType | null {
  if (!key) return null;
  return STICKER_MAP[key]?.source ?? null;
}
