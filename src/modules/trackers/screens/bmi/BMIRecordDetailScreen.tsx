/**
 * BMIRecordDetailScreen — one saved measurement in full: date, time, height,
 * weight, BMI, category, healthy range, weight difference and a personalised
 * recommendation. Offers Edit and Delete (with confirm); deleting pops back and
 * all analytics recalculate because they're Redux-derived.
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
import { useBMITracker, idealWeightRangeFor } from '../../hooks/useTrackers';
import { HEALTH_TIPS, BMI_MESSAGE } from '../../utils/bodyComposition';
import { BMI_CATEGORY_META, BMI_SCALE } from './bmiMeta';

type Props = NativeStackScreenProps<any, 'BMIRecordDetail'>;

const fmtTime = (hhmm?: string) => {
  if (!hhmm) return '—';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

export function BMIRecordDetailScreen({ navigation, route }: Props) {
  const id: string | undefined = route.params?.id;
  const { entryById, removeBMI } = useBMITracker();
  const entry = id ? entryById(id) : null;

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onDelete = async () => {
    if (!entry) return;
    setConfirming(false);
    setDeleting(true);
    setErr(null);
    try {
      await removeBMI(entry.id);
      navigation.goBack();
    } catch {
      setErr('Could not delete. Check your connection and try again.');
      setDeleting(false);
    }
  };

  const Header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}><BackArrowIcon /></TouchableOpacity>
      <AppText variant="headingSmall">Record Details</AppText>
      <View style={s.hBtn} />
    </View>
  );

  if (!entry) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {Header}
        <AppEmptyState
          emoji="⚖️"
          title="Record not found"
          subtitle="This measurement may have been deleted."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const meta = BMI_CATEGORY_META[entry.category];
  const range = idealWeightRangeFor(entry.heightCm);
  // Distance from the nearest edge of the healthy band; 0 when already inside.
  const diff = entry.weightKg < range.min
    ? Math.round((range.min - entry.weightKg) * 10) / 10
    : entry.weightKg > range.max
      ? Math.round((entry.weightKg - range.max) * 10) / 10
      : 0;
  const tips = HEALTH_TIPS[entry.category];
  const pointerPct = Math.max(0, Math.min(100, (entry.bmi / 40) * 100));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {Header}

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Result */}
        <View style={s.resultRow}>
          <View>
            <AppText variant="displayMedium" color={Colors.textPrimary}>{entry.bmi}</AppText>
            <AppText variant="caption" color={Colors.textMuted}>Your BMI</AppText>
          </View>
          <View style={s.resultDivider} />
          <View style={{ flex: 1 }}>
            <View style={[s.pill, { backgroundColor: meta.color + '22' }]}>
              <AppText variant="caption" color={meta.color}>{meta.label}</AppText>
            </View>
            <AppText variant="headingSmall" color={Colors.textPrimary} style={{ marginTop: 6 }}>
              {BMI_MESSAGE[entry.category]}
            </AppText>
            <AppText variant="caption" color={Colors.textMuted}>Healthy range: 18.5 – 24.9</AppText>
          </View>
        </View>

        {/* Scale */}
        <View style={s.scaleWrap}>
          <View style={s.scaleBar}>
            {BMI_SCALE.map(seg => (
              <View key={seg.label} style={[s.scaleSeg, { backgroundColor: seg.color }]} />
            ))}
            <View style={[s.scalePointer, { left: `${pointerPct}%` }]} />
          </View>
          <View style={s.scaleLabels}>
            {BMI_SCALE.map(seg => (
              <AppText key={seg.label} variant="caption" color={Colors.textMuted} style={s.scaleLabel}>{seg.label}</AppText>
            ))}
          </View>
        </View>

        <View style={s.statsRow}>
          <MiniStat label="Current Weight" value={`${entry.weightKg} kg`} />
          <MiniStat label="Ideal Weight" value={`${range.min} – ${range.max} kg`} />
          <MiniStat
            label="Weight Difference"
            value={diff === 0 ? 'Perfect Range' : `${diff} kg`}
            color={diff === 0 ? Colors.success : Colors.warning}
          />
        </View>

        <View style={s.card}>
          <Row label="Date" value={new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
          <Row label="Time" value={fmtTime(entry.time)} />
          <Row label="Height" value={`${entry.heightCm} cm`} />
          <Row label="Weight" value={`${entry.weightKg} kg`} />
          <Row label="BMI Category" value={meta.label} valueColor={meta.color} last />
        </View>

        {tips ? (
          <>
            <AppText variant="headingLarge" color={Colors.textPrimary} style={s.sectionLbl}>Recommendation</AppText>
            <View style={s.card}>
              <AppText variant="headingSmall" color={Colors.textPrimary}>{tips.title}</AppText>
              {tips.tips.map(t => (
                <View key={t} style={s.tipRow}>
                  <AppText variant="caption" color={Colors.textMuted}>•</AppText>
                  <AppText variant="body" color={Colors.textSecondary} style={{ flex: 1 }}>{t}</AppText>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {err ? <AppText variant="caption" color={Colors.error} style={{ marginTop: Spacing.sm }}>{err}</AppText> : null}

        <TouchableOpacity style={s.editBtn} activeOpacity={0.9} onPress={() => navigation.navigate('BMILog', { id: entry.id })}>
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
        message="This will permanently delete this record. Your BMI statistics, charts and goal progress will update."
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
      <AppText variant="body" color={Colors.textSecondary}>{label}</AppText>
      <AppText variant="headingSmall" color={valueColor ?? Colors.textPrimary}>{value}</AppText>
    </View>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.miniStat}>
      <AppText variant="caption" color={Colors.textLight}>{label}</AppText>
      <AppText variant="headingSmall" color={color ?? Colors.textPrimary}>{value}</AppText>
    </View>
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

  resultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  resultDivider: { width: 1, height: 54, backgroundColor: Colors.border },
  pill: { alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },

  scaleWrap: { marginTop: Spacing.lg },
  scaleBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'visible' },
  scaleSeg: { flex: 1, height: 8 },
  scalePointer: {
    position: 'absolute', top: -5, width: 18, height: 18, borderRadius: 9, marginLeft: -9,
    backgroundColor: '#22C55E', borderWidth: 3, borderColor: Colors.white,
  },
  scaleLabels: { flexDirection: 'row', marginTop: 8 },
  scaleLabel: { flex: 1, textAlign: 'center', fontSize: 10 },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  miniStat: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    padding: Spacing.md, gap: 4, ...Shadows.sm,
  },

  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.base, marginTop: Spacing.lg, ...Shadows.sm },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  tipRow: { flexDirection: 'row', gap: 8, marginTop: 8 },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.black, borderRadius: Radius.full, paddingVertical: 16, marginTop: Spacing.lg,
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FDE7EA', borderRadius: Radius.full, paddingVertical: 16, marginTop: Spacing.sm,
  },
});
