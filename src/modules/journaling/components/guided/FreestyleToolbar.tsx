// FreestyleToolbar — the old-style icon+label row shown above the Save bar
// on the Freestyle tab: Photo / Video / Theme / Style / Sticker / Bullets /
// Scribble / Hashtags, horizontally scrollable (matches the original
// WriteEntryScreen editor's bottom toolbar look). Each opens its own popup
// (or action) in GuidedEntryScreen.
import React from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing } from '../../../../shared/theme/spacing';

interface IconProps { color: string; size: number; }

const StarIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3.5l2.47 5.01 5.53.8-4 3.9.94 5.5L12 16.2l-4.94 2.6.94-5.5-4-3.9 5.53-.8L12 3.5z"
      stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"
    />
  </Svg>
);

const TextStyleIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 6h9M8.5 6v12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M14 11h6M17 11v7" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const ListIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="4.5" cy="6" r="1.1" fill={color} />
    <Circle cx="4.5" cy="12" r="1.1" fill={color} />
    <Circle cx="4.5" cy="18" r="1.1" fill={color} />
    <Line x1="8.5" y1="6" x2="20" y2="6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1="8.5" y1="12" x2="20" y2="12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1="8.5" y1="18" x2="20" y2="18" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const PencilIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M16.5 3.5l4 4L8 20H4v-4L16.5 3.5z"
      stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"
    />
    <Line x1="14" y1="6" x2="18" y2="10" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const TagIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11.5 4H19a1 1 0 011 1v7.5a1 1 0 01-.3.7l-8 8a1 1 0 01-1.4 0l-7.2-7.2a1 1 0 010-1.4l8-8a1 1 0 01.4-.3z"
      stroke={color} strokeWidth={1.5} strokeLinejoin="round"
    />
    <Circle cx="15.2" cy="8.8" r="1.3" stroke={color} strokeWidth={1.5} />
  </Svg>
);

const GridIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth={1.5} />
    <Line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth={1.5} />
    <Line x1="12" y1="4" x2="12" y2="20" stroke={color} strokeWidth={1.5} />
  </Svg>
);

const PhotoIconSvg = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth={1.5} />
    <Circle cx="9" cy="11" r="2" stroke={color} strokeWidth={1.5} />
    <Path d="M3 17l5.5-5 4 3.5L18 11l3 3" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
  </Svg>
);

const VideoIconSvg = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="6" width="13" height="12" rx="2" stroke={color} strokeWidth={1.5} />
    <Path d="M16 10l5-3v10l-5-3" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
  </Svg>
);

interface Props {
  onSticker:   () => void;
  onTextStyle: () => void;
  onBullets:   () => void;
  onScribble:  () => void;
  onTag:       () => void;
  onTheme:     () => void;
  onPhoto?:    () => void;
  onVideo?:    () => void;
}

export function FreestyleToolbar({
  onSticker, onTextStyle, onBullets, onScribble, onTag, onTheme, onPhoto, onVideo,
}: Props) {
  const { colors } = useTheme();
  const size = 22;
  const color = colors.textSecondary;

  const items: { key: string; icon: React.ReactNode; label: string; onPress?: () => void }[] = [
    { key: 'photo',  icon: <PhotoIconSvg color={color} size={size} />, label: 'Photo',  onPress: onPhoto },
    { key: 'video',  icon: <VideoIconSvg color={color} size={size} />, label: 'Video',  onPress: onVideo },
    { key: 'theme',  icon: <GridIcon color={color} size={size} />,     label: 'Theme',  onPress: onTheme },
    { key: 'style',  icon: <TextStyleIcon color={color} size={size} />, label: 'Style', onPress: onTextStyle },
    { key: 'sticker', icon: <StarIcon color={color} size={size} />,    label: 'Sticker', onPress: onSticker },
    { key: 'bullets', icon: <ListIcon color={color} size={size} />,    label: 'Bullets', onPress: onBullets },
    { key: 'scribble', icon: <PencilIcon color={color} size={size} />, label: 'Scribble', onPress: onScribble },
    { key: 'tag',    icon: <TagIcon color={color} size={size} />,      label: 'Hashtag', onPress: onTag },
  ];

  return (
    <View style={[s.wrap, { borderTopColor: colors.divider }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.inner}>
        {items.filter(it => it.onPress).map(it => (
          <TouchableOpacity key={it.key} style={s.btn} activeOpacity={0.6} onPress={it.onPress}>
            {it.icon}
            <AppText variant="caption" color={colors.textMuted} style={s.lbl}>{it.label}</AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.sm,
  },
  inner: { paddingHorizontal: Spacing.lg, gap: 4, alignItems: 'center' },
  btn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 2, gap: 3 },
  lbl: { fontSize: 9 },
});
