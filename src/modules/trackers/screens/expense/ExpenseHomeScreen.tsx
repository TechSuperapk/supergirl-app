/**
 * ExpenseHomeScreen — overview: total expense with a category donut, income
 * and savings, quick actions, category breakdown, recent transactions.
 * Day/Week/Month filter. Pull-to-refresh, empty/error states.
 */
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { PickerSheet } from '../../components/PickerSheet';
import { useExpenses } from '../../hooks/useExpenses';
import { useFinanceCategories, useBudgets } from '../../hooks/useFinance';
import {
  Period, filterByPeriod, totals, byCategory, formatMoney,
} from '../../utils/expenseAnalytics';

type Props = NativeStackScreenProps<any, 'ExpenseHome'>;

/** Fallback ring/bar palette, used when a category has no colour of its own. */
const PALETTE = ['#E30102', '#FED406', '#35CDFE', '#8C30E0', '#FF8503', '#53E721'];

const PERIOD_LABELS: Record<Exclude<Period, 'all'>, string> = {
  day: 'Today', week: 'This Week', month: 'This Month', year: 'This Year',
};
const PERIOD_KEYS = ['day', 'week', 'month', 'year'] as const;
const periodFromLabel = (label: string): Period =>
  (PERIOD_KEYS.find(k => PERIOD_LABELS[k] === label) ?? 'month') as Period;

const monthLabel = (p: Period) =>
  p === 'month'
    ? new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : PERIOD_LABELS[p as Exclude<Period, 'all'>] ?? 'All time';

const shortDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// ── Glyphs ───────────────────────────────────────────────────────────────────

const PlusGlyph = ({ color = '#141414', size = 20 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path d="M10 4v12M4 10h12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const CaretGlyph = ({ color = '#141414' }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
    <Path d="M4 6.5 8 10.5l4-4" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const ClockGlyph = () => (
  <Svg width={26} height={26} viewBox="0 0 28 28" fill="none">
    <Circle cx={14} cy={14} r={11} fill="#FFF1DA" stroke="#E8A33D" strokeWidth={1.6} />
    <Path d="M14 8v6.4l4 2.2" stroke="#E8A33D" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const GridGlyph = () => (
  <Svg width={26} height={26} viewBox="0 0 28 28" fill="none">
    <Rect x={4} y={4} width={9} height={9} rx={2.5} fill="#E30102" />
    <Rect x={15} y={4} width={9} height={9} rx={2.5} fill="#35CDFE" />
    <Rect x={4} y={15} width={9} height={9} rx={2.5} fill="#FED406" />
    <Rect x={15} y={15} width={9} height={9} rx={2.5} fill="#53E721" />
  </Svg>
);
/** Coins + rising bars, sat inside the donut. */
const WalletGlyph = () => (
  <Svg width={40} height={40} viewBox="0 0 44 44" fill="none">
    <Rect x={22} y={22} width={5} height={12} rx={1.6} fill="#22A06B" />
    <Rect x={29} y={16} width={5} height={18} rx={1.6} fill="#22A06B" />
    <Path d="M28 15h7v7" stroke="#22A06B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M27 15 19 22l-4-3" stroke="#22A06B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Rect x={7} y={24} width={14} height={4} rx={2} fill="#F0A64A" />
    <Rect x={7} y={29} width={14} height={4} rx={2} fill="#E8942F" />
    <Rect x={7} y={19} width={14} height={4} rx={2} fill="#FFC531" />
  </Svg>
);

/**
 * Donut of the category split. Segments are stroked arcs on one circle, so
 * they always meet exactly — no gaps from rounding each slice separately.
 */
function CategoryDonut({ slices }: { slices: { pct: number; color: string }[] }) {
  const size = 100, stroke = 14, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <View style={s.donut}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#F1F1F1" strokeWidth={stroke} fill="none" />
        {slices.map((sl, i) => {
          const len = c * sl.pct;
          const el = (
            <Circle
              key={i}
              cx={size / 2} cy={size / 2} r={r}
              stroke={sl.color} strokeWidth={stroke} fill="none"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              // Start at 12 o'clock rather than 3.
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += len;
          return el;
        })}
      </Svg>
      <View style={s.donutCenter}><WalletGlyph /></View>
    </View>
  );
}

export function ExpenseHomeScreen({ navigation }: Props) {
  const { txns, refreshing, error, refresh } = useExpenses();
  const { metaFor } = useFinanceCategories();
  const [period, setPeriod] = useState<Period>('month');
  const [periodSheet, setPeriodSheet] = useState(false);

  const filtered = filterByPeriod(txns, period);
  const { alerts: budgetAlerts } = useBudgets();
  const { income, expense, savings } = totals(filtered);
  const cats = byCategory(filtered, 'expense', metaFor)
    .slice(0, 6)
    .map((c, i) => ({ ...c, color: c.color || PALETTE[i % PALETTE.length] }));
  const recent = txns.slice(0, 5);

  const QuickAction = ({
    icon, label, onPress, divider = true,
  }: { icon: React.ReactNode; label: string; onPress: () => void; divider?: boolean }) => (
    <TouchableOpacity
      style={[s.qa, divider && s.qaDivider]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={s.qaIcon}>{icon}</View>
      <AppText style={s.qaLabel} numberOfLines={1}>{label}</AppText>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>Expense tracker</AppText>
        {/* The mock leaves this slot empty, but Reports has no other entry
            point, so it lives here rather than becoming unreachable. */}
        <TouchableOpacity onPress={() => navigation.navigate('ExpenseReports')} style={s.hBtn} hitSlop={8}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path d="M4 20V10M12 20V4M20 20v-7" stroke="#141414" strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Render immediately — the empty state covers loading and no-data. */}
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.trackers} />}
      >
        {/* ── Totals ── */}
        <View style={s.totalCard}>
          <View style={s.totalTop}>
            <View style={s.totalLeft}>
              <AppText style={s.totalLabel}>Total Expense</AppText>
              <AppText style={s.totalValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {formatMoney(expense)}
              </AppText>
              <TouchableOpacity style={s.monthChip} activeOpacity={0.8} onPress={() => setPeriodSheet(true)}>
                <AppText style={s.monthText}>{monthLabel(period)}</AppText>
                <CaretGlyph />
              </TouchableOpacity>
            </View>
            <CategoryDonut slices={cats.map(c => ({ pct: c.pct, color: c.color }))} />
          </View>

          <View style={s.divider} />

          <View style={s.splitRow}>
            <View style={s.splitCell}>
              <AppText style={s.splitLabel}>Income</AppText>
              <AppText style={[s.splitValue, { color: '#10B981' }]} numberOfLines={1}>
                {formatMoney(income)}
              </AppText>
            </View>
            <View style={s.splitDivider} />
            <View style={[s.splitCell, { alignItems: 'flex-end' }]}>
              <AppText style={s.splitLabel}>Savings</AppText>
              <AppText
                style={[s.splitValue, { color: savings >= 0 ? '#4F46E5' : Colors.error }]}
                numberOfLines={1}
              >
                {formatMoney(savings)}
              </AppText>
            </View>
          </View>
        </View>

        {error ? <AppText variant="caption" color={Colors.error}>{error}</AppText> : null}

        {/* ── Budget warnings (§11) ──
            The whole point of a budget is to be told before the money runs
            out, so warnings surface on the dashboard rather than waiting to be
            found. Silent when nothing needs attention. */}
        {budgetAlerts.length > 0 ? (
          <View style={s.section}>
            {budgetAlerts.slice(0, 3).map(p => {
              const meta = p.budget.categoryKey
                ? metaFor(p.budget.categoryKey, 'expense')
                : { label: 'All spending', emoji: '💰' };
              const over = p.state === 'exceeded';
              return (
                <TouchableOpacity
                  key={p.budget.id}
                  style={[s.budgetAlert, over && s.budgetAlertOver]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Budgets')}
                >
                  <AppText style={s.budgetEmoji}>{meta.emoji}</AppText>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText style={s.budgetTitle} numberOfLines={1}>
                      {meta.label} · {over ? 'over budget' : 'close to the limit'}
                    </AppText>
                    <AppText style={s.budgetSub} numberOfLines={1}>
                      {formatMoney(p.spent)} of {formatMoney(p.limit)}
                    </AppText>
                  </View>
                  {/* Uncapped, so an overspend reads as its real figure. */}
                  <AppText style={[s.budgetPct, over && { color: '#DC2626' }]}>{p.pct}%</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {/* ── Quick actions ── */}
        <View style={s.section}>
          <AppText style={s.sectionTitle}>Quick Action</AppText>
          <View style={s.qaRow}>
            <QuickAction
              icon={<View style={s.qaCircle}><PlusGlyph /></View>}
              label="Add expense"
              onPress={() => navigation.navigate('AddExpense', { type: 'expense' })}
            />
            <QuickAction
              icon={<View style={s.qaCircle}><PlusGlyph /></View>}
              label="Add income"
              onPress={() => navigation.navigate('AddExpense', { type: 'income' })}
            />
            <QuickAction
              icon={<ClockGlyph />}
              label="History"
              onPress={() => navigation.navigate('ExpenseHistory')}
            />
            <QuickAction
              icon={<GridGlyph />}
              label="Category"
              divider={false}
              onPress={() => navigation.navigate('ExpenseCategory')}
            />
          </View>

          {/* Budgets and Accounts on a second row rather than squeezing six
              tiles into one. Accounts previously had no entry point at all —
              the screen was only reachable as a fallback from the Add Expense
              account picker (§10 lists it as a destination). */}
          <View style={[s.qaRow, { marginTop: 10 }]}>
            <QuickAction
              icon={<GridGlyph />}
              label="Budgets"
              onPress={() => navigation.navigate('Budgets')}
            />
            <QuickAction
              icon={<GridGlyph />}
              label="Accounts"
              divider={false}
              onPress={() => navigation.navigate('Accounts')}
            />
          </View>
        </View>

        {/* ── Expense by category ── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <AppText style={s.sectionTitle}>Expense by Category</AppText>
            <TouchableOpacity style={s.periodChip} activeOpacity={0.8} onPress={() => setPeriodSheet(true)}>
              <AppText style={s.periodText}>{PERIOD_LABELS[period as Exclude<Period, 'all'>] ?? 'All'}</AppText>
              <CaretGlyph color="#999999" />
            </TouchableOpacity>
          </View>

          {cats.length === 0 ? (
            <AppText style={s.muted}>No spending in this period yet.</AppText>
          ) : cats.map(c => (
            <View key={c.id} style={s.catRow}>
              <View style={s.catIcon}><AppText style={s.catEmoji}>{c.emoji}</AppText></View>
              <View style={s.catBody}>
                <View style={s.rowBetween}>
                  <AppText style={s.catName} numberOfLines={1}>{c.label}</AppText>
                  <AppText style={s.catAmount}>{formatMoney(c.amount)}</AppText>
                </View>
                <View style={s.catBarRow}>
                  <View style={s.catTrack}>
                    <View style={[s.catFill, { width: `${Math.round(c.pct * 100)}%`, backgroundColor: c.color }]} />
                  </View>
                  <AppText style={s.catPct}>{Math.round(c.pct * 100)}%</AppText>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ── Recent transactions ── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <AppText style={s.sectionTitle}>Recent Transactions</AppText>
            <TouchableOpacity onPress={() => navigation.navigate('ExpenseHistory')} hitSlop={8}>
              <AppText style={s.viewAll}>View All</AppText>
            </TouchableOpacity>
          </View>

          {recent.length === 0 ? (
            <AppEmptyState
              emoji="💸"
              title="No transactions yet"
              subtitle="Add your first expense or income."
              actionLabel="Add Expense"
              onAction={() => navigation.navigate('AddExpense')}
            />
          ) : recent.map(t => {
            const inc = t.type === 'income';
            const m = metaFor(t.category, inc ? 'income' : 'expense');
            return (
              <TouchableOpacity
                key={t.id}
                style={s.txnRow}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('TransactionDetail', { id: t.id })}
              >
                <View style={[s.txnIcon, { backgroundColor: (m.color || '#999999') + '22' }]}>
                  <AppText style={s.catEmoji}>{m.emoji}</AppText>
                </View>
                <View style={s.txnBody}>
                  <AppText style={s.txnTitle} numberOfLines={1}>{t.note?.trim() || m.label}</AppText>
                  <AppText style={s.txnSub} numberOfLines={1}>{m.label}</AppText>
                </View>
                <View style={s.txnRight}>
                  <AppText style={[s.txnAmount, inc && { color: '#10B981' }]}>
                    {inc ? '+' : ''}{formatMoney(t.amount)}
                  </AppText>
                  <AppText style={s.txnDate}>{shortDate(t.date)}</AppText>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={s.cta}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('AddExpense', { type: 'expense' })}
        >
          <PlusGlyph color={Colors.white} size={18} />
          <AppText style={s.ctaText}>Add Expense</AppText>
        </TouchableOpacity>
      </ScrollView>

      <PickerSheet
        visible={periodSheet}
        title="Show"
        options={PERIOD_KEYS.map(k => PERIOD_LABELS[k])}
        value={PERIOD_LABELS[period as Exclude<Period, 'all'>]}
        onSelect={label => { setPeriod(periodFromLabel(label)); setPeriodSheet(false); }}
        onClose={() => setPeriodSheet(false)}
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

  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },

  // ── Totals card ──
  totalCard: {
    padding: 20, borderRadius: 24, backgroundColor: Colors.white, gap: 20,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  totalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  totalLeft: { flex: 1, minWidth: 0, gap: 3 },
  totalLabel: { fontFamily: 'DMSans-Medium', fontSize: 14, lineHeight: 20, color: '#999999' },
  totalValue: { fontFamily: 'DMSans-Bold', fontSize: 30, lineHeight: 38, color: '#141414' },
  monthChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthText: { fontFamily: 'DMSans-Medium', fontSize: 14, lineHeight: 20, color: '#141414' },

  donut: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },

  divider: { height: 1, backgroundColor: '#E2E8F0' },

  // ── Budget warnings (§11) ──
  budgetAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 16, marginBottom: 8,
    backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#F5D9A0',
  },
  budgetAlertOver: { backgroundColor: '#FEF2F2', borderColor: 'rgba(220,38,38,0.30)' },
  budgetEmoji: { fontSize: 20 },
  budgetTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#141414' },
  budgetSub: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#6B7280' },
  budgetPct: { fontFamily: 'DMSans-Bold', fontSize: 16, color: '#B45309' },
  splitRow: { flexDirection: 'row', alignItems: 'center' },
  splitCell: { flex: 1, minWidth: 0, gap: 2 },
  splitDivider: { width: 1, height: 40, backgroundColor: '#E2E8F0', marginHorizontal: 16 },
  splitLabel: { fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16, color: '#999999' },
  splitValue: { fontFamily: 'DMSans-Bold', fontSize: 18, lineHeight: 26 },

  // ── Sections ──
  section: { gap: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'DMSans-Bold', fontSize: 16, lineHeight: 24, color: '#131313' },
  periodChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  periodText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, lineHeight: 20, color: '#999999' },
  viewAll: { fontFamily: 'DMSans-SemiBold', fontSize: 12, lineHeight: 16, color: '#999999' },
  muted: { fontFamily: 'DMSans-Regular', fontSize: 14, color: '#999999' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },

  // ── Quick actions ──
  qaRow: { flexDirection: 'row', alignItems: 'stretch' },
  qa: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 4, paddingVertical: 2 },
  qaDivider: { borderRightWidth: 1, borderRightColor: '#F1F1F1' },
  qaIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  qaCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  qaLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 13, lineHeight: 20, color: '#000000' },

  // ── Category rows ──
  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  catIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: 22, lineHeight: 28, includeFontPadding: false } as any,
  catBody: { flex: 1, minWidth: 0 },
  catName: { flex: 1, minWidth: 0, fontFamily: 'DMSans-SemiBold', fontSize: 14, lineHeight: 20, color: '#131313' },
  catAmount: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 20, color: '#131313' },
  catBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  catTrack: { flex: 1, height: 6, borderRadius: 999, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  catFill: { height: 6, borderRadius: 999 },
  catPct: { fontFamily: 'DMSans-Medium', fontSize: 10, lineHeight: 15, color: '#131313', minWidth: 26, textAlign: 'right' },

  // ── Transactions ──
  txnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  txnIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txnBody: { flex: 1, minWidth: 0 },
  txnTitle: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 20, color: '#141414' },
  txnSub: { fontFamily: 'DMSans-Regular', fontSize: 11, lineHeight: 17, color: '#141414' },
  txnRight: { alignItems: 'flex-end', flexShrink: 0 },
  txnAmount: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 20, color: '#141414' },
  txnDate: { fontFamily: 'DMSans-Medium', fontSize: 10, lineHeight: 15, color: '#141414' },

  // ── CTA ──
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 18, paddingHorizontal: 30, borderRadius: 999, backgroundColor: '#141414',
  },
  ctaText: { fontFamily: 'DMSans-Bold', fontSize: 16, lineHeight: 24, color: Colors.white },
});
