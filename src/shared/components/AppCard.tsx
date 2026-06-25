import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Radius, Shadows, Spacing } from '../theme/spacing';

interface Props {
  children:  React.ReactNode;
  style?:    ViewStyle;
  padding?:  number;
  shadow?:   keyof typeof Shadows;
  radius?:   number;
}

export function AppCard({
  children,
  style,
  padding = Spacing.base,
  shadow  = 'md',
  radius  = Radius.lg,
}: Props) {
  return (
    <View style={[s.card, { padding, borderRadius: radius }, Shadows[shadow], style]}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
  },
});
