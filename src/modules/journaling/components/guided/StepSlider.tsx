// StepSlider — a 1..max slider (no external dep) driven by PanResponder.
import React, { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet, LayoutChangeEvent } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  leftLabel?: string;
  rightLabel?: string;
  /** Show every step number under the track (1,2,3…max) instead of just the
   *  min/current/max labels — matches the Vent "How intense is this feeling"
   *  slider in the reference design. */
  showScale?: boolean;
}

export function StepSlider({ value, onChange, min = 1, max = 10, leftLabel, rightLabel, showScale }: Props) {
  const { colors } = useTheme();
  const [, setW] = useState(0);
  const wRef = useRef(0);

  const compute = (x: number) => {
    const width = wRef.current || 1;
    const ratio = Math.max(0, Math.min(1, x / width));
    return Math.round(min + ratio * (max - min));
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => onChange(compute(e.nativeEvent.locationX)),
    onPanResponderMove:  (e) => onChange(compute(e.nativeEvent.locationX)),
  })).current;

  const onLayout = (e: LayoutChangeEvent) => { wRef.current = e.nativeEvent.layout.width; setW(e.nativeEvent.layout.width); };
  const pct = (value - min) / (max - min);

  return (
    <View>
      <View style={s.track} onLayout={onLayout} {...pan.panHandlers}>
        <View style={[s.bg, { backgroundColor: colors.divider }]} />
        <View style={[s.fill, { backgroundColor: colors.textPrimary, width: `${pct * 100}%` }]} />
        <View style={[s.thumb, { backgroundColor: colors.textPrimary, left: `${pct * 100}%` }]} />
      </View>
      {showScale ? (
        <View style={s.scaleRow}>
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(n => (
            <AppText
              key={n}
              variant={n === value ? 'label' : 'caption'}
              color={n === value ? colors.textPrimary : colors.textMuted}
            >
              {n}
            </AppText>
          ))}
        </View>
      ) : (
        <View style={s.labels}>
          <AppText variant="caption" color={colors.textMuted}>{leftLabel ?? String(min)}</AppText>
          <AppText variant="label" color={colors.textPrimary}>{value}</AppText>
          <AppText variant="caption" color={colors.textMuted}>{rightLabel ?? String(max)}</AppText>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  track: { height: 36, justifyContent: 'center' },
  bg: { height: 4, borderRadius: 2 },
  fill: { position: 'absolute', height: 4, borderRadius: 2 },
  thumb: { position: 'absolute', width: 22, height: 22, borderRadius: 11, marginLeft: -11 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
});
