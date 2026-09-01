/**
 * WaterEntryDetailScreen — one water entry: amount, date, time, the day's goal
 * and notes, with Edit and Delete (confirm first). Deleting pops back and every
 * derived figure (dashboard, streak, charts, analytics) recalculates from Redux.
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
import { useWaterTracker } from '../../hooks/useTrackers';

type Props = NativeStackScreenProps<any, 'WaterEntryDetail'>;

const fmtTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};
const litres = (ml: number) => `${Math.round((ml / 1000) * 100) / 100} L`;

export function WaterEntryDetailScreen({ navigation, route }: Props) {
  const id: string | undefined = route.params?.id;
  const { logById, byDate, goalMl, removeLog } = useWaterTracker();
  const entry = id ? logById(id) : null;

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const Header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}><BackArrowIcon /></TouchableOpacity>
      <AppText variant="headingSmall">Entry details</AppText>
      <View style={s.hBtn} />
    </View>
  );

  const onDelete = async () => {
    if (!entry) return;
    setConfirming(false);
    setDeleting(true);
    setErr(null);
    try {
      await removeLog(entry.id);
      navigation.goBack();
    } catch {
      setErr('Could not delete. Check your connection and try again.');
      setDeleting(false);
    }
  };

  if (!entry) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {Header}
        <AppEmptyState
          emoji="💧"
          title="Entry not found"
          subtitle="This entry may have been deleted."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const dayTotal = byDate[entry.date] ?? 0;
  const dayPct = goalMl ? Math.round((dayTotal / goalMl) * 100) : 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {Header}

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.amountCard}>
          <View style={s.icon}><AppText style={{ fontSize: 26 }}>💧</AppText></View>
          <View style={{ flex: 1 }}>
            <AppText variant="displayMedium" color="#0284C7">{entry.amountMl} ml</AppText>
            <AppText variant="caption" color={Colors.textMuted}>{litres(entry.amountMl)}</AppText>
          </View>
        </View>

        <View style={s.card}>
          <Row
            label="Date"
            value={new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          />
          <Row label="Time" value={fmtTime(entry.time)} />
          <Row label="Daily goal" value={litres(goalMl)} />
          <Row
            label="That day's total"
            value={`${litres(dayTotal)} · ${dayPct}%`}
            valueColor={dayPct >= 100 ? Colors.success : Colors.textPrimary}
            last
          />
        </View>

        {entry.notes ? (
          <>
            <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Notes</AppText>
            <View style={s.card}>
              <AppText variant="body" color={Colors.textSecondary} style={{ lineHeight: 22 }}>{entry.notes}</AppText>
            </View>
          </>
        ) : null}

        <TouchableOpacity
          style={s.linkRow}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('WaterDay', { date: entry.date })}
        >
          <AppText variant="body" color={Colors.textPrimary} style={{ flex: 1 }}>See all entries for this day</AppText>
          <AppText style={{ fontSize: 16, color: Colors.textLight }}>›</AppText>
        </TouchableOpacity>

        {err ? <AppText variant="caption" color={Colors.error} style={{ marginTop: Spacing.sm }}>{err}</AppText> : null}

        <TouchableOpacity style={s.editBtn} activeOpacity={0.9} onPress={() => navigation.navigate('LogWater', { id: entry.id })}>
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
        title="Delete entry"
        message="This will permanently delete this water entry. Your progress, streak and analytics will update."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={onDelete}
      />
    </SafeAreaView>
  );
}

function Row({ label, value, valueColor, last }: { label: string; value: string; valueColor?: string; last?: boolean }) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      <AppText variant="body" color={Colors.textSecondary} style={{ flex: 1 }}>{label}</AppText>
      <AppText variant="headingSmall" color={valueColor ?? Colors.textPrimary}>{value}</AppText>
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

  amountCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: '#E0F2FE', borderRadius: Radius.xl, padding: Spacing.base,
  },
  icon: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
  },

  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.base, marginTop: Spacing.base, ...Shadows.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 11,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg, padding: Spacing.base, marginTop: Spacing.base, ...Shadows.sm,
  },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.black, borderRadius: Radius.full, paddingVertical: 16, marginTop: Spacing.lg,
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FDE7EA', borderRadius: Radius.full, paddingVertical: 16, marginTop: Spacing.sm,
  },
});
