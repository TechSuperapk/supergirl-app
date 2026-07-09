import React from 'react';
import { Text, TextProps, TextStyle, Platform } from 'react-native';
import { TextStyles, FontFamily } from '../theme/typography';
import { Colors } from '../theme/colors';

type Variant = keyof typeof TextStyles;

interface AppTextProps extends TextProps {
  variant?:  Variant;
  color?:    string;
  align?:    TextStyle['textAlign'];
  children:  React.ReactNode;
}

// Android reserves extra vertical space above/below glyphs by default
// ("font padding") that iOS doesn't — with the same fontSize/lineHeight this
// makes every card, chip, and button using AppText read visibly taller/more
// spaced-out on Android than iOS. Turning it off here (once, for every
// AppText in the app) is what actually lines the two platforms up, rather
// than nudging paddings/margins per screen.
const androidTextFix: TextStyle = Platform.OS === 'android'
  ? { includeFontPadding: false, textAlignVertical: 'center' }
  : {};

export function AppText({
  variant = 'body',
  color,
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  return (
    <Text
      style={[
        TextStyles[variant],
        androidTextFix,
        color ? { color } : undefined,
        align ? { textAlign: align } : undefined,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
