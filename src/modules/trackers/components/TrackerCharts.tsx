import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { AppText } from '../../../shared/components/AppText';
import { Colors }  from '../../../shared/theme/colors';
import { Spacing } from '../../../shared/theme/spacing';

interface BarData {
  label:  string;
  value:  number;
  color?: string;
}

interface Props {
  data:       BarData[];
  maxValue?:  number;
  unit?:      string;
  color?:     string;
  height?:    number;
}

const { width: SCREEN_W } = Dimensions.get('window');

export function WeeklyBarChart({
  data,
  maxValue,
  unit  = '',
  color = Colors.primary,
  height = 160,
}: Props) {
  if (!data.length) return null;

  const max = maxValue ?? Math.max(...data.map(d => d.value), 1);

  return (
    <View style={[s.wrap, { height: height + 48 }]}>
      {/* Y-axis hint */}
      <View style={s.yAxis}>
        <AppText variant="caption" color={Colors.textMuted}>{max}{unit}</AppText>
        <AppText variant="caption" color={Colors.textMuted}>0</AppText>
      </View>

      {/* Bars */}
      <View style={s.barsRow}>
        {data.map((item, i) => {
          const barH = max > 0 ? Math.max((item.value / max) * height, item.value > 0 ? 4 : 0) : 0;
          const c    = item.color ?? color;
          return (
            <View key={i} style={[s.barCol, { height: height + 32 }]}>
              <AppText variant="caption" color={Colors.textMuted} style={s.valueLabel}>
                {item.value > 0 ? `${item.value}${unit}` : ''}
              </AppText>
              <View style={s.barTrack}>
                <View
                  style={[
                    s.bar,
                    {
                      height:          barH,
                      backgroundColor: c,
                      opacity:         item.value > 0 ? 1 : 0.18,
                    },
                  ]}
                />
              </View>
              <AppText variant="caption" color={Colors.textMuted} style={s.dayLabel}>
                {item.label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── ProgressRing ──────────────────────────────────────────────────────────────
interface RingProps {
  progress:  number;   // 0 – 1
  size?:     number;
  stroke?:   number;
  color?:    string;
  label?:    string;
  sublabel?: string;
}

export function ProgressRing({
  progress,
  size   = 90,
  stroke = 9,
  color  = Colors.primary,
  label,
  sublabel,
}: RingProps) {
  const r          = (size - stroke) / 2;
  const circ       = 2 * Math.PI * r;
  const filled     = circ * Math.min(progress, 1);
  const dashOffset = circ - filled;

  // Pure SVG ring — we render as nested Views approximation
  // For accurate SVG, use react-native-svg (expo install react-native-svg)
  const pct = Math.round(progress * 100);

  return (
    <View style={[ring.wrap, { width: size, height: size }]}>
      {/* Background ring */}
      <View style={[ring.track, {
        width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke, borderColor: color + '20',
      }]} />
      {/* Filled ring overlay — approximate with a gradient border */}
      <View style={[ring.fill, {
        width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke,
        borderColor: color,
        borderTopColor: progress < 0.25 ? color + '20' : color,
        borderRightColor: progress < 0.5 ? color + '20' : color,
        borderBottomColor: progress < 0.75 ? color + '20' : color,
        transform: [{ rotate: '-90deg' }],
      }]} />
      {/* Centre label */}
      <View style={ring.centre}>
        {label    && <AppText variant="headingSmall" color={Colors.textPrimary}>{label}</AppText>}
        {sublabel && <AppText variant="caption" color={Colors.textMuted}>{sublabel}</AppText>}
      </View>
    </View>
  );
}

const ring = StyleSheet.create({
  wrap:    { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  track:   { position: 'absolute' },
  fill:    { position: 'absolute' },
  centre:  { alignItems: 'center', gap: 1 },
});

// ── MilestoneBadge ────────────────────────────────────────────────────────────
interface BadgeProps {
  emoji:    string;
  title:    string;
  desc:     string;
  earnedAt: string;
  locked?:  boolean;
}

export function MilestoneBadge({ emoji, title, desc, earnedAt, locked = false }: BadgeProps) {
  return (
    <View style={[badge.card, locked && badge.locked]}>
      <AppText style={[badge.emoji, locked && badge.lockedEmoji]}>{locked ? '🔒' : emoji}</AppText>
      <AppText variant="label" color={locked ? Colors.textMuted : Colors.textPrimary} align="center" numberOfLines={1}>
        {title}
      </AppText>
      {!locked && (
        <AppText variant="caption" color={Colors.textMuted} align="center" numberOfLines={2}>
          {desc}
        </AppText>
      )}
    </View>
  );
}

const badge = StyleSheet.create({
  card: {
    width: 100, alignItems: 'center', gap: 4,
    backgroundColor: Colors.bgCard,
    borderRadius: 16, padding: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  locked:      { opacity: 0.45 },
  emoji:       { fontSize: 32 },
  lockedEmoji: { fontSize: 28 },
});

const s = StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'flex-end' },
  yAxis: {
    justifyContent: 'space-between',
    paddingBottom:  28,
    paddingRight:   4,
    height:         '100%',
  },
  barsRow:    { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barCol:     { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barTrack:   { width: '100%', justifyContent: 'flex-end', flex: 1 },
  bar: {
    width:        '80%',
    alignSelf:    'center',
    borderRadius: 6,
    minHeight:    2,
  },
  valueLabel: { fontSize: 9, marginBottom: 2 },
  dayLabel:   { marginTop: 4 },
});
