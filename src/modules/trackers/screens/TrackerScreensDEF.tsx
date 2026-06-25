import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Alert, TextInput, FlatList,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  useHealthTracker, useExpenseTracker,
  useInsights, useMilestones,
  useMoodTracker, useSleepTracker, useHabitTracker,
} from '../hooks/useTrackers';
import { WeeklyBarChart, ProgressRing, MilestoneBadge } from '../components/TrackerCharts';
import { AppHeader }      from '../../../shared/components/AppHeader';
import { AppText }        from '../../../shared/components/AppText';
import { AppButton }      from '../../../shared/components/AppButton';
import { AppCard }        from '../../../shared/components/AppCard';
import { AppInput }       from '../../../shared/components/AppInput';
import { AppEmptyState }  from '../../../shared/components/AppEmptyState';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { Colors }         from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { FontFamily }     from '../../../shared/theme/typography';
import { ExpenseCategory } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH TRACKER
// ─────────────────────────────────────────────────────────────────────────────
type HealthProps = NativeStackScreenProps<any, 'HealthTracker'>;

export function HealthTrackerScreen({ navigation }: HealthProps) {
  const { entries, logHealth, todayEntry, avgSteps } = useHealthTracker();
  const [steps,    setSteps]    = useState(todayEntry?.steps?.toString()    ?? '');
  const [water,    setWater]    = useState(todayEntry?.waterMl?.toString()  ?? '');
  const [weight,   setWeight]   = useState(todayEntry?.weight?.toString()   ?? '');
  const [calories, setCalories] = useState(todayEntry?.calories?.toString() ?? '');
  const [saving,   setSaving]   = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await logHealth({
        steps:    steps    ? parseInt(steps)    : undefined,
        waterMl:  water    ? parseInt(water)    : undefined,
        weight:   weight   ? parseFloat(weight) : undefined,
        calories: calories ? parseInt(calories) : undefined,
      });
      Alert.alert('✅ Health data saved!');
    } finally { setSaving(false); }
  };

  const stepsChartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split('T')[0];
    const e  = entries.find(en => en.date === ds);
    return {
      label: d.toLocaleDateString('en-IN', { weekday: 'narrow' }),
      value: e?.steps ?? 0,
      color: (e?.steps ?? 0) >= 8000 ? Colors.trackers : Colors.info,
    };
  });

  const metrics = [
    { icon: '🦶', label: 'Steps today', value: todayEntry?.steps?.toLocaleString() ?? '—', target: '8,000', color: Colors.info },
    { icon: '💧', label: 'Water (ml)',  value: todayEntry?.waterMl?.toString() ?? '—',     target: '2,500', color: '#0288D1' },
    { icon: '⚖️', label: 'Weight (kg)', value: todayEntry?.weight?.toString() ?? '—',      target: '',      color: Colors.trackers },
    { icon: '🔥', label: 'Calories',   value: todayEntry?.calories?.toString() ?? '—',     target: '2,000', color: Colors.warning },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader title="Health" leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()} accentColor={Colors.info} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Metrics grid */}
        <View style={s.metricsGrid}>
          {metrics.map(m => (
            <View key={m.label} style={[s.metricCard, { borderColor: m.color + '40' }]}>
              <AppText style={{ fontSize: 26 }}>{m.icon}</AppText>
              <AppText variant="headingMedium" color={m.color}>{m.value}</AppText>
              <AppText variant="caption" color={Colors.textMuted}>{m.label}</AppText>
              {m.target && <AppText style={{ fontSize: 9, color: Colors.textLight }}>Goal: {m.target}</AppText>}
            </View>
          ))}
        </View>

        {/* Log form */}
        <AppCard style={{ gap: Spacing.md }}>
          <AppText variant="headingSmall" color={Colors.textPrimary}>Log today</AppText>
          <View style={s.inputGrid}>
            <AppInput label="Steps" value={steps} onChangeText={setSteps}
              keyboardType="number-pad" placeholder="e.g. 8000" style={s.halfInput} />
            <AppInput label="Water (ml)" value={water} onChangeText={setWater}
              keyboardType="number-pad" placeholder="e.g. 2000" style={s.halfInput} />
            <AppInput label="Weight (kg)" value={weight} onChangeText={setWeight}
              keyboardType="decimal-pad" placeholder="e.g. 62.5" style={s.halfInput} />
            <AppInput label="Calories" value={calories} onChangeText={setCalories}
              keyboardType="number-pad" placeholder="e.g. 1800" style={s.halfInput} />
          </View>
          <AppButton label="Save" onPress={save} loading={saving} variant="primary" size="lg" fullWidth
            style={{ backgroundColor: Colors.info }} />
        </AppCard>

        <AppCard>
          <View style={s.row}>
            <AppText variant="headingSmall" color={Colors.textPrimary}>Steps (7 days)</AppText>
            {avgSteps && <AppText variant="caption" color={Colors.info}>Avg {avgSteps?.toLocaleString()}</AppText>}
          </View>
          <WeeklyBarChart data={stepsChartData} maxValue={12000} color={Colors.info} />
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSE TRACKER
// ─────────────────────────────────────────────────────────────────────────────
type ExpenseProps = NativeStackScreenProps<any, 'ExpenseTracker'>;

const EXPENSE_CATS: { key: ExpenseCategory; emoji: string; label: string }[] = [
  { key: 'food',          emoji: '🍔', label: 'Food'          },
  { key: 'shopping',      emoji: '🛍️', label: 'Shopping'      },
  { key: 'transport',     emoji: '🚗', label: 'Transport'     },
  { key: 'health',        emoji: '💊', label: 'Health'        },
  { key: 'entertainment', emoji: '🎬', label: 'Entertainment' },
  { key: 'beauty',        emoji: '💄', label: 'Beauty'        },
  { key: 'education',     emoji: '📚', label: 'Education'     },
  { key: 'other',         emoji: '📦', label: 'Other'         },
];

export function ExpenseTrackerScreen({ navigation }: ExpenseProps) {
  const { expenses, addExpense, removeExpense, totalMonth, byCategory } = useExpenseTracker();
  const [amount,   setAmount]   = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [note,     setNote]     = useState('');
  const [saving,   setSaving]   = useState(false);

  const save = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { Alert.alert('Enter a valid amount.'); return; }
    setSaving(true);
    try {
      await addExpense(amt, category, note.trim() || undefined);
      setAmount(''); setNote('');
      Alert.alert('✅ Expense added');
    } finally { setSaving(false); }
  };

  const chartData = EXPENSE_CATS.map(c => ({
    label: c.emoji,
    value: Math.round(byCategory[c.key] ?? 0),
    color: '#' + Math.floor(Math.abs(Math.sin(c.key.charCodeAt(0)) * 16777215)).toString(16).padStart(6, '0').slice(0, 6),
  })).filter(d => d.value > 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader title="Expenses" leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()} accentColor={Colors.warning} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <AppCard>
          <View style={s.totalRow}>
            <AppText variant="headingLarge" color={Colors.warning}>₹{totalMonth.toFixed(0)}</AppText>
            <AppText variant="caption" color={Colors.textMuted}>This month</AppText>
          </View>
          {chartData.length > 0 && <WeeklyBarChart data={chartData} unit="" color={Colors.warning} />}
        </AppCard>

        {/* Add expense */}
        <AppCard style={{ gap: Spacing.md }}>
          <AppText variant="headingSmall" color={Colors.textPrimary}>Add expense</AppText>
          <AppInput label="Amount (₹)" value={amount} onChangeText={setAmount}
            keyboardType="decimal-pad" placeholder="0.00" />
          <AppText variant="label" color={Colors.textSecondary}>Category</AppText>
          <View style={s.catGrid}>
            {EXPENSE_CATS.map(c => (
              <TouchableOpacity key={c.key} style={[s.catBtn, category === c.key && s.catBtnActive]}
                onPress={() => setCategory(c.key)}>
                <AppText style={{ fontSize: 18 }}>{c.emoji}</AppText>
                <AppText style={{ fontSize: 9, fontFamily: FontFamily.regular, color: category === c.key ? Colors.white : Colors.textMuted }}>
                  {c.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
          <AppInput label="Note (optional)" value={note} onChangeText={setNote} placeholder="What was this for?" />
          <AppButton label="Add Expense" onPress={save} loading={saving} variant="primary" size="lg" fullWidth
            style={{ backgroundColor: Colors.warning }} />
        </AppCard>

        {/* Recent */}
        <AppCard>
          <AppText variant="headingSmall" color={Colors.textPrimary} style={{ marginBottom: Spacing.sm }}>Recent</AppText>
          {expenses.slice(0, 15).map(exp => {
            const cat = EXPENSE_CATS.find(c => c.key === exp.category);
            return (
              <TouchableOpacity key={exp.id} style={s.expRow}
                onLongPress={() => Alert.alert('Delete?', undefined, [
                  { text: 'Delete', style: 'destructive', onPress: () => removeExpense(exp.id) },
                  { text: 'Cancel', style: 'cancel' },
                ])}>
                <AppText style={{ fontSize: 22, width: 30 }}>{cat?.emoji}</AppText>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" color={Colors.textPrimary}>{cat?.label}</AppText>
                  {exp.note && <AppText variant="caption" color={Colors.textMuted}>{exp.note}</AppText>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="headingSmall" color={Colors.warning}>₹{exp.amount.toFixed(0)}</AppText>
                  <AppText variant="caption" color={Colors.textMuted}>{exp.date}</AppText>
                </View>
              </TouchableOpacity>
            );
          })}
          {expenses.length === 0 && (
            <AppEmptyState emoji="💸" title="No expenses yet" subtitle="Log your first expense above." />
          )}
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INSIGHTS DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
type InsightsProps = NativeStackScreenProps<any, 'InsightsDashboard'>;

export function InsightsDashboardScreen({ navigation }: InsightsProps) {
  const { insights, loading, generate } = useInsights();
  useEffect(() => { generate(); }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader title="Insights" leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()} accentColor={Colors.trackers}
        rightIcon={<AppText style={{ fontSize: 20 }}>🔄</AppText>} onRightPress={generate} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <AppLoadingSpinner fullscreen message="Analysing your week…" color={Colors.trackers} />
        ) : insights.length > 0 ? (
          insights.map((ins, i) => (
            <View key={i} style={s.insightCard}>
              <AppText variant="body" color={Colors.textPrimary} style={{ lineHeight: 24 }}>{ins}</AppText>
            </View>
          ))
        ) : (
          <AppEmptyState emoji="💡" title="No insights yet"
            subtitle="Keep logging for a few days to unlock your weekly insights." />
        )}
        <AppButton label="AI Insights →" onPress={() => navigation.navigate('AIInsights')}
          variant="secondary" size="md" fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONES SCREEN
// ─────────────────────────────────────────────────────────────────────────────
type MilestonesProps = NativeStackScreenProps<any, 'Milestones'>;

export function MilestonesScreen({ navigation }: MilestonesProps) {
  const { milestones } = useMilestones();
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader title="Milestones" leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()} accentColor={Colors.premium} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {milestones.length === 0 ? (
          <AppEmptyState emoji="🏆" title="No milestones yet"
            subtitle="Keep logging your trackers daily to earn your first milestone!" />
        ) : (
          <View style={s.badgeGrid}>
            {milestones.map(m => (
              <MilestoneBadge key={m.id} emoji={m.emoji} title={m.title} desc={m.description} earnedAt={m.earnedAt} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS SCREEN
// ─────────────────────────────────────────────────────────────────────────────
type ProgressProps = NativeStackScreenProps<any, 'Progress'>;

export function ProgressScreen({ navigation }: ProgressProps) {
  const { entries: mood }         = useMoodTracker();
  const { entries: sleep }        = useSleepTracker();
  const { habits, habitLogs }     = useHabitTracker();

  const moodStreak   = countStreak(mood.map(e => e.date));
  const sleepStreak  = countStreak(sleep.map(e => e.date));
  const habitRate    = habits.length && habitLogs.length
    ? Math.round((habitLogs.filter(l => l.completed).length / (habits.length * 30)) * 100)
    : 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader title="Progress" leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()} accentColor={Colors.trackers} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.ringRow}>
          <ProgressRing progress={Math.min(moodStreak / 30, 1)} color="#FF7043"
            label={`${moodStreak}d`} sublabel="Mood" />
          <ProgressRing progress={Math.min(sleepStreak / 30, 1)} color="#7B1FA2"
            label={`${sleepStreak}d`} sublabel="Sleep" />
          <ProgressRing progress={habitRate / 100} color={Colors.trackers}
            label={`${habitRate}%`} sublabel="Habits" />
        </View>

        <AppCard>
          <AppText variant="headingSmall" color={Colors.textPrimary} style={{ marginBottom: Spacing.sm }}>
            30-day overview
          </AppText>
          <View style={s.statList}>
            {[
              { label: 'Mood entries logged',  value: mood.length,        color: '#FF7043' },
              { label: 'Sleep sessions logged', value: sleep.length,       color: '#7B1FA2' },
              { label: 'Habits completed',      value: habitLogs.filter(l => l.completed).length, color: Colors.trackers },
              { label: 'Active habits',         value: habits.length,      color: Colors.info },
            ].map(stat => (
              <View key={stat.label} style={s.statRow2}>
                <AppText variant="body" color={Colors.textSecondary}>{stat.label}</AppText>
                <AppText variant="headingSmall" color={stat.color}>{stat.value}</AppText>
              </View>
            ))}
          </View>
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function countStreak(dates: string[]): number {
  const sorted = [...new Set(dates)].sort().reverse();
  let streak = 0;
  const check = new Date();
  for (const date of sorted) {
    if (date === check.toISOString().split('T')[0]) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else break;
  }
  return streak;
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bgApp },
  scroll:  { padding: Spacing.base, gap: Spacing.md, paddingBottom: 40 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalRow:{ alignItems: 'center', gap: 4, paddingBottom: Spacing.sm },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metricCard: {
    width: '47%', backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    padding: Spacing.md, gap: 4, borderWidth: 1.5,
    alignItems: 'center',
  },
  inputGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  halfInput:   { width: '47%' },
  catGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: {
    width: 68, alignItems: 'center', gap: 3, padding: 8,
    backgroundColor: Colors.bgInput, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  catBtnActive: { backgroundColor: Colors.warning, borderColor: Colors.warning },
  expRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  insightCard: {
    backgroundColor: Colors.trackers + '10',
    borderRadius: Radius.lg, padding: Spacing.base,
    borderWidth: 1, borderColor: Colors.trackers + '30',
  },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.base },
  ringRow:   { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: Spacing.md },
  statList:  { gap: Spacing.sm },
  statRow2:  {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
});
