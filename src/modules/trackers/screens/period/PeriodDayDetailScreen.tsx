/**
 * PeriodDayDetailScreen — one day's full log: flow, symptoms, mood,
 * medication, temperature and notes. Reached by tapping a calendar date on the
 * dashboard or a row in History.
 *
 * Days with no entry aren't a dead end: they show the cycle context we *do*
 * know for that date (phase, whether it's inside an estimated fertile window
 * or a predicted period) plus a Log Entry CTA. Deleting pops back so the
 * dashboard, calendar and insights — all Redux-derived — refresh immediately.
 */
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path, SvgProps } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { ConfirmDialog } from '../../components/HabitOverlays';
import { usePeriodTracker } from '../../hooks/useTrackers';
import { FlowLevel, PeriodMood } from '../../types';
import FlowIcon from '../../components/FlowIcon';
import SympotomsIcon from '../../components/SympotomsIcon';
import SmileIcon from '../../components/SmileIcon';
import NotesIcon from '../../components/NotesIcon';
import MedicationIcon from '../../components/MedicationIcon';

type Props = NativeStackScreenProps<any, 'PeriodDayDetail'>;

const todayISO = () => new Date().toISOString().split('T')[0];

const FLOW_LABEL: Record<FlowLevel, string> = {
  none: 'No Flow', spotting: 'Spotting', light: 'Light', medium: 'Medium', heavy: 'Heavy',
};
const MOOD_LABEL: Record<PeriodMood, string> = {
  happy: 'Happy', calm: 'Calm', neutral: 'Neutral', irritated: 'Irritated', sad: 'Sad',
};
const PHASE_LABEL: Record<string, string> = {
  menstrual: 'Menstrual phase',
  follicular: 'Follicular phase',
  ovulation: 'Ovulation',
  luteal: 'Luteal phase',
};

const ThermometerGlyph = (p: SvgProps) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" {...p}>
    <Path d="M10 14.8V5.5a2 2 0 1 1 4 0v9.3a4 4 0 1 1-4 0Z" stroke="#0EA5E9" strokeWidth={1.7} />
    <Path d="M12 16.6v-6" stroke="#0EA5E9" strokeWidth={2.4} strokeLinecap="round" />
  </Svg>
);

export function PeriodDayDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const date: string = route.params?.date ?? todayISO();
  const {
    dayLogFor, removeDayLog, phaseFor, fertileWindow, ovulationDate, predictedPeriodDays,
  } = usePeriodTracker();
  const log = dayLogFor(date);

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dateObj = new Date(date + 'T00:00:00');
  const dateLabel = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const isFuture = date > todayISO();

  const phase = phaseFor(date);
  const inFertile = !!fertileWindow && date >= fertileWindow.start && date <= fertileWindow.end;
  const isOvulation = date === ovulationDate;
  const isPredictedPeriod = predictedPeriodDays.has(date);

  const onDelete = async () => {
    if (!log) return;
    setConfirming(false);
    setDeleting(true);
    setErr(null);
    try {
      await removeDayLog(log.id);
      navigation.goBack();
    } catch {
      setErr('Could not delete. Check your connection and try again.');
      setDeleting(false);
    }
  };

  /** What we can say about this date from cycle data alone. */
  const estimates = [
    isPredictedPeriod ? 'Estimated period day' : null,
    isOvulation ? 'Estimated ovulation' : null,
    !isOvulation && inFertile ? 'Estimated fertile window' : null,
    phase && !isPredictedPeriod ? PHASE_LABEL[phase] : null,
  ].filter(Boolean) as string[];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>Day Details</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.dateCard}>
          <AppText style={s.dateLabel}>{dateLabel}</AppText>
          <AppText style={s.dateWeekday}>{weekday}</AppText>
        </View>

        {estimates.length ? (
          <View style={s.estimateCard}>
            {estimates.map(e => (
              <View key={e} style={s.estimateRow}>
                <View style={s.estimateDot} />
                <AppText style={s.estimateText}>{e}</AppText>
              </View>
            ))}
            <AppText style={s.estimateNote}>
              Estimates are based on your tracked history and may vary from cycle to cycle.
            </AppText>
          </View>
        ) : null}

        {log ? (
          <>
            <View style={s.card}>
              <Row Icon={FlowIcon} bg="#FEF2F2" label="Flow" value={FLOW_LABEL[log.flow]} tint="#FE5151" />
              <Row
                Icon={SympotomsIcon} bg="#FAF5FF" label="Symptoms" tint="#A855F7"
                value={log.symptoms.length ? `${log.symptoms.length} logged` : 'None'}
              />
              {log.symptoms.length ? (
                <View style={s.tagWrap}>
                  {log.symptoms.map(sym => (
                    <View key={sym} style={s.tag}><AppText style={s.tagText}>{sym}</AppText></View>
                  ))}
                </View>
              ) : null}
              <Row
                Icon={SmileIcon} bg="rgba(255,168,47,0.10)" label="Mood" tint="#FFA82F"
                value={log.mood ? MOOD_LABEL[log.mood] : 'Not recorded'}
              />
              <Row
                Icon={MedicationIcon} bg="#ECFDF5" label="Medication" tint="#10B981"
                value={log.medicationTaken ? 'Pill taken' : 'Not taken'}
              />
              <Row
                Icon={ThermometerGlyph} bg="#EFF6FF" label="Temperature" tint="#0EA5E9"
                value={log.temperature != null ? `${log.temperature}°${log.temperatureUnit ?? 'F'}` : 'Not recorded'}
                last={!log.notes}
              />
              {log.notes ? (
                <View style={s.notesBlock}>
                  <View style={s.notesHead}>
                    <View style={[s.rowIcon, { backgroundColor: '#EFF6FF' }]}>
                      <NotesIcon width={20} height={20} />
                    </View>
                    <AppText style={s.rowLabel}>Notes</AppText>
                  </View>
                  <AppText style={s.notesText}>{log.notes}</AppText>
                </View>
              ) : null}
            </View>

            {err ? (
              <View style={s.errBanner}><AppText variant="caption" color={Colors.error}>{err}</AppText></View>
            ) : null}

            <TouchableOpacity
              style={s.cta}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('LogPeriod', { date })}
            >
              <AppText style={s.ctaText}>Edit Entry</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.deleteBtn}
              activeOpacity={0.9}
              disabled={deleting}
              onPress={() => setConfirming(true)}
            >
              <AppText style={s.deleteText}>{deleting ? 'Deleting…' : 'Delete Entry'}</AppText>
            </TouchableOpacity>
          </>
        ) : (
          <View style={s.emptyCard}>
            <AppText style={s.emptyTitle}>No entry for this day</AppText>
            <AppText style={s.emptySub}>
              {isFuture
                ? "This day hasn't happened yet — you can log it once it arrives."
                : 'Add flow, symptoms, mood and more to build your cycle history.'}
            </AppText>
            {!isFuture ? (
              <TouchableOpacity
                style={s.cta}
                activeOpacity={0.9}
                onPress={() => navigation.replace('LogPeriod', { date })}
              >
                <AppText style={s.ctaText}>Log Entry</AppText>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={confirming}
        title="Delete entry"
        message="This day's log will be removed. Your summary, history and insights will update. Your period start dates aren't affected."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={onDelete}
      />
    </SafeAreaView>
  );
}

function Row({
  Icon, bg, label, value, tint, last,
}: {
  Icon: React.ComponentType<SvgProps>;
  bg: string; label: string; value: string; tint?: string; last?: boolean;
}) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      <View style={[s.rowIcon, { backgroundColor: bg }]}><Icon width={20} height={20} /></View>
      <AppText style={s.rowLabel}>{label}</AppText>
      <AppText style={[s.rowValue, tint ? { color: tint } : null]} numberOfLines={1}>{value}</AppText>
    </View>
  );
}

const HAIRLINE = 'rgba(153,153,153,0.20)';
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.10,
  shadowRadius: 20,
  elevation: 5,
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

  scroll: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },

  dateCard: { gap: 2 },
  dateLabel: { fontFamily: 'DMSans-Bold', fontSize: 22, lineHeight: 29, color: '#141414' },
  dateWeekday: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#999999' },

  // ── Cycle context ──
  estimateCard: {
    padding: 16, borderRadius: 24, gap: 8,
    backgroundColor: '#FFF8F8', borderWidth: 1, borderColor: '#FFE0E0',
  },
  estimateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  estimateDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF7A7A' },
  estimateText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#141414' },
  estimateNote: { fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 18, color: '#999999' },

  // ── Log ──
  card: {
    borderRadius: 24, paddingHorizontal: 16, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowLabel: { flex: 1, minWidth: 0, fontFamily: 'DMSans-SemiBold', fontSize: 15, color: '#141414' },
  rowValue: { fontFamily: 'DMSans-Bold', fontSize: 14, color: '#6B7280', flexShrink: 1 },

  tagWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  tag: { backgroundColor: '#FAF5FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#7E22CE' },

  notesBlock: { paddingVertical: 14, gap: 8 },
  notesHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notesText: { fontFamily: 'DMSans-Regular', fontSize: 14, lineHeight: 22, color: '#6B7280' },

  // ── Empty ──
  emptyCard: {
    padding: 24, borderRadius: 24, gap: 8, alignItems: 'center',
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  emptyTitle: { fontFamily: 'DMSans-Bold', fontSize: 17, color: '#141414' },
  emptySub: {
    fontFamily: 'DMSans-Regular', fontSize: 14, lineHeight: 21,
    color: '#999999', textAlign: 'center', marginBottom: 8,
  },

  errBanner: { backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12 },

  cta: {
    alignSelf: 'stretch', height: 60, borderRadius: 9999, backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { fontFamily: 'DMSans-Bold', fontSize: 16, color: Colors.white },
  deleteBtn: {
    height: 56, borderRadius: 9999, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteText: { fontFamily: 'DMSans-Bold', fontSize: 15, color: '#EF4444' },
});
