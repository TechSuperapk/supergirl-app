// HighlightedText — renders body text with #hashtags highlighted inline.
// Shared between the Freestyle canvas (editor) and read-only detail view so
// hashtags always look the same wherever an entry's body is shown.
import React from 'react';
import { Text, TextStyle } from 'react-native';

interface Props {
  text:   string;
  color:  string;
  fontSize: number;
  accent: string;
  style?: TextStyle;
}

export function HighlightedText({ text, color, fontSize, accent, style }: Props) {
  if (!text) return null;
  return (
    <Text style={[{ color, fontSize, fontFamily: 'DMSans-Regular', lineHeight: fontSize * 1.65 }, style]}>
      {text.split(/(#\w+)/g).map((p, i) =>
        /^#\w+$/.test(p)
          ? <Text key={i} style={{ color: accent, fontFamily: 'DMSans-Bold', backgroundColor: accent + '20' }}>{p}</Text>
          : <Text key={i}>{p}</Text>
      )}
    </Text>
  );
}
