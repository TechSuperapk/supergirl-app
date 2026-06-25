import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { TextStyles, FontFamily } from '../theme/typography';
import { Colors } from '../theme/colors';

type Variant = keyof typeof TextStyles;

interface AppTextProps extends TextProps {
  variant?:  Variant;
  color?:    string;
  align?:    TextStyle['textAlign'];
  children:  React.ReactNode;
}

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
