import React from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { Colors } from '../theme/colors';
import { FontFamily } from '../theme/typography';

interface Props {
  uri?:    string;
  name?:   string;
  size?:   number;
  color?:  string;
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

const BG_PALETTE = [
  '#7B1FA2', '#1565C0', '#2E7D32', '#BF360C',
  '#00838F', '#558B2F', '#4527A0', '#AD1457',
];

function avatarBg(name?: string) {
  if (!name) return BG_PALETTE[0];
  const code = name.charCodeAt(0) + (name.charCodeAt(1) ?? 0);
  return BG_PALETTE[code % BG_PALETTE.length];
}

export function AppAvatar({ uri, name, size = 44, color }: Props) {
  const bg     = color ?? avatarBg(name);
  const radius = size / 2;
  const fontSize = size * 0.38;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }

  return (
    <View
      style={[
        s.circle,
        { width: size, height: size, borderRadius: radius, backgroundColor: bg },
      ]}
    >
      <Text style={[s.text, { fontSize, fontFamily: FontFamily.bold }]}>
        {name ? initials(name) : '👤'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text:   { color: Colors.white },
});
