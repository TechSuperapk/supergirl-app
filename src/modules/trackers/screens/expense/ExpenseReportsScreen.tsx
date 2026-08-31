/**
 * ExpenseReportsScreen — analytics. Tabs: All / Spending / Income, a period
 * filter and a steppable range. Category donut with legend, daily trend chart,
 * average daily spend and change vs the previous period.
 */
import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, {
  Circle, Path, Line, Defs, LinearGradient, Stop, Text as SvgText,
} from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { PickerSheet } from '../../components/PickerSheet';
import { useExpenses } from '../../hooks/useExpenses';
import { useFinanceCategories } from '../../hooks/useFinance';
import {
  Period, periodStart, filterByPeriod, totals, byCategory, formatMoney,
} from '../../utils/expenseAnalytics';
import { ExpenseEntry } from '../../types';

type Props = NativeStackScreenProps<any, 'ExpenseReports'>;
type Rtab = 'all' | 'spending' | 'income';

const TABS: { key: Rtab; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'spending', label: 'spending' }, { key: 'income', label: 'Income' },
];
const PERIOD_LABELS: Record<Exclude<Period, 'all'>, string> = {
  day: 'Today', week: 'This Week', month: 'This Month', year: 'This Year',
};
const PERIOD_KEYS = ['day', 'week', 'month', 'year'] as const;
const periodFromLabel = (l: string): Period =>
  (PERIOD_KEYS.find(k => PERIOD_LABELS[k] === l) ?? 'month') as Period;

const PALETTE = ['#FED406', '#35CDFE', '#8C30E0', '#E30102', '#FF8503', '#53E721'];
const EXPENSE_LINE = '#F43535';
const INCOME_LINE = '#22C55E';

const DAY_MS = 86_400_000;
const iso = (d: Date) => d.toISOString().split('T')[0];

/** End of the window `offset` periods back from today, clamped to today. */
function refDateFor(period: Period, offset: number): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (offset <= 0) return today;
  let end: Date;
  if (period === 'day') end = new Date(today.getTime() - offset * DAY_MS);
  else if (period === 'week') {
    const start = new Date(periodStart('week', today) + 'T00:00:00');
    end = new Date(start.getTime() + (6 - offset * 7) * DAY_MS);
  } else if (period === 'month') end = new Date(today.getFullYear(), today.getMonth() - offset + 1, 0);
  else end = new Date(today.getFullYear() - offset, 11, 31);
  return end > today ? today : end;
}

function rangeLabel(period: Period, ref: Date): string {
  if (period === 'year') return String(ref.getFullYear());
  if (period === 'day') return ref.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (period === 'week') {
    const start = new Date(periodStart('week', ref) + 'T00:00:00');
    return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${ref.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  }
  return ref.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
const periodNoun = (p: Period) => (p === 'day' ? 'Day' : p === 'week' ? 'Week' : p === 'year' ? 'Year' : 'Month');

interface Point { label: string; expense: number; income: number }

/**
 * Placeholder figures so the report reads as a report before the first
 * transaction is logged, instead of an empty frame. Replaced entirely by real
 * data the moment any transaction exists.
 */
const SAMPLE = {
  categories: [
    { id: 'housing',       label: 'Housing',       pct: 0.33, color: '#35CDFE' },
    { id: 'transport',     label: 'Transportation', pct: 0.15, color: '#FED406' },
    { id: 'healthcare',    label: 'Healthcare',    pct: 0.10, color: '#E30102' },
    { id: 'entertainment', label: 'Entertainment', pct: 0.08, color: '#8C30E0' },
    { id: 'other',         label: 'Other',         pct: 0.34, color: '#FF8503' },
  ],
  total: 46000,
  points: [
    { label: '12', expense: 320,  income: 180 },
    { label: '13', expense: 980,  income: 620 },
    { label: '14', expense: 1040, income: 1180 },
    { label: '15', expense: 1420, income: 1260 },
    { label: '16', expense: 1080, income: 1960 },
    { label: '17', expense: 1150, income: 2380 },
    { label: '18', expense: 1620, income: 2740 },
  ] as Point[],
  avgDaily: 1453,
  deltaPct: -12,
};

/**
 * Buckets for the trend line. A single day plots nothing useful on its own, so
 * "Day" shows the trailing week; "Year" buckets by month rather than drawing
 * 365 points.
 */
function buildSeries(txns: ExpenseEntry[], period: Period, ref: Date): Point[] {
  const out: Point[] = [];
  const sum = (rows: ExpenseEntry[], income: boolean) =>
    rows.filter(t => (t.type === 'income') === income).reduce((a, t) => a + t.amount, 0);

  if (period === 'year') {
    const y = ref.getFullYear();
    const lastMonth = ref.getFullYear() === new Date().getFullYear() ? ref.getMonth() : 11;
    for (let m = 0; m <= lastMonth; m++) {
      const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;
      const rows = txns.filter(t => t.date.startsWith(prefix));
      out.push({
        label: new Date(y, m, 1).toLocaleDateString('en-US', { month: 'narrow' }),
        expense: sum(rows, false), income: sum(rows, true),
      });
    }
    return out;
  }

  const startISO = period === 'day'
    ? iso(new Date(ref.getTime() - 6 * DAY_MS))
    : periodStart(period, ref);
  const start = new Date(startISO + 'T00:00:00');
  const days = Math.round((ref.getTime() - start.getTime()) / DAY_MS) + 1;

  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const rows = txns.filter(t => t.date === iso(d));
    out.push({ label: String(d.getDate()), expense: sum(rows, false), income: sum(rows, true) });
  }
  return out;
}

/** Catmull-Rom → cubic bézier, so the line curves instead of kinking. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0].x} ${pts[0].y}`;
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

const niceCeiling = (v: number) => {
  if (v <= 0) return 1000;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
};
const axisLabel = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v)));

// ── Glyphs ───────────────────────────────────────────────────────────────────

const CaretGlyph = ({ color = '#141414' }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9.5 12 15.5l6-6" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const ArrowGlyph = ({ up, color }: { up: boolean; color: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d={up ? 'M12 19V5M6 11l6-6 6 6' : 'M12 5v14M6 13l6 6 6-6'}
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

/** Grid, one or two smoothed area series, and axis labels. */
function TrendChart({
  points, showExpense, showIncome,
}: { points: Point[]; showExpense: boolean; showIncome: boolean }) {
  const [w, setW] = useState(0);
  const H = 210, PAD_L = 30, PAD_R = 6, PAD_T = 10, PAD_B = 22;

  const peak = points.reduce(
    (m, p) => Math.max(m, showExpense ? p.expense : 0, showIncome ? p.income : 0), 0,
  );
  const top = niceCeiling(peak);
  const plotW = Math.max(0, w - PAD_L - PAD_R);
  const plotH = H - PAD_T - PAD_B;

  const xAt = (i: number) =>
    PAD_L + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const yAt = (v: number) => PAD_T + plotH - (v / top) * plotH;

  const series = (key: 'expense' | 'income') => points.map((p, i) => ({ x: xAt(i), y: yAt(p[key]) }));
  const area = (pts: { x: number; y: number }[]) =>
    `${smoothPath(pts)} L${pts[pts.length - 1].x} ${PAD_T + plotH} L${pts[0].x} ${PAD_T + plotH} Z`;

  // Never label every one of 30 days — sample to at most 7.
  const step = Math.max(1, Math.ceil(points.length / 7));
  const gridY = [0, 0.25, 0.5, 0.75, 1];

  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={H}>
          <Defs>
            <LinearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={EXPENSE_LINE} stopOpacity={0.16} />
              <Stop offset="1" stopColor={EXPENSE_LINE} stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id="incFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={INCOME_LINE} stopOpacity={0.16} />
              <Stop offset="1" stopColor={INCOME_LINE} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {gridY.map(f => {
            const y = PAD_T + plotH * f;
            return (
              <React.Fragment key={f}>
                <Line x1={PAD_L} y1={y} x2={w - PAD_R} y2={y} stroke="#EEEEEE" strokeWidth={1} />
                <SvgAxisLabel x={PAD_L - 6} y={y} text={axisLabel(top * (1 - f))} />
              </React.Fragment>
            );
          })}

          {showExpense && points.length > 0 && (
            <>
              <Path d={area(series('expense'))} fill="url(#expFill)" />
              <Path d={smoothPath(series('expense'))} stroke={EXPENSE_LINE} strokeWidth={2} fill="none" strokeLinecap="round" />
              {series('expense').map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={2.6} fill={Colors.white} stroke={EXPENSE_LINE} strokeWidth={1.2} />
              ))}
            </>
          )}
          {showIncome && points.length > 0 && (
            <>
              <Path d={area(series('income'))} fill="url(#incFill)" />
              <Path d={smoothPath(series('income'))} stroke={INCOME_LINE} strokeWidth={2} fill="none" strokeLinecap="round" />
              {series('income').map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={2.6} fill={Colors.white} stroke={INCOME_LINE} strokeWidth={1.2} />
              ))}
            </>
          )}
        </Svg>
      )}

      <View style={s.xAxis}>
        {points.map((p, i) => (
          <AppText key={i} style={[s.axisText, i % step !== 0 && { opacity: 0 }]}>{p.label}</AppText>
        ))}
      </View>
    </View>
  );
}

/** Right-aligned y-axis tick, nudged down so it sits on the grid line. */
function SvgAxisLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <SvgText x={x} y={y + 4} fontSize={10} fill="#696C70" textAnchor="end" fontFamily="DMSans-Medium">
      {text}
    </SvgText>
  );
}

export function ExpenseReportsScreen({ navigation }: Props) {
  const { txns } = useExpenses();
  const { metaFor } = useFinanceCategories();

  const [tab, setTab] = useState<Rtab>('all');
  const [period, setPeriod] = useState<Period>('month');
  const [offset, setOffset] = useState(0);
  const [periodSheet, setPeriodSheet] = useState(false);
  const [rangeSheet, setRangeSheet] = useState(false);

  const ref = refDateFor(period, offset);
  const filtered = filterByPeriod(txns, period, ref);
  const { income, expense } = totals(filtered);

  // Nothing logged anywhere yet → show the sample report rather than an
  // empty shell. Any real transaction switches every figure below to live data.
  const isSample = txns.length === 0;

  const showExpense = tab !== 'income';
  const showIncome = tab !== 'spending';

  const donutType: 'expense' | 'income' = tab === 'income' ? 'income' : 'expense';
  const realCats = byCategory(filtered, donutType, metaFor)
    .slice(0, 5)
    .map((c, i) => ({ ...c, color: c.color || PALETTE[i % PALETTE.length] }));
  const cats = isSample ? SAMPLE.categories : realCats;
  const donutTotal = isSample ? SAMPLE.total : donutType === 'income' ? income : expense;

  const realPoints = useMemo(() => buildSeries(txns, period, ref), [txns, period, ref]);
  const points = isSample ? SAMPLE.points : realPoints;

  const avgDaily = isSample
    ? SAMPLE.avgDaily
    : points.length ? expense / points.length : 0;

  /** Same-length window immediately before this one. */
  const prevExpense = useMemo(() => {
    const prevRef = refDateFor(period, offset + 1);
    return totals(filterByPeriod(txns, period, prevRef)).expense;
  }, [txns, period, offset]);
  const deltaPct = isSample
    ? SAMPLE.deltaPct
    : prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : null;
  // Spending less than last period is the good direction.
  const deltaGood = (deltaPct ?? 0) <= 0;

  /** Last 6 windows, newest first, as picker options. */
  const rangeOptions = useMemo(
    () => Array.from({ length: 6 }, (_, i) => rangeLabel(period, refDateFor(period, i))),
    [period],
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>Report</AppText>
        <View style={s.hBtn} />
      </View>

      <View style={s.tabWrap}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive]}
            activeOpacity={0.85}
            onPress={() => setTab(t.key)}
          >
            <AppText style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</AppText>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.chipRow}>
          <TouchableOpacity style={s.chip} activeOpacity={0.85} onPress={() => setPeriodSheet(true)}>
            <AppText style={s.chipText}>{PERIOD_LABELS[period as Exclude<Period, 'all'>]}</AppText>
            <CaretGlyph />
          </TouchableOpacity>
          <TouchableOpacity style={s.chip} activeOpacity={0.85} onPress={() => setRangeSheet(true)}>
            <AppText style={s.chipText}>{rangeLabel(period, ref)}</AppText>
            <CaretGlyph />
          </TouchableOpacity>
        </View>

        <>
            <AppText style={s.sectionTitle}>
              {donutType === 'income' ? 'Income by Category' : 'Spending by Category'}
            </AppText>

            {cats.length === 0 ? (
              <AppText style={s.muted}>Nothing in this range.</AppText>
            ) : (
              <View style={s.donutRow}>
                <View style={s.donut}>
                  <Svg width={140} height={140}>
                    {(() => {
                      const r = 58, stroke = 22, c = 2 * Math.PI * r;
                      let acc = 0;
                      return (
                        <>
                          <Circle cx={70} cy={70} r={r} stroke="#F3F4F6" strokeWidth={stroke} fill="none" />
                          {cats.map((cat, i) => {
                            const len = c * cat.pct;
                            const el = (
                              <Circle
                                key={i}
                                cx={70} cy={70} r={r}
                                stroke={cat.color} strokeWidth={stroke} fill="none"
                                strokeDasharray={`${len} ${c - len}`}
                                strokeDashoffset={-acc}
                                transform="rotate(-90 70 70)"
                              />
                            );
                            acc += len;
                            return el;
                          })}
                        </>
                      );
                    })()}
                  </Svg>
                  <View style={s.donutCenter}>
                    <AppText style={s.donutValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                      {formatMoney(donutTotal)}
                    </AppText>
                    <AppText style={s.donutCaption}>{donutType === 'income' ? 'EARNED' : 'USED'}</AppText>
                  </View>
                </View>

                <View style={s.legend}>
                  {cats.map(cat => (
                    <View key={cat.id} style={s.legendRow}>
                      <View style={s.legendLeft}>
                        <View style={[s.dot, { backgroundColor: cat.color }]} />
                        <AppText style={s.legendLabel} numberOfLines={1}>{cat.label}</AppText>
                      </View>
                      <AppText style={s.legendPct}>{Math.round(cat.pct * 100)}%</AppText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <AppText style={s.sectionTitle}>
              {tab === 'income' ? 'Daily income trend' : 'Daily spending trend'}
            </AppText>

            <View style={s.chartCard}>
              <TrendChart points={points} showExpense={showExpense} showIncome={showIncome} />

              <View style={s.divider} />

              <View style={s.footRow}>
                <View style={s.footCell}>
                  <AppText style={s.footLabel}>Average Daily Spend</AppText>
                  <AppText style={[s.footValue, { color: '#10B981' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {formatMoney(avgDaily)}
                  </AppText>
                </View>
                <View style={s.footDivider} />
                <View style={[s.footCell, { alignItems: 'flex-end' }]}>
                  <AppText style={s.footLabel}>Vs last {periodNoun(period)}</AppText>
                  {deltaPct == null ? (
                    <AppText style={[s.footValue, { color: '#999999' }]}>—</AppText>
                  ) : (
                    <View style={s.deltaRow}>
                      <ArrowGlyph up={deltaPct > 0} color={deltaGood ? '#34C759' : '#FF383C'} />
                      <AppText style={[s.footValue, { color: deltaGood ? '#34C759' : '#FF383C' }]}>
                        {Math.abs(Math.round(deltaPct))}%
                      </AppText>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {isSample && (
              <TouchableOpacity
                style={s.sampleCta}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('AddExpense')}
              >
                <AppText style={s.sampleCtaText}>Add your first transaction</AppText>
              </TouchableOpacity>
            )}
          </>
      </ScrollView>

      <PickerSheet
        visible={periodSheet}
        title="Period"
        options={PERIOD_KEYS.map(k => PERIOD_LABELS[k])}
        value={PERIOD_LABELS[period as Exclude<Period, 'all'>]}
        onSelect={l => { setPeriod(periodFromLabel(l)); setOffset(0); setPeriodSheet(false); }}
        onClose={() => setPeriodSheet(false)}
      />
      <PickerSheet
        visible={rangeSheet}
        title="Range"
        options={rangeOptions}
        value={rangeLabel(period, ref)}
        onSelect={l => { const i = rangeOptions.indexOf(l); if (i >= 0) setOffset(i); setRangeSheet(false); }}
        onClose={() => setRangeSheet(false)}
      />
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

  // ── Tabs ──
  tabWrap: {
    flexDirection: 'row', alignItems: 'stretch', gap: 2,
    marginHorizontal: 20, marginVertical: 10, padding: 5,
    backgroundColor: Colors.white, borderRadius: 30,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 24, alignItems: 'center' },
  tabActive: { backgroundColor: '#141414' },
  tabText: { fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16, letterSpacing: 0.12, color: '#494453' },
  tabTextActive: { color: Colors.white },

  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },

  // ── Chips ──
  chipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE,
  },
  chipText: { fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16, letterSpacing: 0.12, color: '#141414' },

  sectionTitle: {
    fontFamily: 'DMSans-SemiBold', fontSize: 16, lineHeight: 20, letterSpacing: 0.12,
    color: '#1D1A22', paddingTop: 6,
  },
  muted: { fontFamily: 'DMSans-Regular', fontSize: 14, color: '#999999' },

  // ── Donut ──
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 10 },
  donut: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center', width: 92 },
  donutValue: { fontFamily: 'DMSans-SemiBold', fontSize: 19, lineHeight: 26, color: '#141414' },
  donutCaption: { fontFamily: 'DMSans-Medium', fontSize: 11, lineHeight: 16, color: '#999999' },

  legend: { flex: 1, minWidth: 0, gap: 13 },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  legendLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 11, height: 11, borderRadius: 6 },
  legendLabel: {
    flex: 1, minWidth: 0, fontFamily: 'DMSans-Medium', fontSize: 13,
    lineHeight: 16, letterSpacing: 0.12, color: '#000000',
  },
  legendPct: { fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16, letterSpacing: 0.12, color: '#636161' },

  // ── Chart ──
  chartCard: {
    padding: 18, borderRadius: 24, gap: 18,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 30, paddingRight: 2 },
  axisText: { fontFamily: 'DMSans-Medium', fontSize: 10, color: '#696C70' },

  divider: { height: 1, backgroundColor: '#E2E8F0' },
  footRow: { flexDirection: 'row', alignItems: 'center' },
  footCell: { flex: 1, minWidth: 0, gap: 4 },
  footDivider: { width: 1, height: 40, backgroundColor: '#E2E8F0', marginHorizontal: 16 },
  footLabel: { fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16, color: '#999999' },
  footValue: { fontFamily: 'DMSans-Bold', fontSize: 18, lineHeight: 26 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },

  sampleCta: {
    paddingVertical: 16, borderRadius: 999, backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  sampleCtaText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: Colors.white },
});
