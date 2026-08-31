/**
 * LogSleepScreen — date, sleep time and wake time (total sleep is derived),
 * optional notes, and Save Entry. Supports create and edit modes (§10, §11).
 *
 * No Journal link by design (§10.10): the Sleep Tracker is independent of the
 * Journal feature, and the flow ends at Save Entry → Sleep Home.
 */
import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { DatePickerSheet, AddTimeSheet } from '../../components/HabitOverlays';
import { MoodSelector } from '../../components/MoodSelector';
import { useSleepTracker } from '../../hooks/useTrackers';
import { durationMinutes, todayISO } from '../../utils/sleepAnalytics';
import { MoodLevel } from '../../types';

type Props = NativeStackScreenProps<any, 'LogSleep'>;

const NOTES_MAX = 500;

const fmtDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const fmtClock = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

function timeToDate(dateISO: string, hhmm: string, rollToNextDay: boolean): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(dateISO + 'T00:00:00');
  d.setHours(h, m, 0, 0);
  if (rollToNextDay) d.setDate(d.getDate() + 1);
  return d;
}

// ── Glyphs ───────────────────────────────────────────────────────────────────

const MoonGlyph = ({ size = 34 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Path
      d="M32 25.5A13.5 13.5 0 0 1 14.5 8 14 14 0 1 0 32 25.5Z"
      fill="#8188F5"
    />
    <Path d="M27 9.5l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1 1-2.6Z" fill="#FFC531" />
  </Svg>
);
const SunGlyph = ({ size = 34 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Circle cx={20} cy={20} r={8.5} fill="#FFC531" />
    <Path
      d="M20 3.5v4M20 32.5v4M3.5 20h4M32.5 20h4M8 8l2.8 2.8M29.2 29.2 32 32M32 8l-2.8 2.8M10.8 29.2 8 32"
      stroke="#FFC531" strokeWidth={3} strokeLinecap="round"
    />
  </Svg>
);
const ChevronGlyph = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M6 3.5 10.5 8 6 12.5" stroke="#141414" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
  </Svg>
);
/** Sleeping figure under a starry sky, for the total-sleep card. */
const SleepArt = () => (
  <Svg width={180} height={116} viewBox="0 0 180 116" fill="none">
    <Defs>
      <LinearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#2B3A67" />
        <Stop offset="1" stopColor="#0E1733" />
      </LinearGradient>
      <LinearGradient id="quilt" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#9FC4F0" />
        <Stop offset="1" stopColor="#5E86C4" />
      </LinearGradient>
    </Defs>
    <Rect width={180} height={116} rx={16} fill="url(#sky)" />
    {[[24, 18], [58, 12], [148, 22], [122, 14], [166, 52], [16, 44]].map(([cx, cy], i) => (
      <Circle key={i} cx={cx} cy={cy} r={1.6} fill="#FFD98A" opacity={0.9} />
    ))}
    {/* Pillow + quilt */}
    <Path d="M0 78c26-10 60-14 92-6 30 7 58 8 88 2v42H0Z" fill="url(#quilt)" />
    <Path d="M28 74c14-16 40-22 62-14 18 6 34 6 52 1" stroke="#C9DDF5" strokeWidth={3} fill="none" strokeLinecap="round" />
    {/* Head */}
    <Circle cx={92} cy={58} r={20} fill="#F6C9A8" />
    <Path d="M72 56c2-16 14-24 26-22 12 2 18 12 16 24-6-6-16-9-26-7-7 1-13 3-16 5Z" fill="#3A2A28" />
    <Path d="M84 60a3 3 0 0 1 6 0" stroke="#3A2A28" strokeWidth={1.8} fill="none" strokeLinecap="round" />
    <Path d="M96 60a3 3 0 0 1 6 0" stroke="#3A2A28" strokeWidth={1.8} fill="none" strokeLinecap="round" />
    <Circle cx={80} cy={66} r={3} fill="#F09A9A" opacity={0.55} />
    <Circle cx={104} cy={66} r={3} fill="#F09A9A" opacity={0.55} />
  </Svg>
);

export function LogSleepScreen({ navigation, route }: Props) {
  const { logSleep, entryForDate } = useSleepTracker();

  const initialDate: string = route.params?.date ?? todayISO();
  /** Arriving with a date that already has a record means edit mode (§11). */
  const editingOriginal = route.params?.date ? entryForDate(route.params.date) : null;

  const [date, setDate] = useState(initialDate);
  const [bedTime, setBedTime] = useState(
    editingOriginal ? new Date(editingOriginal.bedtime).toTimeString().slice(0, 5) : '23:30',
  );
  const [wakeTime, setWakeTime] = useState(
    editingOriginal ? new Date(editingOriginal.wakeTime).toTimeString().slice(0, 5) : '06:45',
  );
  const [quality, setQuality] = useState<MoodLevel | undefined>(editingOriginal?.quality);
  const [notes, setNotes] = useState(editingOriginal?.notes ?? '');

  const [dateSheet, setDateSheet] = useState(false);
  const [bedSheet, setBedSheet] = useState(false);
  const [wakeSheet, setWakeSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** A record on the currently selected date that this screen didn't open to edit. */
  const clash = entryForDate(date);
  const isEditingThisDate = !!editingOriginal && editingOriginal.date === date;

  const totalMins = useMemo(() => durationMinutes(bedTime, wakeTime), [bedTime, wakeTime]);

  /** Pull an existing night into the form rather than writing over it blind (§29). */
  const loadExisting = () => {
    const e = entryForDate(date);
    if (!e) return;
    setBedTime(new Date(e.bedtime).toTimeString().slice(0, 5));
    setWakeTime(new Date(e.wakeTime).toTimeString().slice(0, 5));
    setQuality(e.quality);
    setNotes(e.notes ?? '');
    setErr(null);
  };

  const persist = async () => {
    setErr(null);
    setSaving(true);
    try {
      const bedDate = timeToDate(date, bedTime, false);
      // A wake time at or before bedtime belongs to the next morning (§10.6).
      const wakeDate = timeToDate(date, wakeTime, wakeTime <= bedTime);
      await logSleep(
        date, bedDate.toISOString(), wakeDate.toISOString(),
        quality ?? 3, notes.trim() || undefined,
      );
      navigation.goBack();
    } catch {
      setErr('Could not save. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    if (date > todayISO()) { setErr("You can't log sleep for a future date."); return; }
    // 20h+ from a bedtime/wake pair is a mistyped time, not a lie-in.
    if (totalMins <= 0 || totalMins > 20 * 60) {
      setErr('Check the times — that works out to an impossible night.');
      return;
    }

    // §29 — one record per night. Saving over a night the user didn't open for
    // editing is almost always an accident, so confirm before overwriting.
    if (clash && !isEditingThisDate) {
      Alert.alert(
        'Entry already exists',
        `A sleep entry already exists for ${fmtDate(date)}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View existing entry', onPress: loadExisting },
          { text: 'Replace', style: 'destructive', onPress: persist },
        ],
      );
      return;
    }

    void persist();
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>{editingOriginal ? 'Edit sleep' : 'Sleep tracker'}</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Date ── */}
        <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => setDateSheet(true)}>
          <View style={s.inlineRow}>
            <AppText style={s.cardTitle}>Date</AppText>
            <AppText style={s.inlineValue}>{fmtDate(date)}</AppText>
          </View>
        </TouchableOpacity>

        {/* ── Times ── */}
        <TouchableOpacity style={s.timeCard} activeOpacity={0.85} onPress={() => setBedSheet(true)}>
          <View style={s.timeLeft}>
            <View style={[s.timeIcon, { backgroundColor: '#EEF2FF' }]}><MoonGlyph /></View>
            <View style={s.timeText}>
              <AppText style={s.timeLabel}>Sleep Time</AppText>
              <AppText style={s.timeHint}>When did you fall asleep?</AppText>
            </View>
          </View>
          <View style={s.timeRight}>
            <AppText style={s.timeValue}>{fmtClock(bedTime)}</AppText>
            <ChevronGlyph />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s.timeCard} activeOpacity={0.85} onPress={() => setWakeSheet(true)}>
          <View style={s.timeLeft}>
            <View style={[s.timeIcon, { backgroundColor: '#FFF8EE' }]}><SunGlyph /></View>
            <View style={s.timeText}>
              <AppText style={s.timeLabel}>Wake up time</AppText>
              <AppText style={s.timeHint}>When did you wakeup?</AppText>
            </View>
          </View>
          <View style={s.timeRight}>
            <AppText style={s.timeValue}>{fmtClock(wakeTime)}</AppText>
            <ChevronGlyph />
          </View>
        </TouchableOpacity>

        {/* ── Total ── */}
        <View style={s.totalCard}>
          <View style={s.totalLeft}>
            <AppText style={s.cardTitle}>Total sleep</AppText>
            <View>
              <AppText style={s.totalValue}>
                {Math.floor(Math.max(0, totalMins) / 60)}h {Math.max(0, totalMins) % 60}m
              </AppText>
              <AppText style={s.totalSub}>
                {isEditingThisDate ? `Updating ${fmtDate(date)}`
                  : date === todayISO() ? 'Today' : fmtDate(date)}
              </AppText>
            </View>
          </View>
          <View style={s.totalArt}><SleepArt /></View>
        </View>

        {/* ── Quality ── */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <AppText style={s.cardTitle}>
              Sleep quality <AppText style={s.cardTitleMuted}>(Optional)</AppText>
            </AppText>
          </View>
          <View style={s.qualityWrap}>
            <MoodSelector selected={quality} onSelect={setQuality} size="md" />
          </View>
        </View>

        {/* ── Notes ── */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <AppText style={s.cardTitle}>
              Notes <AppText style={s.cardTitleMuted}>(Optional)</AppText>
            </AppText>
          </View>
          <View style={s.notesBox}>
            <TextInput
              style={s.notesInput as any}
              placeholder="How was you sleep?"
              placeholderTextColor="rgba(70,69,82,0.50)"
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={NOTES_MAX}
            />
            <AppText style={s.notesCount}>{notes.length}/{NOTES_MAX}</AppText>
          </View>
        </View>

        {/* A night already on file for this date, opened fresh rather than for
            editing — flagged here so Save isn't the first hint of a clash. */}
        {clash && !isEditingThisDate ? (
          <TouchableOpacity style={s.noticeBanner} activeOpacity={0.85} onPress={loadExisting}>
            <AppText style={s.noticeText}>
              A sleep entry already exists for {fmtDate(date)}.
            </AppText>
            <AppText style={s.noticeLink}>View existing entry</AppText>
          </TouchableOpacity>
        ) : null}

        {err ? (
          <View style={s.errBanner}>
            <AppText variant="caption" color={Colors.error}>{err}</AppText>
          </View>
        ) : null}

        <TouchableOpacity
          style={s.saveBtn}
          activeOpacity={0.9}
          disabled={saving}
          onPress={save}
        >
          <AppText style={s.saveText}>
            {saving ? 'Saving…' : isEditingThisDate ? 'Update Entry' : 'Save Entry'}
          </AppText>
        </TouchableOpacity>
      </ScrollView>

      <DatePickerSheet visible={dateSheet} title="Date" value={date} onConfirm={setDate} onClose={() => setDateSheet(false)} />
      <AddTimeSheet visible={bedSheet} onAdd={setBedTime} onClose={() => setBedSheet(false)} />
      <AddTimeSheet visible={wakeSheet} onAdd={setWakeTime} onClose={() => setWakeSheet(false)} />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.10,
  shadowRadius: 20,
  elevation: 5,
} as const;
const HAIRLINE = 'rgba(153,153,153,0.20)';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },

  // ── Cards ──
  card: {
    backgroundColor: Colors.white, borderRadius: 30, padding: 10, gap: 10,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  cardHead: { paddingHorizontal: 10, paddingVertical: 5 },
  cardTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: '#141414' },
  cardTitleMuted: { fontFamily: 'DMSans-Medium', fontSize: 16, color: 'rgba(20,20,20,0.40)' },
  inlineRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: 10, paddingRight: 14, paddingVertical: 5,
  },
  inlineValue: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: '#141414' },

  // ── Time rows ──
  timeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: HAIRLINE,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 20, elevation: 2,
  },
  timeLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeIcon: {
    width: 56, height: 56, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  timeText: { flex: 1, minWidth: 0 },
  timeLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: '#141414' },
  timeHint: { fontFamily: 'DMSans-Regular', fontSize: 13, lineHeight: 18, color: '#999999' },
  timeRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  timeValue: { fontFamily: 'DMSans-Medium', fontSize: 15, color: '#141414' },

  // ── Total ──
  totalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10,
    backgroundColor: Colors.white, borderRadius: 30,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  totalLeft: {
    flex: 1, minWidth: 0, justifyContent: 'space-between', gap: 20,
    paddingHorizontal: 10, paddingTop: 4, paddingBottom: 12,
  },
  totalValue: { fontFamily: 'DMSans-SemiBold', fontSize: 30, lineHeight: 36, color: '#141414' },
  totalSub: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#999999' },
  totalArt: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: HAIRLINE,
  },

  qualityWrap: { paddingHorizontal: 10, paddingBottom: 6 },

  // ── Notes ──
  notesBox: {
    height: 128, padding: 16, borderRadius: 20,
    backgroundColor: 'rgba(153,153,153,0.10)',
  },
  notesInput: {
    flex: 1, textAlignVertical: 'top', padding: 0,
    fontFamily: 'DMSans-Regular', fontSize: 16, lineHeight: 24, color: '#141414',
  } as any,
  notesCount: {
    alignSelf: 'flex-end', fontFamily: 'DMSans-Regular', fontSize: 11, color: '#9CA3AF',
  },

  errBanner: { backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12 },
  noticeBanner: {
    backgroundColor: '#FFF7E6', borderRadius: 12, padding: 12, gap: 4,
    borderWidth: 1, borderColor: '#F5D9A0',
  },
  noticeText: { fontFamily: 'DMSans-Medium', fontSize: 13, lineHeight: 18, color: '#8A5A00' },
  noticeLink: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: '#141414' },

  // ── Actions ──
  saveBtn: {
    paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30,
    backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: HAIRLINE,
  },
  saveText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: Colors.white },
});
