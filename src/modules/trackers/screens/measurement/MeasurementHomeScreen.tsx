/**
 * MeasurementHomeScreen — Week/Month/Year/All filter, a banner, last-updated
 * date, current measurements with change-since-the-start-of-the-range
 * indicators, and an Add/Update Measurements CTA.
 */
import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect, Ellipse } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { Period, periodStart } from '../../utils/expenseAnalytics';
import { useMeasurementTracker } from '../../hooks/useTrackers';
import { MEASUREMENT_FIELDS, MeasurementField } from '../../types';

type Props = NativeStackScreenProps<any, 'MeasurementHome'>;

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Week' }, { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' }, { key: 'all', label: 'All' },
];

/**
 * §16 — change is shown in neutral grey, not green.
 *
 * Green reads as approval. Colouring every measurement change with it tells
 * the user their body moving is a success, which is a judgement this tracker
 * has no business making.
 */
const DELTA_COLOR = '#6B7280';

const shortDate = (isoDate: string) =>
  new Date(isoDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const todayISO = () => new Date().toISOString().split('T')[0];
const longDate = (isoDate: string) =>
  new Date(isoDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const clock = (hhmm?: string) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `, ${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'AM' : 'PM'}`;
};

// ── Glyphs ───────────────────────────────────────────────────────────────────

const S = '#141414';

/** One outline glyph per measurement, so rows are scannable without labels. */
function FieldGlyph({ field }: { field: MeasurementField }) {
  const p = { stroke: S, strokeWidth: 1.7, fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (field) {
    case 'weightKg':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} {...p} />
          <Circle cx={12} cy={12} r={4.5} {...p} />
          <Circle cx={12} cy={12} r={1.2} fill={S} />
        </Svg>
      );
    case 'bustCm':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z" {...p} />
        </Svg>
      );
    case 'waistCm':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" {...p} />
        </Svg>
      );
    case 'hipCm':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Circle cx={12} cy={7.5} r={3.5} {...p} />
          <Path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" {...p} />
        </Svg>
      );
    case 'heightCm':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path d="M12 3v18M8.5 6.5 12 3l3.5 3.5M8.5 17.5 12 21l3.5-3.5" {...p} />
        </Svg>
      );
    case 'thighLeftCm':
    case 'thighRightCm':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Ellipse cx={12} cy={12} rx={4.5} ry={9} {...p} />
          <Path d="M7.5 12h9" {...p} />
        </Svg>
      );
    default:
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Ellipse cx={12} cy={12} rx={3.6} ry={8} {...p} />
          <Path d="M8.4 12h7.2" {...p} />
        </Svg>
      );
  }
}

const CalendarGlyph = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={5} width={16} height={15} rx={3} stroke={S} strokeWidth={1.5} />
    <Path d="M4 10h16M8.5 3v4M15.5 3v4" stroke={S} strokeWidth={1.5} strokeLinecap="round" />
    {[8, 12, 16].map(cx => (
      <React.Fragment key={cx}>
        <Circle cx={cx} cy={13.5} r={0.8} fill={S} />
        <Circle cx={cx} cy={16.5} r={0.8} fill={S} />
      </React.Fragment>
    ))}
  </Svg>
);
const ChevronGlyph = () => (
  <Svg width={12} height={12} viewBox="0 0 16 16" fill="none">
    <Path d="M6 3 10.5 8 6 13" stroke={S} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const PencilGlyph = () => (
  <Svg width={13} height={13} viewBox="0 0 16 16" fill="none">
    <Path d="M11 2.2 13.8 5 5.6 13.2 2 14l.8-3.6L11 2.2Z" stroke={S} strokeWidth={1.2} strokeLinejoin="round" />
  </Svg>
);
const DeltaArrow = ({ down }: { down: boolean }) => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d={down ? 'M6 1.5v9M3 7.5 6 10.5l3-3' : 'M6 10.5v-9M3 4.5 6 1.5l3 3'}
      stroke={DELTA_COLOR} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);
/** Scale with a tape measure, sat in the banner. */
const ScaleArt = () => (
  <Svg width={78} height={78} viewBox="0 0 88 88" fill="none">
    <Rect x={12} y={18} width={64} height={52} rx={14} fill="#8EA6C4" />
    <Rect x={17} y={23} width={54} height={42} rx={11} fill="#B7CBE2" />
    <Circle cx={44} cy={42} r={15} fill="#F6FAFF" />
    <Circle cx={44} cy={42} r={15} stroke="#8EA6C4" strokeWidth={2} fill="none" />
    <Path d="M44 42 52 34" stroke="#E2574C" strokeWidth={2.4} strokeLinecap="round" />
    <Circle cx={44} cy={42} r={2.2} fill="#5A6B80" />
    <Path
      d="M8 60c14 8 26 10 40 8s26-8 32-14v12c-8 7-20 12-34 13S18 78 8 70Z"
      fill="#F2B33D"
    />
    <Path d="M14 64c14 7 26 9 39 7s24-7 30-12" stroke="#D99A28" strokeWidth={1.6} fill="none" />
  </Svg>
);

export function MeasurementHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { entries, refreshing, refresh, error, latest } = useMeasurementTracker();
  const [period, setPeriod] = useState<Period>('month');

  const inRange = useMemo(
    () => (period === 'all' ? entries : entries.filter(e => e.date >= periodStart(period))),
    [entries, period],
  );


  /**
   * Baseline for the "vs" column: the oldest entry inside the selected range
   * that recorded this field. That's what makes the Week/Month/Year filter mean
   * something — otherwise every range would compare against the same previous
   * entry and the tabs would be decoration.
   */
  const baselineFor = (field: MeasurementField) => {
    const chrono = [...inRange]
      .filter(e => e[field] != null && e.id !== latest?.id)
      .sort((a, b) => a.date.localeCompare(b.date));
    return chrono[0] ?? null;
  };

  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
        <AppText style={s.backArrow}>←</AppText>
      </TouchableOpacity>
      <AppText style={s.headerTitle}>Measurement</AppText>
      <View style={s.hBtn} />
    </View>
  );

  // ── §22 empty state ────────────────────────────────────────────────────────
  // Nothing invented here. The screen used to fill itself with placeholder
  // measurements — a weight, a waist, and a "−1.6" the user never recorded.
  // Fabricating someone's body measurements, and a loss they didn't have, is
  // considerably worse than an honest empty screen.
  if (entries.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <View style={s.centre}>
          <AppText style={s.centreEmoji}>📏</AppText>
          <AppText style={s.centreTitle}>Start tracking your measurements</AppText>
          <AppText style={s.centreText}>
            Record whichever measurements matter to you. You don't have to fill
            in every one, and you can add more any time.
          </AppText>
          <TouchableOpacity
            style={s.centreCta}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('MeasurementLog', {})}
          >
            <AppText style={s.centreCtaText}>Add first measurement</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render immediately — never gate the dashboard on the network.
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {header}

      <View style={s.filterWrap}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[s.seg, period === p.key && s.segActive]}
            activeOpacity={0.85}
            onPress={() => setPeriod(p.key)}
          >
            <AppText style={[s.segText, period === p.key && s.segTextActive]}>{p.label}</AppText>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.trackers} />}
      >
        <View style={s.banner}>
          <View style={s.bannerText}>
            <AppText style={s.bannerTitle}>Track your body{'\n'}measurements</AppText>
            <AppText style={s.bannerSub}>Stay consistent and see the{'\n'}progress over time.</AppText>
          </View>
          <View style={s.bannerArt}>
            {/* RN has no blur filter, so the glow is a stack of soft circles. */}
            <View style={[s.glow, { width: 84, height: 84, borderRadius: 42, opacity: 0.10 }]} />
            <View style={[s.glow, { width: 64, height: 64, borderRadius: 32, opacity: 0.14 }]} />
            <ScaleArt />
          </View>
        </View>

        {error ? (
          <View style={s.errorBanner}><AppText variant="caption" color={Colors.error}>{error}</AppText></View>
        ) : null}

        <View style={s.updatedRow}>
          <View style={s.updatedLeft}>
            <AppText style={s.updatedLabel}>Last Updated</AppText>
            <View style={s.updatedValueRow}>
              <View style={s.calChip}><CalendarGlyph /></View>
              <AppText style={s.updatedValue}>
                {latest
                  ? `${longDate(latest.date)}${clock(latest.time)}`
                  : `${longDate(todayISO())}, 7:30 AM`}
              </AppText>
            </View>
          </View>
          <TouchableOpacity
            style={s.linkRow}
            hitSlop={8}
            onPress={() => navigation.navigate('MeasurementHistory')}
          >
            <AppText style={s.link}>View History</AppText>
            <ChevronGlyph />
          </TouchableOpacity>
        </View>

        <View style={s.sectionRow}>
          <AppText style={s.sectionTitle}>
            Current Measurements <AppText style={s.sectionUnit}>(cm)</AppText>
          </AppText>
          <TouchableOpacity
            style={s.linkRow}
            hitSlop={8}
            onPress={() => navigation.navigate('MeasurementLog', { id: latest?.id })}
          >
            <PencilGlyph />
            <AppText style={s.link}>Edit</AppText>
          </TouchableOpacity>
        </View>

        <View style={s.list}>
            {MEASUREMENT_FIELDS.map(f => {
              const value = latest?.[f.key];
              // A field the user hasn't recorded is simply absent — never
              // filled in with an invented figure (§22).
              if (value == null) return null;

              const base = baselineFor(f.key);
              const baseValue = base ? (base[f.key] as number) : null;
              const delta = baseValue == null
                ? null
                : Math.round(((value as number) - baseValue) * 10) / 10;
              const sinceDate = base?.date ?? null;

              return (
                <View key={f.key} style={s.measRow}>
                  <View style={s.measIcon}><FieldGlyph field={f.key} /></View>
                  <AppText style={s.measLabel} numberOfLines={1}>{f.label}</AppText>

                  <View style={s.valueCol}>
                    <AppText style={s.value}>{value}</AppText>
                    <AppText style={s.unit}>{f.unit}</AppText>
                  </View>

                  <View style={s.deltaCol}>
                    {delta == null ? (
                      <AppText style={s.deltaNone}>—</AppText>
                    ) : delta === 0 ? (
                      <View style={s.flatDash} />
                    ) : (
                      <View style={s.deltaRow}>
                        <DeltaArrow down={delta < 0} />
                        <AppText style={s.deltaText}>{Math.abs(delta)} {f.unit}</AppText>
                      </View>
                    )}
                    <AppText style={s.deltaSince}>
                      {sinceDate ? `vs ${shortDate(sinceDate)}` : 'first entry'}
                    </AppText>
                  </View>
                </View>
              );
            })}
        </View>

        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate('MeasurementLog')}
          activeOpacity={0.9}
        >
          <AppText style={s.addText}>+ Add / Update Measurements</AppText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const HAIRLINE = 'rgba(153,153,153,0.20)';
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.10,
  shadowRadius: 20,
  elevation: 4,
} as const;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  // ── Period filter ──
  filterWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    marginHorizontal: 20, marginVertical: 10, padding: 5,
    backgroundColor: Colors.white, borderRadius: 30,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  seg: { flex: 1, paddingVertical: 9, borderRadius: 24, alignItems: 'center' },
  segActive: { backgroundColor: '#141414' },
  segText: { fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16, letterSpacing: 0.12, color: '#494453' },
  segTextActive: { color: Colors.white },

  scroll: { paddingHorizontal: 20, gap: 20 },

  // ── Banner ──
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 22, borderRadius: 30, backgroundColor: '#141414', overflow: 'hidden', ...CARD_SHADOW,
  },
  bannerText: { flex: 1, minWidth: 0, gap: 4 },
  bannerTitle: { fontFamily: 'DMSans-Bold', fontSize: 16, lineHeight: 23, color: Colors.white },
  bannerSub: { fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 19, color: '#DEDEDE' },
  bannerArt: { width: 86, height: 86, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  glow: { position: 'absolute', backgroundColor: '#6366F1' },

  // ── Empty state (§22) ──
  centre: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingBottom: 60, gap: 10,
  },
  centreEmoji: { fontSize: 40 },
  centreTitle: {
    fontFamily: 'DMSans-SemiBold', fontSize: 19, color: '#141414',
    textAlign: 'center', marginTop: 4,
  },
  centreText: {
    fontFamily: 'DMSans-Regular', fontSize: 14, lineHeight: 21,
    color: '#6B7280', textAlign: 'center',
  },
  centreCta: {
    marginTop: 10, paddingVertical: 16, paddingHorizontal: 36,
    backgroundColor: '#141414', borderRadius: 9999,
  },
  centreCtaText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: Colors.white },

  errorBanner: { backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12 },

  // ── Last updated ──
  updatedRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  updatedLeft: { flex: 1, minWidth: 0, gap: 6 },
  updatedLabel: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 20, color: '#141414' },
  updatedValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calChip: {
    padding: 6, borderRadius: 6, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  updatedValue: { flex: 1, minWidth: 0, fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16, color: '#141414' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  link: { fontFamily: 'DMSans-SemiBold', fontSize: 12, lineHeight: 16, color: '#141414' },

  // ── Measurements ──
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { fontFamily: 'DMSans-Bold', fontSize: 16, lineHeight: 24, color: '#111827' },
  sectionUnit: { fontFamily: 'DMSans-Bold', fontSize: 16, color: '#6B7280' },

  list: { gap: 14, marginTop: -4 },
  // Fixed icon / value / delta columns so every row aligns on the same x.
  measRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  measIcon: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  measLabel: { flex: 1, minWidth: 0, fontFamily: 'DMSans-Medium', fontSize: 15, lineHeight: 22, color: '#374151' },
  valueCol: { width: 78, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', gap: 3, flexShrink: 0 },
  value: { fontFamily: 'DMSans-Bold', fontSize: 18, lineHeight: 26, color: '#111827' },
  unit: { fontFamily: 'DMSans-SemiBold', fontSize: 13, lineHeight: 20, color: '#111827' },
  deltaCol: { width: 68, alignItems: 'flex-end', flexShrink: 0 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  deltaText: { fontFamily: 'DMSans-Bold', fontSize: 12, lineHeight: 16, color: DELTA_COLOR },
  deltaNone: { fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 16, color: '#9CA3AF' },
  flatDash: { width: 12, height: 1.6, backgroundColor: '#34C759', marginVertical: 7 },
  deltaSince: { fontFamily: 'DMSans-Regular', fontSize: 10, lineHeight: 15, color: '#151515', textAlign: 'right' },

  addBtn: {
    paddingVertical: 20, borderRadius: 999, backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center', ...CARD_SHADOW,
  },
  addText: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 20, color: Colors.white },
});
