// ─────────────────────────────────────────────
// SuperGirl — Design Token: Spacing
// ─────────────────────────────────────────────
export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 56,
} as const;

export const Radius = {
  xs:   6,
  sm:   10,
  md:   14,
  lg:   18,
  xl:   24,
  '2xl': 32,
  full: 9999,
} as const;

// ─────────────────────────────────────────────
// SuperGirl — Design Token: Shadows
// ─────────────────────────────────────────────
import { Platform } from 'react-native';

const makeShadow = (
  color: string,
  offset: { width: number; height: number },
  opacity: number,
  radius: number,
  elevation: number,
) => ({
  shadowColor:   color,
  shadowOffset:  offset,
  shadowOpacity: opacity,
  shadowRadius:  radius,
  elevation,
});

export const Shadows = {
  sm:  makeShadow('#000', { width: 0, height: 1 }, 0.04, 4,  2),
  md:  makeShadow('#000', { width: 0, height: 2 }, 0.07, 8,  4),
  lg:  makeShadow('#000', { width: 0, height: 4 }, 0.10, 16, 8),
  xl:  makeShadow('#000', { width: 0, height: 8 }, 0.14, 24, 12),

  // coloured shadow for primary button
  primary: makeShadow('#2979FF', { width: 0, height: 8 }, 0.40, 14, 10),

  // coloured shadow for premium button
  premium: makeShadow('#F9A825', { width: 0, height: 6 }, 0.35, 12, 8),
} as const;
