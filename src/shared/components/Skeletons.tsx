/**
 * LazyScreen.tsx + Skeletons
 *
 * LazyScreen: wraps a screen in Suspense with a loading skeleton.
 * Skeletons: animated placeholder components for feed/card/list loading states.
 */
import React, { Suspense } from 'react';
import {
  View, StyleSheet, Animated, Easing,
  useAnimatedValue,
} from 'react-native';
import { useTheme }  from '../hooks/useTheme';
import { Spacing, Radius } from '../theme/spacing';

// ── Shimmer hook ──────────────────────────────────────────────────────────────
function useShimmer() {
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]),
    ).start();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });
  return opacity;
}

// ── Skeleton box ──────────────────────────────────────────────────────────────
interface SkeletonBoxProps {
  width?:   number | string;
  height?:  number;
  radius?:  number;
  style?:   any;
}

export function SkeletonBox({ width = '100%', height = 16, radius = 8, style }: SkeletonBoxProps) {
  const { colors } = useTheme();
  const opacity    = useShimmer();

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius:    radius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ── Post card skeleton ────────────────────────────────────────────────────────
export function PostCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[sk.card, { backgroundColor: colors.bgCard }]}>
      <View style={sk.header}>
        <SkeletonBox width={44} height={44} radius={22} />
        <View style={sk.headerText}>
          <SkeletonBox width={120} height={14} />
          <SkeletonBox width={80}  height={11} style={{ marginTop: 6 }} />
        </View>
      </View>
      <SkeletonBox height={14} style={{ marginHorizontal: 16, marginTop: 8 }} />
      <SkeletonBox height={14} width="70%" style={{ marginHorizontal: 16, marginTop: 6 }} />
      <SkeletonBox height={180} radius={0} style={{ marginTop: 12 }} />
      <View style={sk.actions}>
        <SkeletonBox width={60} height={28} radius={14} />
        <SkeletonBox width={60} height={28} radius={14} />
        <SkeletonBox width={40} height={28} radius={14} />
      </View>
    </View>
  );
}

// ── Feed skeleton ─────────────────────────────────────────────────────────────
export function FeedSkeleton() {
  return (
    <View>
      {[1, 2, 3].map(i => <PostCardSkeleton key={i} />)}
    </View>
  );
}

// ── Card skeleton (generic) ───────────────────────────────────────────────────
export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[sk.card, { backgroundColor: colors.bgCard, borderRadius: Radius.lg, margin: Spacing.base }]}>
      <SkeletonBox height={140} radius={Radius.lg - 2} />
      <View style={sk.cardBody}>
        <SkeletonBox height={16} width="80%" />
        {lines > 1 && <SkeletonBox height={12} width="50%" style={{ marginTop: 8 }} />}
      </View>
    </View>
  );
}

// ── Grid skeleton ─────────────────────────────────────────────────────────────
export function GridSkeleton({ cols = 2, rows = 3 }: { cols?: number; rows?: number }) {
  return (
    <View style={[sk.grid, { padding: Spacing.base }]}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <View key={i} style={{ width: `${98 / cols}%` }}>
          <CardSkeleton lines={1} />
        </View>
      ))}
    </View>
  );
}

// ── LazyScreen wrapper ────────────────────────────────────────────────────────
export function LazyScreen({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <Suspense fallback={fallback ?? <FeedSkeleton />}>
      {children}
    </Suspense>
  );
}

const sk = StyleSheet.create({
  card:     { paddingBottom: Spacing.sm, marginBottom: 8 },
  header:   { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.base },
  headerText: { flex: 1, justifyContent: 'center' },
  actions:  { flexDirection: 'row', gap: Spacing.md, padding: Spacing.base },
  cardBody: { padding: Spacing.sm, gap: 6 },
  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
});
