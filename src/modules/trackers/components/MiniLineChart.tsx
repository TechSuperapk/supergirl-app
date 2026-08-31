/**
 * MiniLineChart — dependency-free (beyond react-native-svg, already a dep)
 * line+dot trend chart used by the Measurement tracker's history graph.
 * Renders inside a horizontal ScrollView by the caller when there are many
 * points; width grows with the dataset so points don't crowd together.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { AppText } from '../../../shared/components/AppText';
import { Colors } from '../../../shared/theme/colors';

export interface LinePoint { label: string; value: number; }

interface Props {
  data:        LinePoint[];
  height?:     number;
  color?:      string;
  minPointGap?: number;
  showValues?: boolean;
}

export function MiniLineChart({
  data, height = 160, color = Colors.primary, minPointGap = 56, showValues = true,
}: Props) {
  if (!data.length) {
    return (
      <View style={[s.empty, { height }]}>
        <AppText variant="caption" color={Colors.textMuted}>Not enough data yet</AppText>
      </View>
    );
  }

  const padX = 20;
  const padTop = showValues ? 26 : 10;
  const padBottom = 10;
  const width = Math.max(260, padX * 2 + (data.length - 1) * minPointGap);
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chartH = height - padTop - padBottom;
  const stepX = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    ...d,
    x: padX + i * stepX,
    y: padTop + (1 - (d.value - min) / range) * chartH,
  }));
  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <View>
      <Svg width={width} height={height}>
        <Polyline points={polyline} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={color} />
        ))}
      </Svg>

      {showValues && (
        <View style={[s.overlayRow, { width }]}>
          {points.map((p, i) => (
            <View key={i} style={[s.valueTag, { left: p.x - 18, top: p.y - 24 }]}>
              <AppText variant="caption" color={Colors.textPrimary} style={{ fontFamily: 'DMSans-Bold' }}>
                {p.value}
              </AppText>
            </View>
          ))}
        </View>
      )}

      <View style={[s.labelRow, { width }]}>
        {points.map((p, i) => (
          <View key={i} style={{ position: 'absolute', left: p.x - 20, width: 40, alignItems: 'center' }}>
            <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>{p.label}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  empty:     { alignItems: 'center', justifyContent: 'center' },
  overlayRow: { position: 'absolute', top: 0, height: '100%' },
  valueTag:  { position: 'absolute', alignItems: 'center', width: 36 },
  labelRow:  { height: 18, marginTop: 2 },
});
