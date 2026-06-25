import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { FontFamily } from '../theme/typography';

interface Props {
  count:  number;
  color?: string;
}

export function AppBadge({ count, color = Colors.error }: Props) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);

  return (
    <View style={[s.badge, { backgroundColor: color }]}>
      <Text style={s.text}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    minWidth:       16,
    height:         16,
    borderRadius:   8,
    paddingHorizontal: 3,
    alignItems:     'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: FontFamily.bold,
    fontSize:   9,
    color:      Colors.white,
    lineHeight: 13,
  },
});
