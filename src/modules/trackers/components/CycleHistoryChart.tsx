/**
 * CycleHistoryChart — cycle-length trend for the Period Insights screen.
 *
 * Separate from MiniLineChart because this design needs a smoothed curve, a
 * gradient area fill, a fixed labelled y-axis and a callout on the latest
 * point. Bolting those onto MiniLineChart would have made it a
 * grab-bag component for its two very different callers.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';

import { AppText } from '../../../shared/components/AppText';

export interface CyclePoint {
  label: string;
  value: number;
  /** The cycle still running — a floor, not a final length. */
  inProgress?: boolean;
}

interface Props {
  data:    CyclePoint[];
  height?: number;
  width:   number;
}

const AXIS_W = 34;   // room for the "35d" gutter labels
const PAD_T  = 26;   // room for the callout above the highest point
const PAD_B  = 8;

/**
 * Nice y-domain snapped to 5-day steps, always covering the data with a little
 * headroom. Four gridlines, matching the design's 20/25/30/35d.
 */
function domainOf(values: number[]) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  let min = Math.floor(lo / 5) * 5 - 0;
  let max = Math.ceil(hi / 5) * 5;
  if (max - min < 15) max = min + 15;          // keep the axis from collapsing
  return { min, max, ticks: [max, max - 5, max - 10, min] };
}

/**
 * Catmull-Rom through the points, converted to cubic beziers. Straight
 * segments would make a 2-day swing look like a spike; the eased curve matches
 * how the design reads the trend.
 */
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function CycleHistoryChart({ data, height = 200, width }: Props) {
  const values = data.map(d => d.value);
  const { min, max, ticks } = domainOf(values);
  const plotW = width - AXIS_W;
  const plotH = height - PAD_T - PAD_B;
  const range = max - min || 1;

  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;
  const pts = data.map((d, i) => ({
    ...d,
    x: AXIS_W + (data.length > 1 ? i * stepX : plotW / 2),
    y: PAD_T + (1 - (d.value - min) / range) * plotH,
  }));

  const last = pts[pts.length - 1];
  const lastIsProvisional = !!last?.inProgress;

  // The provisional point is split off so the run-in to it can be dashed:
  // a solid line would imply the current cycle has finished at that length.
  const solidPts = lastIsProvisional ? pts.slice(0, -1) : pts;
  const line = smoothPath(solidPts);
  const tail = lastIsProvisional && solidPts.length
    ? `M ${solidPts[solidPts.length - 1].x} ${solidPts[solidPts.length - 1].y} L ${last.x} ${last.y}`
    : '';
  // Fill only under confirmed data, for the same reason.
  const area = line
    ? `${line} L ${solidPts[solidPts.length - 1].x} ${PAD_T + plotH} L ${solidPts[0].x} ${PAD_T + plotH} Z`
    : '';

  return (
    <View style={{ width, height: height + 22 }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="cycleFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FF85A2" stopOpacity={0.28} />
            <Stop offset="1" stopColor="#FF85A2" stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {ticks.map((t, i) => {
          const y = PAD_T + (1 - (t - min) / range) * plotH;
          return (
            <Line
              key={i}
              x1={AXIS_W} y1={y} x2={width} y2={y}
              stroke="#F3F4F6" strokeWidth={1}
            />
          );
        })}

        {area ? <Path d={area} fill="url(#cycleFill)" /> : null}
        {line ? (
          <Path d={line} fill="none" stroke="#333333" strokeWidth={2.1} strokeLinecap="round" />
        ) : null}
        {tail ? (
          <Path
            d={tail} fill="none" stroke="#9CA3AF" strokeWidth={2}
            strokeDasharray="4 4" strokeLinecap="round"
          />
        ) : null}

        {pts.map((p, i) => {
          const isLast = i === pts.length - 1;
          // Provisional point stays hollow and grey; a filled red dot would
          // read the same as a finished cycle.
          if (isLast && lastIsProvisional) {
            return (
              <Circle
                key={i} cx={p.x} cy={p.y} r={5.5}
                fill="#FFFFFF" stroke="#9CA3AF" strokeWidth={2.1}
              />
            );
          }
          return (
            <Circle
              key={i}
              cx={p.x} cy={p.y} r={isLast ? 5.5 : 4.5}
              fill={isLast ? '#EF4444' : '#FFFFFF'}
              stroke="#EF4444" strokeWidth={2.1}
            />
          );
        })}
      </Svg>

      {/* Axis labels and the callout sit in RN text rather than <Text> in SVG
          so they pick up the app font without extra font registration. */}
      {ticks.map((t, i) => {
        const y = PAD_T + (1 - (t - min) / range) * plotH;
        return (
          <AppText key={i} style={[s.axisLabel, { top: y - 7 }]}>{t}d</AppText>
        );
      })}

      {last ? (
        <View
          style={[
            s.callout,
            lastIsProvisional && s.calloutProvisional,
            {
              left: Math.max(0, Math.min(last.x - (lastIsProvisional ? 30 : 17), width - (lastIsProvisional ? 66 : 40))),
              top: Math.max(0, last.y - 30),
            },
          ]}
        >
          {/* "so far" matters: without it a 12-day current cycle reads as a
              12-day cycle, which would look alarming. */}
          <AppText style={s.calloutText}>
            {last.value}d{lastIsProvisional ? ' so far' : ''}
          </AppText>
        </View>
      ) : null}

      <View style={[s.labelRow, { width: plotW, left: AXIS_W }]}>
        {pts.map((p, i) => (
          <AppText
            key={i}
            style={[
              s.xLabel,
              { left: p.x - AXIS_W - 20 },
              i === pts.length - 1 && s.xLabelActive,
            ]}
            numberOfLines={1}
          >
            {p.label}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  axisLabel: {
    position: 'absolute', left: 0, width: AXIS_W - 4,
    fontFamily: 'DMSans-Regular', fontSize: 10, color: '#9CA3AF',
  },
  callout: {
    position: 'absolute', paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: '#1E293B', borderRadius: 8,
  },
  calloutProvisional: { backgroundColor: '#6B7280' },
  calloutText: { fontFamily: 'DMSans-Regular', fontSize: 10, color: '#FFFFFF' },
  labelRow: { position: 'absolute', bottom: 0, height: 18 },
  xLabel: {
    position: 'absolute', width: 40, textAlign: 'center',
    fontFamily: 'DMSans-Regular', fontSize: 12, color: '#6B7280',
  },
  xLabelActive: { color: '#1F2937', fontFamily: 'DMSans-Bold' },
});
