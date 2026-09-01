/**
 * ExpenseHistoryScreen — all transactions with Day/Week/Month/Year/All filters,
 * a steppable period, income/expense/savings summary, day groups that expand,
 * and highest-expense / average-daily stats.
 */
import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { useExpenses } from '../../hooks/useExpenses';
import {
  Period, periodStart, filterByPeriod, totals, byCategory, formatMoney,
} from '../../utils/expenseAnalytics';
import { useFinanceCategories } from '../../hooks/useFinance';
import { ExpenseEntry } from '../../types';

type Props = NativeStackScreenProps<any, 'ExpenseHistory'>;

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Day' }, { key: 'week', label: 'Week' }, { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' }, { key: 'all', label: 'All' },
];

const iso = (d: Date) => d.toISOString().split('T')[0];
const DAY_MS = 86_400_000;

const fmtDay = (dateISO: string) =>
  new Date(dateISO + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (hhmm?: string) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

/**
 * The end of the window `offset` periods back from today. `filterByPeriod`
 * takes a reference date and spans [periodStart(ref), ref], so stepping means
 * moving that reference to the last day of the target period — clamped to
 * today, since a window can't extend into the future.
 */
function refDateFor(period: Period, offset: number): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (offset <= 0 || period === 'all') return today;

  let end: Date;
  if (period === 'day') {
    end = new Date(today.getTime() - offset * DAY_MS);
  } else if (period === 'week') {
    const start = new Date(periodStart('week', today) + 'T00:00:00');
    end = new Date(start.getTime() + (6 - offset * 7) * DAY_MS);
  } else if (period === 'month') {
    // Day 0 of the following month = last day of the target month.
    end = new Date(today.getFullYear(), today.getMonth() - offset + 1, 0);
  } else {
    end = new Date(today.getFullYear() - offset, 11, 31);
  }
  return end > today ? today : end;
}

function rangeLabel(period: Period, ref: Date): string {
  if (period === 'all') return 'All time';
  if (period === 'day') return ref.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (period === 'year') return String(ref.getFullYear());
  if (period === 'month') return ref.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const start = new Date(periodStart('week', ref) + 'T00:00:00');
  return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${ref.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

// ── Glyphs ───────────────────────────────────────────────────────────────────

const ChevronGlyph = ({ dir }: { dir: 'left' | 'right' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d={dir === 'left' ? 'M14.5 5.5 8 12l6.5 6.5' : 'M9.5 5.5 16 12l-6.5 6.5'}
      stroke="#141414" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);
const CaretGlyph = ({ open }: { open: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d={open ? 'M6 14.5 12 8.5l6 6' : 'M6 9.5 12 15.5l6-6'}
      stroke="#141414" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

export function ExpenseHistoryScreen({ navigation }: Props) {
  const { txns, refreshing, refresh, remove } = useExpenses();
  const { metaFor } = useFinanceCategories();

  const [period, setPeriod] = useState<Period>('month');
  const [offset, setOffset] = useState(0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const ref = refDateFor(period, offset);
  const filtered = filterByPeriod(txns, period, ref);
  const { income, expense, savings } = totals(filtered);

  /** Transactions bucketed by date, newest day first. */
  const groups = useMemo(() => {
    const map = new Map<string, ExpenseEntry[]>();
    for (const t of filtered) {
      const list = map.get(t.date);
      if (list) list.push(t); else map.set(t.date, [t]);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, items]) => ({
        date,
        items: [...items].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')).reverse(),
        // The day header shows what you spent, not the net of spend and income.
        spend: items.filter(t => t.type !== 'income').reduce((a, t) => a + t.amount, 0),
      }));
  }, [filtered]);

  const topCategory = byCategory(filtered, 'expense', metaFor)[0];

  /** Spend per elapsed day in the window — not per day that happens to have data. */
  const avgDaily = useMemo(() => {
    if (!expense) return 0;
    const startISO = period === 'all'
      ? (filtered.reduce((min, t) => (t.date < min ? t.date : min), iso(ref)))
      : periodStart(period, ref);
    const days = Math.max(
      1,
      Math.round((new Date(iso(ref) + 'T00:00:00').getTime() - new Date(startISO + 'T00:00:00').getTime()) / DAY_MS) + 1,
    );
    return expense / days;
  }, [expense, filtered, period, ref]);

  const onRow = (id: string, name: string) => Alert.alert(name, undefined, [
    { text: 'Edit', onPress: () => navigation.navigate('AddExpense', { id }) },
    { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Delete transaction', 'Remove this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(id) },
    ]) },
    { text: 'Cancel', style: 'cancel' },
  ]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>History</AppText>
        <View style={s.hBtn} />
      </View>

      <View style={s.filterWrap}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[s.seg, period === p.key && s.segActive]}
            activeOpacity={0.85}
            onPress={() => { setPeriod(p.key); setOffset(0); }}
          >
            <AppText style={[s.segText, period === p.key && s.segTextActive]}>{p.label}</AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Render immediately — the empty state covers loading and no-data. */}
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.trackers} />}
      >
        {period !== 'all' && (
          <View style={s.stepper}>
            <TouchableOpacity onPress={() => setOffset(o => o + 1)} hitSlop={10} style={s.stepBtn}>
              <ChevronGlyph dir="left" />
            </TouchableOpacity>
            <AppText style={s.stepLabel}>{rangeLabel(period, ref)}</AppText>
            <TouchableOpacity
              onPress={() => setOffset(o => Math.max(0, o - 1))}
              disabled={offset === 0}
              hitSlop={10}
              style={[s.stepBtn, offset === 0 && s.stepBtnOff]}
            >
              <ChevronGlyph dir="right" />
            </TouchableOpacity>
          </View>
        )}

        <View style={s.summaryCard}>
          <View style={s.sumCell}>
            <AppText style={s.sumLabel}>Income</AppText>
            <AppText style={[s.sumValue, { color: '#34C759' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatMoney(income)}
            </AppText>
          </View>
          <View style={s.sumDivider} />
          <View style={s.sumCell}>
            <AppText style={s.sumLabel}>Expense</AppText>
            <AppText style={[s.sumValue, { color: '#FF383C' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatMoney(expense)}
            </AppText>
          </View>
          <View style={s.sumDivider} />
          <View style={s.sumCell}>
            <AppText style={s.sumLabel}>Savings</AppText>
            <AppText style={[s.sumValue, { color: '#5856D6' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatMoney(savings)}
            </AppText>
          </View>
        </View>

        {groups.length === 0 ? (
          <AppEmptyState
            emoji="🧾"
            title="Nothing here"
            subtitle="No transactions in this range."
            actionLabel="Add"
            onAction={() => navigation.navigate('AddExpense')}
          />
        ) : groups.map(g => {
          const open = !collapsed[g.date];
          const toggle = () => setCollapsed(c => ({ ...c, [g.date]: open }));

          if (!open) {
            return (
              <TouchableOpacity key={g.date} style={s.groupCard} activeOpacity={0.85} onPress={toggle}>
                <AppText style={s.groupCardDate}>{fmtDay(g.date)}</AppText>
                <View style={s.groupRight}>
                  <AppText style={s.groupTotal}>{formatMoney(g.spend)}</AppText>
                  <CaretGlyph open={false} />
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <View key={g.date} style={s.group}>
              <TouchableOpacity style={s.groupHead} activeOpacity={0.85} onPress={toggle}>
                <AppText style={s.groupDate}>{fmtDay(g.date)}</AppText>
                <View style={s.groupRight}>
                  <AppText style={s.groupTotal}>{formatMoney(g.spend)}</AppText>
                  <CaretGlyph open />
                </View>
              </TouchableOpacity>

              {g.items.map(t => {
                const inc = t.type === 'income';
                const m = metaFor(t.category, inc ? 'income' : 'expense');
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={s.txnCard}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('TransactionDetail', { id: t.id })}
                    onLongPress={() => onRow(t.id, m.label)}
                  >
                    <View style={s.txnLeft}>
                      <View style={[s.txnIcon, { backgroundColor: (m.color || '#999999') + '22' }]}>
                        <AppText style={s.txnEmoji}>{m.emoji}</AppText>
                      </View>
                      <View style={s.txnText}>
                        <AppText style={s.txnTitle} numberOfLines={1}>{t.note?.trim() || m.label}</AppText>
                        <AppText style={s.txnSub} numberOfLines={1}>{m.label}</AppText>
                      </View>
                    </View>
                    <View style={s.txnRight}>
                      <AppText style={[s.txnAmount, inc && { color: '#34C759' }]}>
                        {inc ? '+' : '-'}{formatMoney(t.amount)}
                      </AppText>
                      <AppText style={s.txnTime}>{fmtTime(t.time)}</AppText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {filtered.length > 0 && (
          <View style={s.statRow}>
            <View style={s.statCard}>
              <AppText style={s.statEmoji}>🔥</AppText>
              <View style={s.statText}>
                <AppText style={s.statLabel}>Highest Expense</AppText>
                <AppText style={s.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatMoney(topCategory?.amount ?? 0)}
                </AppText>
                <AppText style={s.statCaption} numberOfLines={1}>{topCategory?.label ?? '—'}</AppText>
              </View>
            </View>
            <View style={s.statCard}>
              <AppText style={s.statEmoji}>📈</AppText>
              <View style={s.statText}>
                <AppText style={s.statLabel}>Average Daily</AppText>
                <AppText style={s.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatMoney(avgDaily)}
                </AppText>
                <AppText style={s.statCaption} numberOfLines={1}>{rangeLabel(period, ref)}</AppText>
              </View>
            </View>
          </View>
        )}
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

  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },

  // ── Range stepper ──
  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 8,
  },
  stepBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepBtnOff: { opacity: 0.25 },
  stepLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: '#141414' },

  // ── Summary ──
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 30,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  sumCell: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4 },
  sumDivider: { width: 1, height: 32, backgroundColor: HAIRLINE },
  sumLabel: { fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16, letterSpacing: 0.12, color: '#141414' },
  sumValue: { fontFamily: 'DMSans-Bold', fontSize: 17, lineHeight: 24 },

  // ── Day groups ──
  group: { gap: 14 },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupDate: { fontFamily: 'DMSans-SemiBold', fontSize: 16, letterSpacing: 0.12, color: '#1D1A22' },
  groupRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupTotal: { fontFamily: 'DMSans-SemiBold', fontSize: 16, letterSpacing: 0.12, color: '#1D1A22' },

  groupCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderRadius: 30,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  groupCardDate: { fontFamily: 'DMSans-SemiBold', fontSize: 19, letterSpacing: 0.12, color: '#1D1A22' },

  // ── Transaction cards ──
  txnCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 30,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  txnLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  txnIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  txnEmoji: { fontSize: 24, lineHeight: 30, includeFontPadding: false } as any,
  txnText: { flex: 1, minWidth: 0 },
  txnTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 16, lineHeight: 22, color: '#1D1A22' },
  txnSub: { fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16, letterSpacing: 0.12, color: '#494453' },
  txnRight: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  txnAmount: { fontFamily: 'DMSans-SemiBold', fontSize: 17, lineHeight: 24, color: '#141414' },
  txnTime: { fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16, letterSpacing: 0.12, color: '#494453' },

  // ── Stats ──
  statRow: { flexDirection: 'row', alignItems: 'stretch', gap: 16 },
  statCard: {
    flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 16,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  statEmoji: { fontSize: 30, lineHeight: 38, includeFontPadding: false } as any,
  statText: { flex: 1, minWidth: 0, gap: 2 },
  statLabel: { fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16, letterSpacing: 0.12, color: '#494453' },
  statValue: { fontFamily: 'DMSans-SemiBold', fontSize: 18, lineHeight: 24, color: '#1D1A22' },
  statCaption: {
    fontFamily: 'DMSans-Regular', fontSize: 10, lineHeight: 15, letterSpacing: 0.5,
    color: '#999999', textTransform: 'uppercase',
  },
});
