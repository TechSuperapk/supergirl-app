import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { AppText } from './AppText';
import { Colors } from '../theme/colors';
import { Spacing, Radius, Shadows } from '../theme/spacing';

type Variant = 'primary' | 'secondary' | 'ghost' | 'premium' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface Props {
  label:       string;
  onPress:     () => void;
  variant?:    Variant;
  size?:       Size;
  loading?:    boolean;
  disabled?:   boolean;
  fullWidth?:  boolean;
  leftIcon?:   React.ReactNode;
  rightIcon?:  React.ReactNode;
  style?:      ViewStyle;
}

const BG: Record<Variant, string> = {
  primary:   Colors.primary,
  secondary: Colors.primaryLight,
  ghost:     Colors.transparent,
  premium:   Colors.premium,
  danger:    Colors.error,
};

const TEXT_COLOR: Record<Variant, string> = {
  primary:   Colors.white,
  secondary: Colors.primary,
  ghost:     Colors.primary,
  premium:   Colors.white,
  danger:    Colors.white,
};

const SHADOW: Record<Variant, object> = {
  primary:   Shadows.primary,
  secondary: Shadows.sm,
  ghost:     {},
  premium:   Shadows.premium,
  danger:    Shadows.md,
};

const PAD: Record<Size, { paddingVertical: number; paddingHorizontal: number }> = {
  sm: { paddingVertical: 9,  paddingHorizontal: 18 },
  md: { paddingVertical: 14, paddingHorizontal: 28 },
  lg: { paddingVertical: 17, paddingHorizontal: 36 },
};

const FONT_SIZE: Record<Size, number> = { sm: 13, md: 15, lg: 17 };

export function AppButton({
  label,
  onPress,
  variant    = 'primary',
  size       = 'md',
  loading    = false,
  disabled   = false,
  fullWidth  = false,
  leftIcon,
  rightIcon,
  style,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={[
        s.base,
        PAD[size],
        { backgroundColor: BG[variant] },
        SHADOW[variant],
        fullWidth && s.full,
        isDisabled && s.disabled,
        variant === 'ghost' && s.ghostBorder,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={TEXT_COLOR[variant]} size="small" />
      ) : (
        <>
          {leftIcon}
          <AppText
            variant="button"
            color={isDisabled ? Colors.textMuted : TEXT_COLOR[variant]}
            style={{ fontSize: FONT_SIZE[size] }}
          >
            {label}
          </AppText>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  base: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    borderRadius:   Radius.md,
    alignSelf:      'flex-start',
  },
  full:        { alignSelf: 'stretch' },
  disabled:    { opacity: 0.45 },
  ghostBorder: { borderWidth: 1.5, borderColor: Colors.primary },
});
