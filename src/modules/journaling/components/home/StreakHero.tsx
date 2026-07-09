// ─────────────────────────────────────────────────────────────────────────────
// StreakHero — the dark "Today is a Great Day" banner.
//   • gradient background via react-native-svg (no expo-linear-gradient dep)
//   • fire streak counter
//   • multi-colour ring showing the total entry count
//   • journal-type chips with accent dots (+ optional per-type percentages)
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { AppText } from '../../../../shared/components/AppText';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';
import type { JournalTypeDef } from './journalTypes';

interface Props {
  eyebrow?:   string;
  title?:     string;
  streak:     number;
  entryCount: number;
  chips:      JournalTypeDef[];
  /** Per-type percentage breakdown; when present, chips show "Short pct%". */
  breakdown?: { key: string; short: string; dot: string; pct: number }[];
  quote?: string;
}

const RING_SIZE = 56;
const RING_STROKE = 5;
const RING_COLORS = ['#FF6B6B', '#FFB74D', '#FFD54F', '#4FC3F7', '#7E57C2', '#26A69A'];

function EntriesRing({ count }: { count: number }) {
  const r  = (RING_SIZE - RING_STROKE) / 2;
  const cx = RING_SIZE / 2;
  const cy = RING_SIZE / 2;
  const c  = 2 * Math.PI * r;
  const seg = c / RING_COLORS.length;
  const gap = 3;

  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE }}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {RING_COLORS.map((color, i) => (
          <Circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            stroke={color}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${seg - gap} ${c - seg + gap}`}
            transform={`rotate(${(i * 360) / RING_COLORS.length - 90} ${cx} ${cy})`}
          />
        ))}
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        {/* AppText (not raw Text) so the Android extra-glyph-padding fix
            applies here too — without it these two lines sit visibly off
            centre inside the ring on Android even though they're centred
            fine on iOS. */}
        <AppText style={styles.ringNum}>{count}</AppText>
        <AppText style={styles.ringLbl}>Entries</AppText>
      </View>
    </View>
  );
}

export function StreakHero({ eyebrow = 'Today is a', title = 'Great Day', streak, entryCount, chips, breakdown, quote }: Props) {
  const items = breakdown ?? chips.map(c => ({ key: c.key, short: c.short, dot: c.dot, pct: undefined as number | undefined }));

  return (
    // Shadow lives on this outer wrapper (no overflow:'hidden' here) — the
    // inner card below clips the glow/gradient to its rounded corners, and
    // overflow:'hidden' on the SAME view as a shadow suppresses it on iOS.
    // Splitting the two views keeps the drop shadow visible on both platforms.
    <View style={styles.cardShadowWrap}>
    <View style={styles.card}>
      {/* Soft purple ambient glow, top-left — a wide, very gradual radial
          fade (no filters, no visible disc edge) so it reads as a diffuse
          blush of light rather than a circle shape. */}
      <View style={styles.glowWrap} pointerEvents="none">
        <Svg width={320} height={320}>
          <Defs>
            <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"  stopColor="#5D4BFF" stopOpacity={0.9} />
              <Stop offset="25%" stopColor="#5D4BFF" stopOpacity={0.8} />
              <Stop offset="50%" stopColor="#5D4BFF" stopOpacity={0.45} />
              <Stop offset="75%" stopColor="#5D4BFF" stopOpacity={0.08} />
              <Stop offset="100%" stopColor="#5D4BFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={160} cy={160} r={160} fill="url(#glowGrad)" />
        </Svg>
      </View>

      {quote ? (
        <AppText variant="bodySmall" color="rgba(255,255,255,0.9)" style={styles.quote}>“{quote}”</AppText>
      ) : null}

      {/* Title / Streak / Ring — three independent-width items in a single
          space-between row (not one flex:1 item + something absolutely
          positioned on top of it), matching the reference design exactly.
          Each item only ever takes its own content width, so there is no
          way for the title and the streak to collide, on any device. */}
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <AppText variant="label" color="rgba(255,255,255,0.75)" style={styles.eyebrow}>{eyebrow}</AppText>
          <AppText variant="headingLarge" color="#FFFFFF" style={styles.title} numberOfLines={2}>{title}</AppText>
        </View>

        <View style={styles.streakBox}>
          <View style={styles.streakNumRow}>
            <Image source={require('../../assets/Fire.gif')} style={styles.fireImage} contentFit="contain" autoplay />
            <AppText variant="headingMedium" color="#FFFFFF" align="center" style={styles.streakNum}>{streak}</AppText>
          </View>
          <AppText variant="caption" color="rgba(255,255,255,0.75)" align="center" style={styles.streakLabel}>Day Streak</AppText>
        </View>

        <EntriesRing count={entryCount} />
      </View>

      <View style={styles.chips}>
        {items.map(t => (
          <View key={t.key} style={styles.chip}>
            <View style={[styles.dot, { backgroundColor: t.dot }]} />
            <AppText
              variant="caption"
              color="#FFFFFF"
              style={styles.chipText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.9}
            >
              {t.short}
            </AppText>
          </View>
        ))}
      </View>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadowWrap: {
    marginHorizontal: Spacing.md,
    borderRadius: 30,
    backgroundColor: '#141414',
  },
  // Android-only: a touch shorter/tighter than iOS — iOS is already tuned
  // right, this just trims the banner down a bit on Android specifically.
  card: {
    borderRadius: 30,
    overflow: 'hidden',
    paddingTop: Platform.OS === 'android' ? Spacing.sm : Spacing.base,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'android' ? Spacing.xs : Spacing.sm,
    minHeight: Platform.OS === 'android' ? 128 : 148,
    backgroundColor: '#141414',
    position: 'relative',
  },
  glowWrap: { position: 'absolute', width: 320, height: 320, left: -48.5, top: -189.5 },
  quote: { marginBottom: Spacing.sm },
  // Three independent-width items spaced across the full row — title stays
  // left, streak sits wherever the remaining space centres it, ring stays
  // right. None of them can ever grow into another's space, so there's
  // nothing to overlap regardless of device width or platform font metrics.
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  titleBlock: { justifyContent: 'center', gap: 2 },
  eyebrow: Platform.OS === 'android' ? { fontSize: 12, lineHeight: 15 } : { lineHeight: 17 },
  title: Platform.OS === 'android'
    ? { marginTop: 0, fontSize: 21, lineHeight: 23 }
    : { marginTop: 0, lineHeight: 26 },
  streakBox: { alignItems: 'center', gap: 2 },
  streakNumRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fireImage: Platform.OS === 'android' ? { width: 26, height: 26 } : { width: 30, height: 30 },
  streakNum: Platform.OS === 'android' ? { fontSize: 21, lineHeight: 25 } : { fontSize: 24, lineHeight: 28 },
  streakLabel: Platform.OS === 'android' ? { fontSize: 12, lineHeight: 16 } : { fontSize: 14, lineHeight: 18 },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringNum: { fontFamily: 'DMSans-Bold', fontSize: 16, color: '#FFFFFF', lineHeight: 18 },
  ringLbl: { fontFamily: 'DMSans-Regular', fontSize: 8, color: 'rgba(255,255,255,0.75)' },
  chips: { flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'space-between', gap: 4, marginTop: 'auto', paddingTop: Spacing.xs },
  chip: {
    ...Shadows.sm,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  chipText: { fontSize: 9, lineHeight: 12 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
