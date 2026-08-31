/**
 * SetBudgetScreen — create or edit a budget (§11, §19).
 *
 * Scope (overall or one category), limit, period, alert threshold and the day
 * the period rolls over. Delete confirms first, since a budget carries a
 * history of warnings the user may have been acting on.
 */
import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { PickerSheet } from '../../components/PickerSheet';
import { useBudgets, useFinanceCategories } from '../../hooks/useFinance';
import { validateBudget, progressFor } from '../../utils/budgetAnalytics';
import { formatMoney } from '../../utils/expenseAnalytics';
import {
  BudgetPeriod, BUDGET_PERIOD_META, BUDGET_ALERT_DEFAULT,
} from '../../types';

type Props = NativeStackScreenProps<any, 'SetBudget'>;

const PERIODS: BudgetPeriod[] = ['weekly', 'monthly', 'yearly'];
const THRESHOLDS = [50, 60, 70, 80, 90, 100];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function SetBudgetScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const editingId: string | undefined = route.params?.id;
  const { budgets, addBudget, editBudget, removeBudget, budgetById } = useBudgets();
  const { forType } = useFinanceCategories();

  const existing = editingId ? budgetById(editingId) : null;
  const expenseCategories = forType('expense').filter(c => !c.hidden);

  const [scope, setScope] = useState<string | null>(existing?.categoryKey ?? null);
  const [limit, setLimit] = useState(existing ? String(existing.limit) : '');
  const [period, setPeriod] = useState<BudgetPeriod>(existing?.period ?? 'monthly');
  const [threshold, setThreshold] = useState(existing?.alertThreshold ?? BUDGET_ALERT_DEFAULT);
  const [startDay, setStartDay] = useState<number>(
    existing?.startDay ?? (existing?.period === 'weekly' ? 0 : 1),
  );
  const [paused, setPaused] = useState(!!existing?.paused);

  const [scopeSheet, setScopeSheet] = useState(false);
  const [periodSheet, setPeriodSheet] = useState(false);
  const [thresholdSheet, setThresholdSheet] = useState(false);
  const [startSheet, setStartSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const scopeLabel = scope
    ? expenseCategories.find(c => c.key === scope)?.label ?? scope
    : 'All spending';

  const SCOPE_OPTIONS = ['All spending', ...expenseCategories.map(c => c.label)];

  /**
   * Changing period changes what a start day means — day-of-month vs
   * day-of-week — so reset it rather than carrying "the 25th" into a weekly
   * budget where only 0–6 are valid.
   */
  const changePeriod = (p: BudgetPeriod) => {
    setPeriod(p);
    setStartDay(p === 'weekly' ? 0 : 1);
  };

  const startLabel = period === 'weekly'
    ? WEEKDAYS[startDay] ?? 'Monday'
    : period === 'yearly' ? '1 January'
      : `Day ${startDay}`;

  const START_OPTIONS = period === 'weekly'
    ? WEEKDAYS
    : Array.from({ length: 28 }, (_, i) => `Day ${i + 1}`);

  /** Live preview of where this budget would stand right now. */
  const preview = (() => {
    const n = Number(limit);
    if (!Number.isFinite(n) || n <= 0) return null;
    return progressFor(
      {
        id: existing?.id ?? 'preview', userId: '', categoryKey: scope ?? undefined,
        limit: n, period, startDay, alertThreshold: threshold, createdAt: '',
      },
      [],
    );
  })();

  const onSave = async () => {
    const problem = validateBudget({
      limit: Number(limit),
      period,
      alertThreshold: threshold,
      startDay: period === 'yearly' ? undefined : startDay,
      categoryKey: scope ?? undefined,
      existing: budgets,
      editingId: editingId ?? null,
    });
    if (problem) { setErr(problem); return; }
    if (saving) return;

    setErr(null);
    setSaving(true);
    try {
      const data = {
        limit: Number(limit),
        period,
        categoryKey: scope ?? undefined,
        startDay: period === 'yearly' ? undefined : startDay,
        alertThreshold: threshold,
      };
      if (existing) await editBudget(existing.id, { ...data, paused });
      else await addBudget(data);
      navigation.goBack();
    } catch {
      setErr('Could not save. Check your connection.');
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!existing) return;
    Alert.alert(
      'Delete this budget?',
      'The limit and its alerts are removed. Your transactions are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try { await removeBudget(existing.id); navigation.goBack(); }
            catch { setErr('Could not delete. Check your connection.'); }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>{existing ? 'Edit budget' : 'Set budget'}</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Amount ── */}
        <View style={s.card}>
          <AppText style={s.cardTitle}>Budget amount</AppText>
          <View style={s.amountRow}>
            <TextInput
              style={s.amountInput as any}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#C4C4C4"
              value={limit}
              onChangeText={v => setLimit(v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
              accessibilityLabel="Budget amount"
            />
          </View>
          <AppText style={s.hint}>
            Only spending counts toward this. Income and transfers between your
            own accounts are ignored.
          </AppText>
        </View>

        {/* ── Scope ── */}
        <Row
          label="Applies to"
          value={scopeLabel}
          onPress={() => setScopeSheet(true)}
        />

        {/* ── Period ── */}
        <Row
          label="Resets"
          value={BUDGET_PERIOD_META[period].label}
          onPress={() => setPeriodSheet(true)}
        />

        {period !== 'yearly' ? (
          <Row
            label={period === 'weekly' ? 'Week starts' : 'Month starts on'}
            value={startLabel}
            onPress={() => setStartSheet(true)}
            hint={period === 'monthly'
              ? 'Set this to your payday if your month runs on a different cycle.'
              : undefined}
          />
        ) : null}

        {/* ── Alert ── */}
        <Row
          label="Warn me at"
          value={`${threshold}% of the limit`}
          onPress={() => setThresholdSheet(true)}
        />

        {preview ? (
          <View style={s.previewCard}>
            <AppText style={s.previewLabel}>This period runs</AppText>
            <AppText style={s.previewValue}>
              {preview.window.start} → {preview.window.end} ({preview.window.days} days)
            </AppText>
            <AppText style={s.previewLabel}>
              You'll be warned at {formatMoney((Number(limit) * threshold) / 100)}
            </AppText>
          </View>
        ) : null}

        {existing ? (
          <TouchableOpacity
            style={s.pauseRow}
            activeOpacity={0.85}
            onPress={() => setPaused(p => !p)}
            accessibilityRole="switch"
            accessibilityState={{ checked: paused }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText style={s.rowLabel}>Pause this budget</AppText>
              <AppText style={s.hint}>Keeps the limit but stops the warnings.</AppText>
            </View>
            <View style={[s.toggle, paused && s.toggleOn]}>
              <View style={[s.toggleThumb, paused && s.toggleThumbOn]} />
            </View>
          </TouchableOpacity>
        ) : null}

        {err ? (
          <View style={s.errBanner}>
            <AppText variant="caption" color={Colors.error}>{err}</AppText>
          </View>
        ) : null}

        <TouchableOpacity style={s.saveBtn} activeOpacity={0.9} disabled={saving} onPress={onSave}>
          <AppText style={s.saveText}>{saving ? 'Saving…' : 'Save Budget'}</AppText>
        </TouchableOpacity>

        {existing ? (
          <TouchableOpacity style={s.deleteBtn} activeOpacity={0.9} onPress={onDelete}>
            <AppText style={s.deleteText}>Delete budget</AppText>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <PickerSheet
        visible={scopeSheet} title="Applies to" options={SCOPE_OPTIONS}
        value={scopeLabel}
        onSelect={label => {
          if (label === 'All spending') { setScope(null); return; }
          setScope(expenseCategories.find(c => c.label === label)?.key ?? null);
        }}
        onClose={() => setScopeSheet(false)}
      />
      <PickerSheet
        visible={periodSheet} title="Resets"
        options={PERIODS.map(p => BUDGET_PERIOD_META[p].label)}
        value={BUDGET_PERIOD_META[period].label}
        onSelect={label => {
          const hit = PERIODS.find(p => BUDGET_PERIOD_META[p].label === label);
          if (hit) changePeriod(hit);
        }}
        onClose={() => setPeriodSheet(false)}
      />
      <PickerSheet
        visible={startSheet} title={period === 'weekly' ? 'Week starts' : 'Month starts on'}
        options={START_OPTIONS}
        value={startLabel}
        onSelect={label => {
          const i = START_OPTIONS.indexOf(label);
          if (i >= 0) setStartDay(period === 'weekly' ? i : i + 1);
        }}
        onClose={() => setStartSheet(false)}
      />
      <PickerSheet
        visible={thresholdSheet} title="Warn me at"
        options={THRESHOLDS.map(t => `${t}% of the limit`)}
        value={`${threshold}% of the limit`}
        onSelect={label => {
          const n = parseInt(label, 10);
          if (Number.isFinite(n)) setThreshold(n);
        }}
        onClose={() => setThresholdSheet(false)}
      />
    </SafeAreaView>
  );
}

function Row({
  label, value, onPress, hint,
}: {
  label: string; value: string; onPress: () => void; hint?: string;
}) {
  return (
    <TouchableOpacity style={s.row} activeOpacity={0.85} onPress={onPress}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText style={s.rowLabel}>{label}</AppText>
        {hint ? <AppText style={s.hint}>{hint}</AppText> : null}
      </View>
      <AppText style={s.rowValue} numberOfLines={1}>{value}</AppText>
    </TouchableOpacity>
  );
}

const HAIRLINE = 'rgba(153,153,153,0.20)';

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

  card: {
    padding: 16, borderRadius: 20, gap: 8,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE,
  },
  cardTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 15, color: '#141414' },
  amountRow: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: HAIRLINE,
  },
  amountInput: {
    padding: 0, fontFamily: 'DMSans-Bold', fontSize: 28, color: '#141414',
  } as any,
  hint: { fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 17, color: '#9CA3AF' },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    padding: 16, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE,
  },
  rowLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 15, color: '#141414' },
  rowValue: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#4F46E5', flexShrink: 1, textAlign: 'right' },

  previewCard: {
    padding: 14, borderRadius: 16, gap: 4, backgroundColor: '#F5F5FF',
  },
  previewLabel: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#6B7280' },
  previewValue: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#141414' },

  pauseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE,
  },
  toggle: {
    width: 50, height: 28, borderRadius: 26, padding: 3, justifyContent: 'center',
    backgroundColor: Colors.white, borderWidth: 1, borderColor: 'rgba(153,153,153,0.30)',
  },
  toggleOn: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#999999' },
  toggleThumbOn: { alignSelf: 'flex-end', backgroundColor: Colors.white },

  errBanner: { backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12 },

  saveBtn: {
    marginTop: 4, paddingVertical: 18, borderRadius: 9999,
    backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center',
  },
  saveText: { fontFamily: 'DMSans-SemiBold', fontSize: 17, color: Colors.white },
  deleteBtn: {
    paddingVertical: 16, borderRadius: 9999, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: 'rgba(220,38,38,0.35)',
  },
  deleteText: { fontFamily: 'DMSans-SemiBold', fontSize: 15, color: '#DC2626' },
});
