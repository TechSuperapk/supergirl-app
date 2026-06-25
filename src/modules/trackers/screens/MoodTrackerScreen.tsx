import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert,
} from 'react-native';
import { SafeAreaView }    from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useMoodTracker }  from '../hooks/useTrackers';
import { MoodSelector, MoodBar, MOOD_OPTIONS } from '../components/MoodSelector';
import { WeeklyBarChart }  from '../components/TrackerCharts';
import { AppHeader }       from '../../../shared/components/AppHeader';
import { AppText }         from '../../../shared/components/AppText';
import { AppButton }       from '../../../shared/components/AppButton';
import { AppCard }         from '../../../shared/components/AppCard';
import { Colors }          from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { FontFamily }      from '../../../shared/theme/typography';
import { MoodLevel }       from '../types';

type Props = NativeStackScreenProps<any, 'MoodTracker'>;

const ENERGY_LABELS: Record<MoodLevel, string> = { 1: '😴', 2: '🥱', 3: '😐', 4: '⚡', 5: '🔥' };

export function MoodTrackerScreen({ navigation }: Props) {
  const { entries, logMood, todayEntry, avgMood } = useMoodTracker();

  const [selectedMood,   setSelectedMood]   = useState<MoodLevel | undefined>(todayEntry?.mood);
  const [selectedEmoji,  setSelectedEmoji]  = useState(todayEntry?.emoji ?? '');
  const [selectedEnergy, setSelectedEnergy] = useState<MoodLevel | undefined>(todayEntry?.energy);
  const [notes,          setNotes]          = useState(todayEntry?.notes ?? '');
  const [saving,         setSaving]         = useState(false);

  const handleSave = async () => {
    if (!selectedMood || !selectedEnergy) {
      Alert.alert('Select mood and energy first.'); return;
    }
    setSaving(true);
    try {
      await logMood(selectedMood, selectedEmoji, selectedEnergy, notes.trim() || undefined);
      Alert.alert('✅ Logged!', 'Your mood has been saved.');
    } finally {
      setSaving(false);
    }
  };

  // Chart data — last 7 days
  const last7Dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  const chartData = last7Dates.map(date => {
    const entry = entries.find(e => e.date === date);
    const d     = new Date(date + 'T00:00:00');
    return {
      label: d.toLocaleDateString('en-IN', { weekday: 'narrow' }),
      value: entry?.mood ?? 0,
      color: entry ? (MOOD_OPTIONS.find(o => o.level === entry.mood)?.color ?? Colors.trackers) : Colors.bgInput,
    };
  });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader
        title="Mood Tracker"
        leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()}
        accentColor="#FF7043"
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Today's log card */}
        <AppCard style={s.logCard}>
          <AppText variant="headingSmall" color={Colors.textPrimary}>How are you feeling today?</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </AppText>

          <AppText variant="label" color={Colors.textSecondary} style={{ marginTop: Spacing.sm }}>Mood</AppText>
          <MoodSelector
            selected={selectedMood}
            onSelect={(level, emoji) => { setSelectedMood(level); setSelectedEmoji(emoji); }}
            size="lg"
          />

          <AppText variant="label" color={Colors.textSecondary} style={{ marginTop: Spacing.sm }}>Energy level</AppText>
          <View style={s.energyRow}>
            {([1, 2, 3, 4, 5] as MoodLevel[]).map(lvl => (
              <TouchableOpacity
                key={lvl}
                style={[s.energyBtn, selectedEnergy === lvl && s.energyBtnActive]}
                onPress={() => setSelectedEnergy(lvl)}
              >
                <AppText style={{ fontSize: 22 }}>{ENERGY_LABELS[lvl]}</AppText>
              </TouchableOpacity>
            ))}
          </View>

          <AppText variant="label" color={Colors.textSecondary} style={{ marginTop: Spacing.sm }}>
            Notes (optional)
          </AppText>
          <TextInput
            style={s.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="What's on your mind?"
            placeholderTextColor={Colors.textLight}
            multiline
            numberOfLines={3}
          />

          <AppButton
            label={todayEntry ? 'Update mood' : 'Save mood'}
            onPress={handleSave}
            loading={saving}
            disabled={!selectedMood || !selectedEnergy}
            variant="primary"
            size="lg"
            fullWidth
            style={{ backgroundColor: '#FF7043' }}
          />
        </AppCard>

        {/* 7-day chart */}
        <AppCard>
          <View style={s.statRow}>
            <AppText variant="headingSmall" color={Colors.textPrimary}>7-Day Mood</AppText>
            {avgMood && (
              <AppText variant="headingSmall" color="#FF7043">Avg {avgMood}/5</AppText>
            )}
          </View>
          <WeeklyBarChart data={chartData} maxValue={5} height={120} color="#FF7043" />
        </AppCard>

        {/* Recent history */}
        <AppCard>
          <AppText variant="headingSmall" color={Colors.textPrimary} style={{ marginBottom: Spacing.sm }}>
            History
          </AppText>
          {entries.slice(0, 10).map(entry => {
            const opt = MOOD_OPTIONS.find(o => o.level === entry.mood);
            const d   = new Date(entry.date + 'T00:00:00');
            return (
              <View key={entry.id} style={s.historyRow}>
                <AppText style={{ fontSize: 22, width: 30 }}>{opt?.emoji}</AppText>
                <View style={{ flex: 1 }}>
                  <AppText variant="body" color={Colors.textPrimary}>
                    {opt?.label}
                  </AppText>
                  {entry.notes && (
                    <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
                      {entry.notes}
                    </AppText>
                  )}
                </View>
                <AppText variant="caption" color={Colors.textMuted}>
                  {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </AppText>
              </View>
            );
          })}
          {entries.length === 0 && (
            <AppText variant="bodySmall" color={Colors.textMuted} align="center">
              No entries yet. Log your first mood above!
            </AppText>
          )}
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bgApp },
  scroll:  { padding: Spacing.base, gap: Spacing.md, paddingBottom: 40 },
  logCard: { gap: Spacing.sm },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  energyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  energyBtn: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: Colors.bgInput, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  energyBtnActive: { borderColor: '#FF7043', backgroundColor: '#FF7043' + '15' },
  notesInput: {
    fontFamily: FontFamily.regular, fontSize: 15,
    color: Colors.textPrimary, backgroundColor: Colors.bgInput,
    borderRadius: Radius.md, padding: Spacing.md,
    minHeight: 80, textAlignVertical: 'top',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
});
