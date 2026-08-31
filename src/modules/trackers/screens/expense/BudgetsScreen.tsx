/**
 * BudgetsScreen — Budgets Overview (§11).
 *
 * The overall budget sits at the top, category budgets below, each with a
 * progress bar and a plain-language status. Everything shown is derived from
 * transactions by `budgetAnalytics` — nothing about progress is stored, so it
 * can never disagree with the ledger behind it (§21).
 */
import React from 'react';
import {
  View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { useBudgets, useFinanceCategories } from '../../hooks/useFinance';
import { budgetMessage, BudgetProgress } from '../../utils/budgetAnalytics';
import { formatMoney } from '../../utils/expenseAnalytics';
import { BUDGET_PERIOD_META } from '../../types';

type Props = NativeStackScreenProps<any, 'Budgets'>;

const STATE_COLOR: Record<BudgetProgress['state'], string> = {
  under:    '#22C55E',
  warning:  '#F59E0B',
  exceeded: '#EF4444',
  paused:   '#9CA3AF',
};

const PlusGlyph = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M10 4v12M4 10h12" stroke={Colors.white} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const ChevronGlyph = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M6 3 10.5 8 6 13" stroke="#D1D5DB" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export function BudgetsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { budgets, loading, refreshing, refresh, error, progress } = useBudgets();
  const { metaFor } = useFinanceCategories();

  const overall = progress.find(p => !p.budget.categoryKey) ?? null;
  const perCategory = progress.filter(p => !!p.budget.categoryKey);

  const openEditor = (id?: string) =>
    navigation.navigate('SetBudget', id ? { id } : {});

  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
        <AppText style={s.backArrow}>←</AppText>
      </TouchableOpacity>
      <AppText style={s.headerTitle}>Budgets</AppText>
      <View style={s.hBtn} />
    </View>
  );

  if (loading && budgets.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <View style={s.centre}>
          <ActivityIndicator color="#4F46E5" />
          <AppText style={s.centreText}>Loading your budgets…</AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (error && budgets.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <View style={s.centre}>
          <AppText style={s.centreTitle}>Unable to load your budgets.</AppText>
          <AppText style={s.centreText}>Please try again.</AppText>
          <TouchableOpacity style={s.retryBtn} activeOpacity={0.9} onPress={refresh}>
            <AppText style={s.retryText}>Retry</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (budgets.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <View style={s.centre}>
          <AppText style={s.centreTitle}>No budgets yet</AppText>
          <AppText style={s.centreText}>
            Set a limit and this screen will show how you're tracking against it
            as you spend.
          </AppText>
          <TouchableOpacity style={s.cta} activeOpacity={0.9} onPress={() => openEditor()}>
            <PlusGlyph />
            <AppText style={s.ctaText}>Set a budget</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {header}

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#4F46E5" />}
      >
        {error ? (
          <View style={s.errorBanner}>
            <AppText variant="caption" color={Colors.error}>{error}</AppText>
            <TouchableOpacity onPress={refresh} hitSlop={8}>
              <AppText style={s.errorRetry}>Retry</AppText>
            </TouchableOpacity>
          </View>
        ) : null}

        {overall ? (
          <>
            <AppText style={s.sectionTitle}>Overall</AppText>
            <BudgetCard p={overall} label="All spending" emoji="💰" onPress={() => openEditor(overall.budget.id)} />
          </>
        ) : (
          <TouchableOpacity style={s.addOverall} activeOpacity={0.85} onPress={() => openEditor()}>
            <AppText style={s.addOverallText}>+ Set an overall budget</AppText>
          </TouchableOpacity>
        )}

        {perCategory.length > 0 ? (
          <>
            <AppText style={s.sectionTitle}>By category</AppText>
            {perCategory.map(p => {
              const meta = metaFor(p.budget.categoryKey!, 'expense');
              return (
                <BudgetCard
                  key={p.budget.id}
                  p={p}
                  label={meta.label}
                  emoji={meta.emoji}
                  onPress={() => openEditor(p.budget.id)}
                />
              );
            })}
          </>
        ) : null}

        <TouchableOpacity style={s.cta} activeOpacity={0.9} onPress={() => openEditor()}>
          <PlusGlyph />
          <AppText style={s.ctaText}>Set a budget</AppText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/** One budget: limit, spend, progress and its status line. */
function BudgetCard({
  p, label, emoji, onPress,
}: {
  p: BudgetProgress; label: string; emoji: string; onPress: () => void;
}) {
  const msg = budgetMessage(p, formatMoney);
  const colour = STATE_COLOR[p.state];

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={onPress}>
      <View style={s.cardTop}>
        <View style={s.cardLeft}>
          <AppText style={s.cardEmoji}>{emoji}</AppText>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText style={s.cardLabel} numberOfLines={1}>{label}</AppText>
            <AppText style={s.cardPeriod}>
              {BUDGET_PERIOD_META[p.budget.period].label}
            </AppText>
          </View>
        </View>
        <View style={s.cardRight}>
          {/* Uncapped: an overspend has to read as its real figure (§11). */}
          <AppText style={[s.cardPct, { color: colour }]}>{p.pct}%</AppText>
          <ChevronGlyph />
        </View>
      </View>

      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${p.fraction * 100}%`, backgroundColor: colour }]} />
      </View>

      <View style={s.cardBottom}>
        <AppText style={s.cardSpent}>
          {formatMoney(p.spent)} of {formatMoney(p.limit)}
        </AppText>
        {/* Colour alone shouldn't carry the warning — the words say it too. */}
        <AppText style={[s.cardState, { color: colour }]} numberOfLines={1}>{msg.title}</AppText>
      </View>
      <AppText style={s.cardBody}>{msg.body}</AppText>
    </TouchableOpacity>
  );
}

const HAIRLINE = 'rgba(153,153,153,0.20)';
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
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

  scroll: { paddingHorizontal: 20, gap: 12 },
  sectionTitle: {
    fontFamily: 'DMSans-SemiBold', fontSize: 16, color: '#141414', marginTop: 8,
  },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12,
  },
  errorRetry: { fontFamily: 'DMSans-Bold', fontSize: 13, color: '#141414' },

  centre: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingBottom: 60, gap: 12,
  },
  centreTitle: {
    fontFamily: 'DMSans-SemiBold', fontSize: 19, color: '#141414', textAlign: 'center',
  },
  centreText: {
    fontFamily: 'DMSans-Regular', fontSize: 14, lineHeight: 21,
    color: '#6B7280', textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8, paddingVertical: 14, paddingHorizontal: 40,
    backgroundColor: '#141414', borderRadius: 9999,
  },
  retryText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: Colors.white },

  card: {
    padding: 16, borderRadius: 20, gap: 10,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardEmoji: { fontSize: 22 },
  cardLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: '#141414' },
  cardPeriod: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#9CA3AF' },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  cardPct: { fontFamily: 'DMSans-Bold', fontSize: 17 },

  barTrack: {
    height: 8, borderRadius: 999, backgroundColor: 'rgba(153,153,153,0.18)', overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 999 },

  cardBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
  },
  cardSpent: { fontFamily: 'DMSans-Medium', fontSize: 13, color: '#6B7280' },
  cardState: { fontFamily: 'DMSans-Bold', fontSize: 13, flexShrink: 1, textAlign: 'right' },
  cardBody: { fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 18, color: '#9CA3AF' },

  addOverall: {
    padding: 16, borderRadius: 20, alignItems: 'center',
    borderWidth: 1, borderColor: HAIRLINE, borderStyle: 'dashed',
  },
  addOverallText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#4F46E5' },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginTop: 8, paddingVertical: 18, borderRadius: 9999, backgroundColor: '#141414',
  },
  ctaText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: Colors.white },
});
