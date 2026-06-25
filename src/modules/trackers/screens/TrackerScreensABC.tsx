/**
 * SleepTrackerScreen.tsx
 * HabitTrackerScreen.tsx
 * PeriodTrackerScreen.tsx
 *
 * Exported from one file to keep the zip clean.
 */
import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal, Platform, FlatList,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import DateTimePicker     from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useSleepTracker, useHabitTracker, usePeriodTracker } from '../hooks/useTrackers';
import { HabitRow }        from '../components/HabitRow';
import { CycleCalendar }   from '../components/CycleCalendar';
import { WeeklyBarChart }  from '../components/TrackerCharts';
import { MoodSelector }    from '../components/MoodSelector';
import { AppHeader }       from '../../../shared/components/AppHeader';
import { AppText }         from '../../../shared/components/AppText';
import { AppButton }       from '../../../shared/components/AppButton';
import { AppCard }         from '../../../shared/components/AppCard';
import { AppInput }        from '../../../shared/components/AppInput';
import { AppEmptyState }   from '../../../shared/components/AppEmptyState';
import { Colors }          from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { FontFamily }      from '../../../shared/theme/typography';
import { MoodLevel, FlowLevel } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// SLEEP TRACKER
// ─────────────────────────────────────────────────────────────────────────────
type SleepProps = NativeStackScreenProps<any, 'SleepTracker'>;

export function SleepTrackerScreen({ navigation }: SleepProps) {
  const { entries, logSleep, avgHours } = useSleepTracker();
  const today     = new Date().toISOString().split('T')[0];
  const todayEntry = entries.find(e => e.date === today);

  const [bedtime,  setBedtime]  = useState(new Date(new Date().setHours(22, 30, 0, 0)));
  const [wakeTime, setWakeTime] = useState(new Date(new Date().setHours(6, 30, 0, 0)));
  const [quality,  setQuality]  = useState<MoodLevel | undefined>(undefined);
  const [saving,   setSaving]   = useState(false);
  const [showBed,  setShowBed]  = useState(false);
  const [showWake, setShowWake] = useState(false);

  const durMins = Math.abs(wakeTime.getTime() - bedtime.getTime()) / 60000;
  const durHrs  = (durMins / 60).toFixed(1);

  const fmtTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const save = async () => {
    if (!quality) { Alert.alert('Rate your sleep quality first.'); return; }
    setSaving(true);
    try {
      // Wake is next morning — adjust date
      const wakeDate = new Date(wakeTime);
      if (wakeTime < bedtime) wakeDate.setDate(wakeDate.getDate() + 1);
      await logSleep(today, bedtime.toISOString(), wakeDate.toISOString(), quality);
      Alert.alert('✅ Sleep logged!');
    } finally {
      setSaving(false);
    }
  };

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split('T')[0];
    const e  = entries.find(en => en.date === ds);
    return {
      label: d.toLocaleDateString('en-IN', { weekday: 'narrow' }),
      value: e ? Math.round(e.durationMins / 60) : 0,
      color: e && e.durationMins >= 420 ? Colors.trackers : Colors.warning,
    };
  });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader title="Sleep Tracker" leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()} accentColor="#7B1FA2" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <AppCard style={s.logCard}>
          <AppText variant="headingSmall" color={Colors.textPrimary}>Last night's sleep</AppText>
          <View style={s.timeRow}>
            <TouchableOpacity style={s.timeBtn} onPress={() => setShowBed(true)}>
              <AppText variant="caption" color={Colors.textMuted}>Bedtime</AppText>
              <AppText variant="headingMedium" color="#7B1FA2">🌙 {fmtTime(bedtime)}</AppText>
            </TouchableOpacity>
            <AppText variant="headingLarge" color={Colors.textMuted}>→</AppText>
            <TouchableOpacity style={s.timeBtn} onPress={() => setShowWake(true)}>
              <AppText variant="caption" color={Colors.textMuted}>Wake time</AppText>
              <AppText variant="headingMedium" color={Colors.warning}>☀️ {fmtTime(wakeTime)}</AppText>
            </TouchableOpacity>
          </View>
          <View style={s.durBadge}>
            <AppText variant="headingLarge" color="#7B1FA2">{durHrs}h</AppText>
            <AppText variant="caption" color={Colors.textMuted}>total sleep</AppText>
          </View>
          <AppText variant="label" color={Colors.textSecondary}>Sleep quality</AppText>
          <MoodSelector selected={quality} onSelect={(l) => setQuality(l)} size="md" />
          <AppButton label={todayEntry ? 'Update' : 'Log sleep'} onPress={save} loading={saving}
            disabled={!quality} variant="primary" size="lg" fullWidth
            style={{ backgroundColor: '#7B1FA2' }} />
        </AppCard>

        {showBed && (
          <DateTimePicker value={bedtime} mode="time" onChange={(_, d) => { setShowBed(false); if (d) setBedtime(d); }} />
        )}
        {showWake && (
          <DateTimePicker value={wakeTime} mode="time" onChange={(_, d) => { setShowWake(false); if (d) setWakeTime(d); }} />
        )}

        <AppCard>
          <View style={s.row}><AppText variant="headingSmall" color={Colors.textPrimary}>7-Day Sleep</AppText>
            {avgHours && <AppText variant="headingSmall" color="#7B1FA2">Avg {avgHours}h</AppText>}</View>
          <WeeklyBarChart data={last7} maxValue={10} unit="h" color="#7B1FA2" />
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HABIT TRACKER
// ─────────────────────────────────────────────────────────────────────────────
type HabitProps = NativeStackScreenProps<any, 'HabitTracker'>;

const HABIT_ICONS = ['💧', '🏃', '📚', '🧘', '🥗', '😴', '🚶', '✍️', '🧹', '💊', '🎯', '🎨'];
const HABIT_COLORS = ['#2979FF', '#E91E63', '#00897B', '#F57C00', '#7B1FA2', '#43A047', '#D32F2F', '#0288D1'];

export function HabitTrackerScreen({ navigation }: HabitProps) {
  const { habits, toggle, isCompleted, todayCompleted, addNewHabit, removeHabit } = useHabitTracker();
  const today = new Date().toISOString().split('T')[0];
  const [showModal, setShowModal] = useState(false);
  const [name,  setName]  = useState('');
  const [icon,  setIcon]  = useState(HABIT_ICONS[0]);
  const [color, setColor] = useState(HABIT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) { Alert.alert('Enter a habit name.'); return; }
    setSaving(true);
    try {
      await addNewHabit(name.trim(), icon, color);
      setShowModal(false); setName(''); setIcon(HABIT_ICONS[0]); setColor(HABIT_COLORS[0]);
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader title="Habits" leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()} accentColor={Colors.trackers}
        rightIcon={<AppText style={{ fontSize: 26 }}>+</AppText>} onRightPress={() => setShowModal(true)} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {habits.length > 0 && (
          <View style={s.progressHeader}>
            <AppText variant="headingSmall" color={Colors.textPrimary}>
              Today — {todayCompleted}/{habits.length} done
            </AppText>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${habits.length ? (todayCompleted / habits.length) * 100 : 0}%` }]} />
            </View>
          </View>
        )}

        <View style={s.habitList}>
          {habits.length === 0 ? (
            <AppEmptyState emoji="✅" title="No habits yet"
              subtitle="Build your first habit to start tracking consistency."
              actionLabel="Add habit" onAction={() => setShowModal(true)} />
          ) : (
            habits.map(habit => (
              <HabitRow key={habit.id} habit={habit}
                completed={isCompleted(habit.id, today)}
                onToggle={() => toggle(habit.id, today)}
                onLongPress={() => Alert.alert(habit.name, undefined, [
                  { text: 'Delete', style: 'destructive', onPress: () => removeHabit(habit.id) },
                  { text: 'Cancel', style: 'cancel' },
                ])}
              />
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <AppText variant="headingMedium" color={Colors.textPrimary}>New Habit</AppText>
            <AppInput value={name} onChangeText={setName} placeholder="Habit name e.g. Drink water" label="Name" />
            <AppText variant="label" color={Colors.textSecondary}>Icon</AppText>
            <View style={s.iconGrid}>
              {HABIT_ICONS.map(ic => (
                <TouchableOpacity key={ic} style={[s.iconBtn, icon === ic && s.iconBtnActive]}
                  onPress={() => setIcon(ic)}>
                  <AppText style={{ fontSize: 22 }}>{ic}</AppText>
                </TouchableOpacity>
              ))}
            </View>
            <AppText variant="label" color={Colors.textSecondary}>Color</AppText>
            <View style={s.colorRow}>
              {HABIT_COLORS.map(c => (
                <TouchableOpacity key={c} style={[s.colorSwatch, { backgroundColor: c },
                  color === c && { borderWidth: 3, borderColor: Colors.white, transform: [{ scale: 1.2 }] }]}
                  onPress={() => setColor(c)} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <AppButton label="Cancel" onPress={() => setShowModal(false)} variant="ghost" size="md" style={{ flex: 1 }} />
              <AppButton label="Add Habit" onPress={handleAdd} loading={saving} variant="primary" size="md"
                style={{ flex: 1, backgroundColor: Colors.trackers }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PERIOD TRACKER
// ─────────────────────────────────────────────────────────────────────────────
type PeriodProps = NativeStackScreenProps<any, 'PeriodTracker'>;

const SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Fatigue', 'Mood swings', 'Back pain', 'Nausea', 'Spotting'];
const FLOW_LEVELS: { level: FlowLevel; label: string; emoji: string }[] = [
  { level: 'spotting', label: 'Spotting', emoji: '🩸' },
  { level: 'light',   label: 'Light',    emoji: '🩸🩸' },
  { level: 'medium',  label: 'Medium',   emoji: '🩸🩸🩸' },
  { level: 'heavy',   label: 'Heavy',    emoji: '🩸🩸🩸🩸' },
];

export function PeriodTrackerScreen({ navigation }: PeriodProps) {
  const { entries, activePeriod, startPeriod, endPeriod, prediction } = usePeriodTracker();
  const [flow,         setFlow]         = useState<FlowLevel>('medium');
  const [symptoms,     setSymptoms]     = useState<string[]>([]);
  const [notes,        setNotes]        = useState('');
  const [saving,       setSaving]       = useState(false);

  const toggleSymptom = (s: string) =>
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const daysToNext = prediction.nextStart
    ? Math.ceil((new Date(prediction.nextStart).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader title="Period Tracker" leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()} accentColor="#E91E63" />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Cycle prediction banner */}
        {!activePeriod && prediction.nextStart && (
          <View style={[s.predictionBanner, { borderColor: '#E91E63' + '40' }]}>
            <AppText style={{ fontSize: 32 }}>🌸</AppText>
            <View style={{ flex: 1 }}>
              <AppText variant="headingSmall" color={Colors.textPrimary}>
                Next period in {daysToNext} day{daysToNext !== 1 ? 's' : ''}
              </AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                Predicted: {new Date(prediction.nextStart + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                  · Avg cycle {prediction.cycleLength} days
              </AppText>
            </View>
          </View>
        )}

        {/* Active period card */}
        {activePeriod ? (
          <AppCard style={{ gap: Spacing.md }}>
            <View style={s.row}>
              <AppText variant="headingSmall" color={Colors.textPrimary}>🌸 Period ongoing</AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                Started {new Date(activePeriod.startDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </AppText>
            </View>
            <AppButton label="End period" onPress={() => endPeriod(activePeriod.id)}
              variant="secondary" size="md" fullWidth />
          </AppCard>
        ) : (
          <AppCard style={s.logCard}>
            <AppText variant="headingSmall" color={Colors.textPrimary}>Log period</AppText>
            <AppText variant="label" color={Colors.textSecondary}>Flow</AppText>
            <View style={s.flowRow}>
              {FLOW_LEVELS.map(fl => (
                <TouchableOpacity key={fl.level} style={[s.flowBtn, flow === fl.level && s.flowBtnActive]}
                  onPress={() => setFlow(fl.level)}>
                  <AppText style={{ fontSize: 11 }}>{fl.emoji}</AppText>
                  <AppText variant="caption" color={flow === fl.level ? Colors.white : Colors.textSecondary}>{fl.label}</AppText>
                </TouchableOpacity>
              ))}
            </View>
            <AppText variant="label" color={Colors.textSecondary}>Symptoms</AppText>
            <View style={s.symptomsGrid}>
              {SYMPTOMS.map(sym => (
                <TouchableOpacity key={sym} style={[s.symPill, symptoms.includes(sym) && s.symPillActive]}
                  onPress={() => toggleSymptom(sym)}>
                  <AppText variant="caption" color={symptoms.includes(sym) ? Colors.white : Colors.textSecondary}>
                    {sym}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
            <AppButton label="Start period" loading={saving}
              onPress={async () => { setSaving(true); try { await startPeriod(flow, symptoms, notes || undefined); } finally { setSaving(false); } }}
              variant="primary" size="lg" fullWidth style={{ backgroundColor: '#E91E63' }} />
          </AppCard>
        )}

        {/* Calendar */}
        <AppCard>
          <AppText variant="headingSmall" color={Colors.textPrimary} style={{ marginBottom: Spacing.sm }}>
            Cycle Calendar
          </AppText>
          <CycleCalendar entries={entries} nextPeriod={prediction.nextStart} onDayPress={() => {}} />
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bgApp },
  scroll:  { padding: Spacing.base, gap: Spacing.md, paddingBottom: 40 },
  logCard: { gap: Spacing.sm },
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeBtn: { alignItems: 'center', gap: 4, flex: 1 },
  durBadge:{ alignItems: 'center', gap: 2, paddingVertical: Spacing.sm },
  progressHeader: { gap: 8, backgroundColor: Colors.bgCard, padding: Spacing.base, borderRadius: Radius.lg },
  progressBar: { height: 8, backgroundColor: Colors.bgInput, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.trackers, borderRadius: 4 },
  habitList:{ backgroundColor: Colors.bgCard, borderRadius: Radius.lg, overflow: 'hidden' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.base, gap: Spacing.md,
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: Colors.bgInput, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  iconBtnActive: { borderColor: Colors.trackers, backgroundColor: Colors.trackers + '15' },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorSwatch: { width: 30, height: 30, borderRadius: 15 },
  predictionBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: '#FCE4EC', borderRadius: Radius.lg,
    padding: Spacing.base, borderWidth: 1.5,
  },
  flowRow: { flexDirection: 'row', gap: 8 },
  flowBtn: {
    flex: 1, alignItems: 'center', gap: 3, padding: 8,
    backgroundColor: Colors.bgInput, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  flowBtnActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
  symptomsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symPill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full, backgroundColor: Colors.bgInput,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  symPillActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
});
