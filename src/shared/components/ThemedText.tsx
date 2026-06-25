/**
 * ThemedText.tsx
 *
 * Drop-in replacement for AppText that automatically uses the current
 * theme's text colors. If you're migrating incrementally you can import
 * this as AppText from a local alias.
 */
import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { TextStyles }                 from '../theme/typography';
import { useTheme }                   from '../hooks/useTheme';

type Variant = keyof typeof TextStyles;

interface ThemedTextProps extends TextProps {
  variant?: Variant;
  color?:   string;
  align?:   TextStyle['textAlign'];
  children: React.ReactNode;
}

export function ThemedText({
  variant = 'body',
  color,
  align,
  style,
  children,
  ...rest
}: ThemedTextProps) {
  const { colors } = useTheme();

  return (
    <Text
      style={[
        TextStyles[variant],
        { color: color ?? colors.textPrimary },
        align ? { textAlign: align } : undefined,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
