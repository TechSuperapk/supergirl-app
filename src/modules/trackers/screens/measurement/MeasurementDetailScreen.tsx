/**
 * MeasurementDetailScreen — one saved measurement set in full, each field shown
 * against the previous entry with absolute and percentage change. Offers Edit
 * and Delete (with confirm); all analytics are Redux-derived so they refresh
 * automatically after either.
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
import { useMeasurementTracker } from '../../hooks/useTrackers';
import { MEASUREMENT_FIELDS, MeasurementEntry } from '../../types';

type Props = NativeStackScreenProps<any, 'MeasurementDetail'>;

const fmtTime = (hhmm?: string) => {
  if (!hhmm) return '—';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

export function MeasurementDetailScreen({ navigation, route }: Props) {
  const id: string | undefined = route.params?.id;
  const { entries, entryById, removeMeasurement } = useMeasurementTracker();
  const entry = id ? entryById(id) : null;

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const Header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}><BackArrowIcon /></TouchableOpacity>
      <AppText variant="headingSmall">Measurement Details</AppText>
      <View style={s.hBtn} />
    </View>
  );

  const onDelete = async () => {
    if (!entry) return;
    setConfirming(false);
    setDeleting(true);
    setErr(null);
    try {
      await removeMeasurement(entry.id);
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
          emoji="📏"
          title="Record not found"
          subtitle="This measurement may have been deleted."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  // The entry logged immediately before this one, for the comparison column.
  const prior: MeasurementEntry | null =
    entries.filter(e => e.date < entry.date || (e.date === entry.date && e.createdAt < entry.createdAt))[0] ?? null;

  const dateLabel = new Date(entry.date + 'T00:00:00')
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const weekday = new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });

  const rows = MEASUREMENT_FIELDS.map(f => {
    const now = entry[f.key] as number | undefined;
    const then = prior?.[f.key] as number | undefined;
    const diff = now != null && then != null ? Math.round((now - then) * 10) / 10 : null;
    const pct = diff != null && then ? Math.round((diff / then) * 1000) / 10 : null;
    return { ...f, now, diff, pct };
  }).filter(r => r.now != null);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {Header}

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.dateRow}>
          <View style={s.dateIcon}><AppText style={{ fontSize: 20 }}>📏</AppText></View>
          <View style={{ flex: 1 }}>
            <AppText variant="headingLarge" color={Colors.textPrimary}>{dateLabel}</AppText>
            <AppText variant="caption" color={Colors.textMuted}>{weekday} · {fmtTime(entry.time)}</AppText>
          </View>
        </View>

        {prior ? (
          <AppText variant="caption" color={Colors.textMuted} style={{ marginBottom: Spacing.sm }}>
            Compared with your {new Date(prior.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} entry
          </AppText>
        ) : (
          <AppText variant="caption" color={Colors.textMuted} style={{ marginBottom: Spacing.sm }}>
            This is your first entry — no comparison available yet.
          </AppText>
        )}

        <View style={s.card}>
          {rows.map((r, i) => (
            <View key={r.key} style={[s.row, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="body" color={Colors.textSecondary}>{r.label}</AppText>
              </View>
              <AppText variant="headingSmall" color={Colors.textPrimary}>
                {r.now}<AppText variant="caption" color={Colors.textMuted}> {r.unit}</AppText>
              </AppText>
              <View style={s.diffCol}>
                {r.diff == null ? (
                  <AppText variant="caption" color={Colors.textLight}>—</AppText>
                ) : r.diff === 0 ? (
                  <AppText variant="caption" color={Colors.textLight}>No change</AppText>
                ) : (
                  <AppText variant="caption" color={r.diff < 0 ? Colors.success : Colors.error}>
                    {r.diff < 0 ? '↓' : '↑'} {Math.abs(r.diff)} {r.unit}
                    {r.pct != null ? ` (${Math.abs(r.pct)}%)` : ''}
                  </AppText>
                )}
              </View>
            </View>
          ))}
        </View>

        {entry.notes ? (
          <>
            <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Notes</AppText>
            <View style={s.card}>
              <AppText variant="body" color={Colors.textSecondary} style={{ lineHeight: 22 }}>{entry.notes}</AppText>
            </View>
          </>
        ) : null}

        {err ? <AppText variant="caption" color={Colors.error} style={{ marginTop: Spacing.sm }}>{err}</AppText> : null}

        <TouchableOpacity style={s.editBtn} activeOpacity={0.9} onPress={() => navigation.navigate('MeasurementLog', { id: entry.id })}>
          <AppText style={{ fontSize: 16 }}>✏️</AppText>
          <AppText variant="button" color={Colors.white}>Edit Measurement</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={s.deleteBtn} activeOpacity={0.9} disabled={deleting} onPress={() => setConfirming(true)}>
          <AppText style={{ fontSize: 16 }}>🗑️</AppText>
          <AppText variant="button" color={Colors.error}>{deleting ? 'Deleting…' : 'Delete Measurement'}</AppText>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmDialog
        visible={confirming}
        title="Delete measurement"
        message="This will permanently delete this record. Your dashboard, charts, comparisons and analytics will update."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={onDelete}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  hBtn: { minWidth: 40 },
  scroll: { padding: Spacing.base, paddingBottom: 60 },
  sectionLbl: { marginTop: Spacing.lg, marginBottom: Spacing.sm },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.base },
  dateIcon: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.bgCard,
    alignItems: 'center', justifyContent: 'center', ...Shadows.sm,
  },

  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.base, ...Shadows.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 11,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  diffCol: { width: 118, alignItems: 'flex-end' },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.black, borderRadius: Radius.full, paddingVertical: 16, marginTop: Spacing.lg,
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FDE7EA', borderRadius: Radius.full, paddingVertical: 16, marginTop: Spacing.sm,
  },
});
