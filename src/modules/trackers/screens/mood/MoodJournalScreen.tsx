/**
 * MoodJournalScreen — every mood log that has notes, newest first, with mood
 * filter chips and a period filter. Tapping a card opens the full entry.
 */
import { BackArrowIcon } from '../../../../shared/components/AppBackButton';
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';
import { useMoodLogs } from '../../hooks/useMoodLogs';
import { MoodKey, MoodPeriod, MOOD_META, moodScoreOf } from '../../types';

type Props = NativeStackScreenProps<any, 'MoodJournal'>;

const PERIODS: { key: MoodPeriod; label: string }[] = [
  { key: '30d', label: '30 Days' },
  { key: '3m',  label: '3 Months' },
  { key: '1y',  label: '1 Year' },
  { key: 'all', label: 'All' },
];
const MOOD_ORDER: MoodKey[] = ['amazing', 'happy', 'calm', 'neutral', 'sad', 'anxious', 'angry', 'overwhelmed'];

export function MoodJournalScreen({ navigation }: Props) {
  const { refreshing, refresh, error, logsIn } = useMoodLogs();
  const [period, setPeriod] = useState<MoodPeriod>('all');
  const [moodFilter, setMoodFilter] = useState<MoodKey | null>(null);
  const [notesOnly, setNotesOnly] = useState(true);

  const rows = logsIn(period)
    .filter(l => (notesOnly ? !!l.notes?.trim() : true))
    .filter(l => (moodFilter ? l.mood === moodFilter : true));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}><BackArrowIcon /></TouchableOpacity>
        <AppText variant="headingSmall">Journal</AppText>
        <View style={s.hBtn} />
      </View>

      <View style={s.filterRow}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[s.seg, period === p.key && s.segActive]}
            activeOpacity={0.85}
            onPress={() => setPeriod(p.key)}
          >
            <AppText variant="caption" color={period === p.key ? Colors.white : Colors.textSecondary}>{p.label}</AppText>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.moodFilterRow}>
        <TouchableOpacity
          style={[s.moodChip, !moodFilter && s.moodChipActive]}
          activeOpacity={0.85}
          onPress={() => setMoodFilter(null)}
        >
          <AppText variant="caption" color={!moodFilter ? Colors.white : Colors.textSecondary}>All moods</AppText>
        </TouchableOpacity>
        {MOOD_ORDER.map(k => {
          const on = moodFilter === k;
          return (
            <TouchableOpacity
              key={k}
              style={[s.moodChip, on && { backgroundColor: MOOD_META[k].color, borderColor: MOOD_META[k].color }]}
              activeOpacity={0.85}
              onPress={() => setMoodFilter(on ? null : k)}
            >
              <AppText style={{ fontSize: 13 }}>{MOOD_META[k].emoji}</AppText>
              <AppText variant="caption" color={on ? Colors.white : Colors.textSecondary}>{MOOD_META[k].label}</AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={s.toggleRow} activeOpacity={0.75} onPress={() => setNotesOnly(v => !v)}>
        <View style={[s.checkbox, notesOnly && s.checkboxOn]}>
          {notesOnly ? <AppText style={{ fontSize: 11, color: Colors.white }}>✓</AppText> : null}
        </View>
        <AppText variant="caption" color={Colors.textSecondary}>Only entries with notes</AppText>
      </TouchableOpacity>

      {rows.length === 0 ? (
        <AppEmptyState
          emoji="📖"
          title="No entries here"
          subtitle={notesOnly
            ? 'No journal notes match these filters. Try turning off the notes-only filter.'
            : 'No mood logs match these filters.'}
          actionLabel="Log Mood"
          onAction={() => navigation.navigate('LogMood', {})}
        />
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#F97316" />}
        >
          {error ? (
            <View style={s.errorBanner}><AppText variant="caption" color={Colors.error}>{error}</AppText></View>
          ) : null}

          {rows.map(l => {
            const m = MOOD_META[l.mood];
            return (
              <TouchableOpacity
                key={l.id}
                style={s.row}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('MoodDetail', { date: l.date })}
              >
                <View style={[s.icon, { backgroundColor: m.color + '22' }]}>
                  <AppText style={{ fontSize: 20 }}>{m.emoji}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.rowBetween}>
                    <AppText variant="headingSmall" color={Colors.textPrimary}>
                      {new Date(l.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </AppText>
                    <AppText variant="caption" color={m.color}>{moodScoreOf(l)}/10</AppText>
                  </View>
                  <AppText variant="caption" color={m.color}>{m.label}</AppText>
                  {l.notes ? (
                    <AppText variant="caption" color={Colors.textMuted} numberOfLines={2} style={{ marginTop: 2 }}>
                      {l.notes}
                    </AppText>
                  ) : null}
                </View>
                <AppText style={{ fontSize: 16, color: Colors.textLight }}>›</AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  hBtn: { minWidth: 40 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorBanner: { backgroundColor: '#FDE7EA', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },

  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm },
  seg: { flex: 1, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.bgInput, alignItems: 'center' },
  segActive: { backgroundColor: Colors.black },

  moodFilterRow: { gap: 8, paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm },
  moodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  moodChipActive: { backgroundColor: Colors.black, borderColor: Colors.black },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm,
  },
  checkbox: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: Colors.black, borderColor: Colors.black },

  scroll: { padding: Spacing.base, paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 8, ...Shadows.sm,
  },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
