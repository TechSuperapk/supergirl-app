/**
 * MoodDetailScreen — one day's mood log in full: mood, score, intensity,
 * energy, stress, activities, influencers, notes and time logged. Offers Edit
 * and Delete (with confirm). Deleting pops back; all analytics are
 * Redux-derived so they refresh automatically.
 */
import { BackArrowIcon } from '../../../../shared/components/AppBackButton';
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../../../shared/components/AppText';
import { AppEmptyState } from '../../../../shared/components/AppEmptyState';
import { Colors } from '../../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';
import { ConfirmDialog } from '../../components/HabitOverlays';
import { useMoodLogs } from '../../hooks/useMoodLogs';
import { MOOD_META, MOOD_SCALE_META, moodScoreOf } from '../../types';

type Props = NativeStackScreenProps<any, 'MoodDetail'>;

const fmtTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

export function MoodDetailScreen({ navigation, route }: Props) {
  const date: string = route.params?.date;
  const { logFor, removeMood } = useMoodLogs();
  const log = date ? logFor(date) : null;

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dateObj = date ? new Date(date + 'T00:00:00') : new Date();
  const dateLabel = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const isFuture = !!date && date > new Date().toISOString().split('T')[0];

  const onDelete = async () => {
    if (!log) return;
    setConfirming(false);
    setDeleting(true);
    setErr(null);
    try {
      await removeMood(log.id);
      navigation.goBack();
    } catch {
      setErr('Could not delete. Check your connection and try again.');
      setDeleting(false);
    }
  };

  const Header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}><BackArrowIcon /></TouchableOpacity>
      <AppText variant="headingSmall">Mood Details</AppText>
      <View style={s.hBtn} />
    </View>
  );

  if (!log) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {Header}
        <AppEmptyState
          emoji="🙂"
          title={`Nothing logged for ${dateLabel}`}
          subtitle={isFuture ? 'You can only log moods for today or earlier.' : 'Add an entry for this day to see it here.'}
          actionLabel={isFuture ? 'Go back' : 'Log this day'}
          onAction={() => isFuture ? navigation.goBack() : navigation.replace('LogMood', { date })}
        />
      </SafeAreaView>
    );
  }

  const m = MOOD_META[log.mood];
  const score = moodScoreOf(log);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {Header}

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Mood banner */}
        <View style={[s.banner, { backgroundColor: m.color + '18' }]}>
          <View style={[s.bannerIcon, { backgroundColor: m.color + '2A' }]}>
            <AppText style={{ fontSize: 32 }}>{m.emoji}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="headingLarge" color={m.color}>{m.label}</AppText>
            <AppText variant="caption" color={Colors.textMuted}>{dateLabel} · {weekday}</AppText>
            <AppText variant="caption" color={Colors.textMuted}>Logged at {fmtTime(log.time)}</AppText>
          </View>
          <View style={{ alignItems: 'center' }}>
            <AppText variant="displayMedium" color={m.color}>{score}</AppText>
            <AppText variant="caption" color={Colors.textMuted}>/10</AppText>
          </View>
        </View>

        <View style={s.card}>
          <Row emoji="💪" label="Mood Intensity" value={`${log.intensity} / 10`} />
          <Row emoji="⚡" label="Energy Level" value={log.energy ? MOOD_SCALE_META[log.energy].label : 'Not set'} />
          <Row emoji="🫧" label="Stress Level" value={log.stress ? MOOD_SCALE_META[log.stress].label : 'Not set'} last />
        </View>

        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Mood Influencers</AppText>
        <View style={s.card}>
          {log.influencers.length ? (
            <View style={s.wrap}>
              {log.influencers.map(i => (
                <View key={i} style={s.tag}><AppText variant="caption" color={Colors.textSecondary}>{i}</AppText></View>
              ))}
            </View>
          ) : (
            <AppText variant="body" color={Colors.textMuted}>None recorded.</AppText>
          )}
        </View>

        <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Activities</AppText>
        <View style={s.card}>
          {log.activities.length ? (
            <View style={s.wrap}>
              {log.activities.map(a => (
                <View key={a} style={s.tagIndigo}><AppText variant="caption" color="#4F46E5">{a}</AppText></View>
              ))}
            </View>
          ) : (
            <AppText variant="body" color={Colors.textMuted}>None recorded.</AppText>
          )}
        </View>

        {log.notes ? (
          <>
            <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Notes</AppText>
            <View style={s.card}>
              <AppText variant="body" color={Colors.textSecondary} style={{ lineHeight: 22 }}>{log.notes}</AppText>
            </View>
          </>
        ) : null}

        {err ? <AppText variant="caption" color={Colors.error} style={{ marginTop: Spacing.sm }}>{err}</AppText> : null}

        <TouchableOpacity style={s.editBtn} activeOpacity={0.9} onPress={() => navigation.navigate('LogMood', { date: log.date })}>
          <AppText style={{ fontSize: 16 }}>✏️</AppText>
          <AppText variant="button" color={Colors.white}>Edit Entry</AppText>
        </TouchableOpacity>

        <TouchableOpacity style={s.deleteBtn} activeOpacity={0.9} disabled={deleting} onPress={() => setConfirming(true)}>
          <AppText style={{ fontSize: 16 }}>🗑️</AppText>
          <AppText variant="button" color={Colors.error}>{deleting ? 'Deleting…' : 'Delete Entry'}</AppText>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmDialog
        visible={confirming}
        title="Delete mood log"
        message="This will permanently delete this entry. Your streak, score and insights will update."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={onDelete}
      />
    </SafeAreaView>
  );
}

function Row({ emoji, label, value, last }: { emoji: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      <View style={s.rowIcon}><AppText style={{ fontSize: 17 }}>{emoji}</AppText></View>
      <AppText variant="body" color={Colors.textSecondary} style={{ flex: 1 }}>{label}</AppText>
      <AppText variant="headingSmall" color={Colors.textPrimary}>{value}</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  hBtn: { minWidth: 40 },
  scroll: { padding: Spacing.base, paddingBottom: 60 },
  sectionLbl: { marginTop: Spacing.lg, marginBottom: Spacing.sm },

  banner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.xl, padding: Spacing.base },
  bannerIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },

  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.base, marginTop: Spacing.sm, ...Shadows.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },

  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: Colors.bgInput, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  tagIndigo: { backgroundColor: '#EEF2FF', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.black, borderRadius: Radius.full, paddingVertical: 16, marginTop: Spacing.lg,
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FDE7EA', borderRadius: Radius.full, paddingVertical: 16, marginTop: Spacing.sm,
  },
});
