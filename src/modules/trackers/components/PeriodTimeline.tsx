/**
 * PeriodTimeline — the dated timeline of day-logs used by both the Period
 * Insights preview and the full Period History screen.
 *
 * Shared rather than duplicated so the two can't drift: the same entry has to
 * look identical whether you reach it from Insights or from History.
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { SvgProps } from 'react-native-svg';

import { AppText } from '../../../shared/components/AppText';
import { Colors } from '../../../shared/theme/colors';
import { PeriodDayLog, PeriodMood } from '../types';

import FlowIcon       from './FlowIcon';
import HeartIcon      from './HeartIcon';
import SympotomsIcon  from './SympotomsIcon';
import MedicationIcon from './MedicationIcon';
import NotesIcon      from './NotesIcon';
import SmileIcon      from './SmileIcon';
import FlameIcon      from './FlameIcon';

const MOOD_EMOJI: Record<PeriodMood, string> = {
  happy: '😊', calm: '😌', neutral: '😐', irritated: '😫', sad: '😢',
};
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

/**
 * Symptom → icon. Anything unlisted falls back to the generic symptoms glyph,
 * so a user's own free-text symptom still renders rather than breaking.
 */
const SYMPTOM_ICON: Record<string, { Icon: React.ComponentType<SvgProps>; color: string }> = {
  Cramps:        { Icon: HeartIcon,     color: '#9739FD' },
  Headache:      { Icon: SympotomsIcon, color: '#FFB619' },
  Fatigue:       { Icon: FlameIcon,     color: '#FF4242' },
  Bloating:      { Icon: FlowIcon,      color: '#60A5FA' },
  'Back Pain':   { Icon: SympotomsIcon, color: '#F87171' },
  Acne:          { Icon: FlowIcon,      color: '#FB923C' },
  'Mood Swings': { Icon: SmileIcon,     color: '#9739FD' },
  Cravings:      { Icon: HeartIcon,     color: '#FF4242' },
  Nausea:        { Icon: FlowIcon,      color: '#22C55E' },
};
export const symptomIcon = (name: string) =>
  SYMPTOM_ICON[name] ?? { Icon: SympotomsIcon, color: '#9CA3AF' };

interface RowProps {
  log: PeriodDayLog;
  onPress: () => void;
  onLongPress?: () => void;
  /** Cap on symptom chips before the rest are summarised as "+N". */
  maxSymptoms?: number;
}

export function PeriodTimelineRow({ log, onPress, onLongPress, maxSymptoms = 3 }: RowProps) {
  const d = new Date(log.date + 'T00:00:00');
  const hasFlow = log.flow !== 'none';

  const chips: { key: string; label: string; Icon: React.ComponentType<SvgProps>; color: string }[] = [];

  log.symptoms.slice(0, maxSymptoms).forEach(sym => {
    const { Icon, color } = symptomIcon(sym);
    chips.push({ key: `sym-${sym}`, label: sym, Icon, color });
  });
  // Say how many were hidden rather than silently dropping them.
  const hidden = log.symptoms.length - maxSymptoms;
  if (hidden > 0) {
    chips.push({ key: 'more', label: `+${hidden} more`, Icon: SympotomsIcon, color: '#9CA3AF' });
  }
  if (log.medicationTaken) {
    chips.push({ key: 'pill', label: 'Pill', Icon: MedicationIcon, color: '#60A5FA' });
  }
  if (log.temperature != null) {
    chips.push({
      key: 'temp',
      label: `${log.temperature}°${log.temperatureUnit ?? 'F'}`,
      Icon: FlameIcon, color: '#FB923C',
    });
  }
  if (log.notes) {
    chips.push({ key: 'notes', label: 'Notes Added', Icon: NotesIcon, color: '#4B5563' });
  }
  if (chips.length === 0) {
    chips.push({ key: 'none', label: 'No Symptoms', Icon: SmileIcon, color: '#9CA3AF' });
  }

  return (
    <View style={s.row}>
      <View style={s.date}>
        <AppText style={s.month}>{MONTHS[d.getMonth()]}</AppText>
        <AppText style={s.day}>{d.getDate()}</AppText>
        <AppText style={s.weekday}>{WEEKDAYS[d.getDay()]}</AppText>
      </View>

      <View style={s.dot} />

      <TouchableOpacity
        style={s.card}
        activeOpacity={0.85}
        onPress={onPress}
        onLongPress={onLongPress}
      >
        <View style={s.cardBody}>
          <View style={s.chipRow}>
            {hasFlow ? (
              <View style={s.flowChip}>
                <FlowIcon width={12} height={12} color="#EF4444" />
                <AppText style={s.flowChipText}>{cap(log.flow)} Flow</AppText>
              </View>
            ) : null}
            {log.mood ? (
              <View style={s.moodChip}>
                <AppText style={s.moodChipText}>
                  {MOOD_EMOJI[log.mood]} {cap(log.mood)}
                </AppText>
              </View>
            ) : null}
          </View>

          <View style={s.chipRow}>
            {chips.map(c => (
              <View key={c.key} style={s.detailChip}>
                <c.Icon width={12} height={12} color={c.color} />
                <AppText style={s.detailChipText}>{c.label}</AppText>
              </View>
            ))}
          </View>
        </View>

        <AppText style={s.chevron}>›</AppText>
      </TouchableOpacity>
    </View>
  );
}

interface TimelineProps {
  logs: PeriodDayLog[];
  onPressLog: (log: PeriodDayLog) => void;
  onLongPressLog?: (log: PeriodDayLog) => void;
  maxSymptoms?: number;
}

/** A run of rows sharing one vertical rail. */
export function PeriodTimeline({ logs, onPressLog, onLongPressLog, maxSymptoms }: TimelineProps) {
  if (!logs.length) return null;
  return (
    <View style={s.timeline}>
      <View style={s.rail} />
      {logs.map(log => (
        <PeriodTimelineRow
          key={log.id}
          log={log}
          maxSymptoms={maxSymptoms}
          onPress={() => onPressLog(log)}
          onLongPress={onLongPressLog ? () => onLongPressLog(log) : undefined}
        />
      ))}
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.10,
  shadowRadius: 20,
  elevation: 5,
} as const;
const HAIRLINE = 'rgba(153,153,153,0.20)';

const s = StyleSheet.create({
  timeline: { gap: 16 },
  // Inset top and bottom so the rail starts and stops at the first and last
  // dots rather than running past them.
  rail: {
    position: 'absolute', left: 44, top: 16, bottom: 16,
    width: 1, backgroundColor: '#F3F4F6',
  },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  date: { width: 48, paddingTop: 8, alignItems: 'center' },
  month: { fontFamily: 'DMSans-Regular', fontSize: 10, color: '#9CA3AF' },
  day: { fontFamily: 'DMSans-Regular', fontSize: 20, color: '#1F2937' },
  weekday: { fontFamily: 'DMSans-Regular', fontSize: 10, color: '#9CA3AF' },
  dot: {
    position: 'absolute', left: 37, top: 18,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#F87171', borderWidth: 2, borderColor: Colors.white,
  },

  card: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: Colors.white, borderRadius: 32,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  cardBody: { flex: 1, gap: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chevron: { fontSize: 20, color: '#D1D5DB', paddingLeft: 8 },

  flowChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: '#FEF2F2', borderRadius: 9999,
  },
  flowChipText: { fontFamily: 'DMSans-Bold', fontSize: 11, color: '#EF4444' },
  moodChip: {
    justifyContent: 'center',
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: '#FFF7ED', borderRadius: 9999,
  },
  moodChipText: { fontFamily: 'DMSans-Bold', fontSize: 11, color: '#C2410C' },
  detailChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: '#F9FAFB', borderRadius: 9999,
  },
  detailChipText: { fontFamily: 'DMSans-Medium', fontSize: 10, color: '#4B5563' },
});
