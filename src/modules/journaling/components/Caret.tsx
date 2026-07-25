// Caret — the dropdown chevron used by every "tap to change" control in
// Journal (journal type, date pill, month/week strips, quick-card selects).
//
// Rendered inside a fixed, centred box rather than as a bare "⌄" text node:
// the glyph sits high on the font's baseline, so inline it never lines up with
// the label next to it. Boxing it and centring the glyph means the parent row's
// alignItems:'center' centres the caret against the text line every time.
import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface Props {
  /** Glyph size — pair it with the adjacent text size (e.g. 20 for a heading). */
  size?:  number;
  color:  string;
  /** Optional spacing, e.g. { marginLeft: 4 }. */
  style?: StyleProp<ViewStyle>;
}

export function Caret({ size = 16, color, style }: Props) {
  const box = Math.round(size * 1.15);
  return (
    <View style={[s.box, { width: box, height: box }, style]}>
      <Text style={[s.glyph, { fontSize: size, lineHeight: box, color }]}>⌄</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box:   { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  glyph: { textAlign: 'center', includeFontPadding: false },
});
