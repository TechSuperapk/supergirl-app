/**
 * LogPeriodScreen — "Log Today": flow, symptoms, mood, medication,
 * temperature and notes. Upserts one entry per date, so re-opening a logged
 * day edits it rather than creating a duplicate.
 */
import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path, SvgProps } from 'react-native-svg';

import { RootState } from '../../../../store';
import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { usePeriodTracker } from '../../hooks/useTrackers';
import { ConfirmDialog } from '../../components/HabitOverlays';
import { FlowLevel, PeriodMood } from '../../types';
import FlowIcon      from '../../components/FlowIcon';
import SympotomsIcon from '../../components/SympotomsIcon';
import SmileIcon     from '../../components/SmileIcon';
import NotesIcon     from '../../components/NotesIcon';
import MedicationIcon from '../../components/MedicationIcon';

type Props = NativeStackScreenProps<any, 'LogPeriod'>;
const todayISO = () => new Date().toISOString().split('T')[0];
const NOTES_MAX = 500;
const ACCENT = '#FF5A5F';

// ── Temperature ──────────────────────────────────────────────────────────────
// Plausible human body temperature, used to catch typos (a stray digit, or a
// value entered while the wrong unit was active). Deliberately wide: it should
// reject "986" and "37F", not second-guess a real fever or hypothermia.
const TEMP_RANGE = { F: { min: 90, max: 110 }, C: { min: 32, max: 43 } } as const;
const fToC = (f: number) => (f - 32) * 5 / 9;
const cToF = (c: number) => (c * 9 / 5) + 32;
/** One decimal is the resolution of a clinical thermometer; more is false precision. */
const round1 = (n: number) => Math.round(n * 10) / 10;

const FLOW_OPTIONS: { key: FlowLevel; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'spotting', label: 'Spotting' },
  { key: 'light', label: 'Light' },
  { key: 'medium', label: 'Medium' },
  { key: 'heavy', label: 'Heavy' },
];
const SYMPTOMS: { key: string; emoji: string }[] = [
  { key: 'Cramps', emoji: '⚡' },
  { key: 'Bloating', emoji: '🫧' },
  { key: 'Headache', emoji: '💆' },
  { key: 'Back Pain', emoji: '🧍' },
  { key: 'Fatigue', emoji: '🔋' },
  { key: 'Acne', emoji: '💧' },
  { key: 'Mood Swings', emoji: '🎭' },
  { key: 'Cravings', emoji: '🧁' },
  { key: 'Nausea', emoji: '🤢' },
];
const MOOD_OPTIONS: { key: PeriodMood; label: string; emoji: string }[] = [
  { key: 'happy', label: 'Happy', emoji: '😃' },
  { key: 'calm', label: 'Calm', emoji: '😌' },
  { key: 'neutral', label: 'Neutral', emoji: '😐' },
  { key: 'irritated', label: 'Irritated', emoji: '😫' },
  { key: 'sad', label: 'Sad', emoji: '😢' },
];

/**
 * Tick drawn as a vector rather than a "✓" character. Text glyphs sit on a
 * baseline with font-dependent side bearings, so inside a small circle they
 * always land slightly low and left of centre and can't be centred reliably
 * across platforms. A path scales exactly to the badge.
 */
function CheckMark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5L9.5 17L19 7.5"
        stroke={Colors.white}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Flow intensity is shown as a count of droplets rather than a filled shape.
 * FlowIcon is a two-path outline (droplet + inner arc), so passing `fill` would
 * flood the open arc into a blob — count and size carry the scale instead.
 */
const FLOW_GLYPH: Record<'light' | 'medium' | 'heavy', { count: number; size: number }> = {
  light:  { count: 1, size: 18 },
  medium: { count: 2, size: 16 },
  heavy:  { count: 3, size: 14 },
};

function FlowGlyph({ level, on }: { level: FlowLevel; on: boolean }) {
  const tint = on ? Colors.white : ACCENT;

  // "None" has no droplet to show — an empty ring reads as absence, where a
  // faded droplet would read as "a little".
  if (level === 'none') {
    return <View style={[s.flowRing, on && { borderColor: Colors.white }]} />;
  }
  // Spotting stays two dots. A droplet would put it on the same visual scale
  // as Light and lose the "traces, not flow" distinction.
  if (level === 'spotting') {
    return (
      <View style={s.flowDots}>
        <View style={[s.flowDot, { backgroundColor: tint }]} />
        <View style={[s.flowDot, { backgroundColor: tint }]} />
      </View>
    );
  }

  const { count, size } = FLOW_GLYPH[level];
  return (
    <View style={s.flowDots}>
      {Array.from({ length: count }, (_, i) => (
        <FlowIcon key={i} width={size} height={size} color={tint} />
      ))}
    </View>
  );
}

function SectionCard({
  Icon, title, children,
}: { Icon: React.ComponentType<SvgProps>; title: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Icon width={24} height={24} />
        <AppText style={s.cardTitle}>{title}</AppText>
      </View>
      {children}
    </View>
  );
}

export function LogPeriodScreen({ navigation, route }: Props) {
  const date = route.params?.date ?? todayISO();
  const existing = useSelector((st: RootState) => st.trackers.periodDayLogs.find(l => l.date === date));
  const { logToday, setCycleStart, entries } = usePeriodTracker();

  // No default selection — an entry starts with nothing chosen, so a
  // preselected "None" can't be mistaken for the user having answered.
  const [flow, setFlow] = useState<FlowLevel | undefined>(existing?.flow);
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [mood, setMood] = useState<PeriodMood | undefined>(existing?.mood);
  const [tookPill, setTookPill] = useState(existing?.medicationTaken ?? false);
  const [tempUnit, setTempUnit] = useState<'F' | 'C'>(existing?.temperatureUnit ?? 'F');
  const [temperature, setTemperature] = useState(existing?.temperature ? String(existing.temperature) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [askStart, setAskStart] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleSymptom = (v: string) =>
    setSymptoms(cur => (cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]));

  /**
   * Switching unit converts the value rather than just relabelling it — 98.6°F
   * is 37°C, not 98.6°C. Relabelling would silently turn a normal reading into
   * a nonsensical one and corrupt the saved record.
   */
  const switchUnit = (next: 'F' | 'C') => {
    if (next === tempUnit) return;
    const t = Number(temperature);
    if (temperature.trim() && Number.isFinite(t)) {
      setTemperature(String(round1(next === 'C' ? fToC(t) : cToF(t))));
    }
    setTempUnit(next);
  };

  /**
   * True when saving this entry would represent bleeding on a day that isn't
   * part of any recorded cycle — i.e. possibly a new period. Spotting is
   * excluded deliberately: it's common mid-cycle and treating it as a start
   * would corrupt every downstream prediction.
   */
  const startsNewPeriod =
    !!flow && flow !== 'none' && flow !== 'spotting'
    && !entries.some(e => date >= e.startDate && date <= (e.endDate ?? e.startDate));

  const persist = async (markAsStart: boolean) => {
    setErr(null);
    setSaving(true);
    try {
      if (markAsStart) await setCycleStart(date, flow ?? 'medium', symptoms);
      await logToday({
        date,
        // Untouched means no flow that day. Stored explicitly so cycle
        // analytics see a real value rather than a gap.
        flow: flow ?? 'none',
        symptoms, mood,
        medicationTaken: tookPill,
        temperature: temperature ? Number(temperature) : undefined,
        temperatureUnit: temperature ? tempUnit : undefined,
        notes: notes.trim() || undefined,
      });
      Alert.alert(
        existing ? 'Entry updated' : 'Entry saved',
        markAsStart
          ? 'Your cycle now starts on this date. Predictions and insights have been recalculated.'
          : existing
            ? "This day's details have been updated."
            : 'Your predictions and insights have been updated.',
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch {
      setErr('Could not save. Check your connection and try again.');
    } finally { setSaving(false); }
  };

  const onSave = async () => {
    // Require something meaningful — an all-defaults save would create a
    // "no flow, nothing else" record that silently skews cycle predictions.
    const hasContent =
      !!flow || symptoms.length > 0 || !!mood || tookPill ||
      temperature.trim() !== '' || notes.trim() !== '';
    if (!hasContent) {
      setErr("Add at least one detail — flow, a symptom, your mood, medication, temperature or a note.");
      return;
    }
    if (temperature.trim()) {
      const t = Number(temperature);
      if (!Number.isFinite(t)) { setErr('Enter a valid temperature, or leave it blank.'); return; }
      const { min, max } = TEMP_RANGE[tempUnit];
      if (t < min || t > max) {
        // Name the likely mistake: a value that's valid in the *other* unit is
        // almost always a forgotten toggle, not a typo.
        const other = tempUnit === 'F' ? 'C' : 'F';
        const inOther = TEMP_RANGE[other];
        const looksLikeOtherUnit = t >= inOther.min && t <= inOther.max;
        setErr(
          looksLikeOtherUnit
            ? `${t} looks like °${other}, but °${tempUnit} is selected. Switch the unit or re-enter the value.`
            : `Enter a temperature between ${min} and ${max} °${tempUnit}.`,
        );
        return;
      }
    }

    // A period start date drives every prediction, so it's confirmed rather
    // than inferred from the flow selection.
    if (startsNewPeriod) { setErr(null); setAskStart(true); return; }
    await persist(false);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>Log Today</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Flow */}
        <SectionCard Icon={FlowIcon} title="Flow">
          <View style={s.flowRow}>
            {FLOW_OPTIONS.map(o => {
              const on = flow === o.key;
              return (
                <TouchableOpacity
                  key={o.key}
                  style={[s.flowCell, on && s.flowCellOn]}
                  activeOpacity={0.85}
                  // Tapping the selected cell clears it, so a mis-tap can be
                  // undone back to "not answered".
                  onPress={() => setFlow(on ? undefined : o.key)}
                >
                  <FlowGlyph level={o.key} on={on} />
                  <AppText style={[s.flowLabel, on && { color: Colors.white }]}>{o.label}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </SectionCard>

        {/* Symptoms */}
        <SectionCard Icon={SympotomsIcon} title="Symptoms">
          <View style={s.pillWrap}>
            {SYMPTOMS.map(sx => {
              const on = symptoms.includes(sx.key);
              return (
                <TouchableOpacity
                  key={sx.key}
                  style={[s.pill, on && s.pillOn]}
                  activeOpacity={0.85}
                  onPress={() => toggleSymptom(sx.key)}
                >
                  <AppText style={s.pillEmoji}>{sx.emoji}</AppText>
                  <AppText style={s.pillLabel}>{sx.key}</AppText>
                  {on ? (
                    <View style={s.pillCheck}><CheckMark size={10} /></View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </SectionCard>

        {/* Mood */}
        <SectionCard Icon={SmileIcon} title="Mood">
          <View style={s.moodRow}>
            {MOOD_OPTIONS.map(o => {
              const on = mood === o.key;
              return (
                <TouchableOpacity
                  key={o.key}
                  style={[s.moodCell, on && s.moodCellOn]}
                  activeOpacity={0.85}
                  onPress={() => setMood(on ? undefined : o.key)}
                >
                  <AppText style={s.moodEmoji}>{o.emoji}</AppText>
                  <AppText
                    style={[s.moodLabel, on && s.moodLabelOn]}
                    numberOfLines={1}
                  >
                    {o.label}
                  </AppText>
                  {on ? (
                    <View style={s.moodCheck}><CheckMark size={12} /></View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </SectionCard>

        {/* Medication */}
        <SectionCard Icon={MedicationIcon} title="Medication">
          <TouchableOpacity style={s.medRow} activeOpacity={0.85} onPress={() => setTookPill(v => !v)}>
            <View style={s.medLeft}>
              <View style={[s.medCheckbox, tookPill && s.medCheckboxOn]}>
                {tookPill ? <CheckMark size={14} /> : null}
              </View>
              <AppText style={s.medLabel}>Took Pill</AppText>
            </View>
            <AppText style={s.chevron}>›</AppText>
          </TouchableOpacity>
        </SectionCard>

        {/* Temperature */}
        <SectionCard Icon={SympotomsIcon} title="Temperature">
          <View style={s.tempRow}>
            <TextInput
              style={s.tempInput}
              placeholder="Enter temperature"
              placeholderTextColor="rgba(153,153,153,0.80)"
              keyboardType="decimal-pad"
              value={temperature}
              // Some Android keyboards emit a comma for the decimal separator
              // and ignore keyboardType restrictions, so the field is filtered
              // to a single well-formed decimal here rather than trusted.
              onChangeText={t =>
                setTemperature(
                  t.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'),
                )
              }
            />
            <View style={s.unitRow}>
              {(['F', 'C'] as const).map((u, i) => (
                <React.Fragment key={u}>
                  {i === 1 ? <AppText style={s.unitDivider}>|</AppText> : null}
                  <TouchableOpacity onPress={() => switchUnit(u)} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
                    <AppText style={tempUnit === u ? s.unitOn : s.unitOff}>°{u}</AppText>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </View>
        </SectionCard>

        {/* Notes */}
        <SectionCard Icon={NotesIcon} title="Notes">
          <View style={s.notesBox}>
            <TextInput
              style={s.notesInput}
              placeholder="How are you feeling today?"
              placeholderTextColor="rgba(153,153,153,0.80)"
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={NOTES_MAX}
            />
            <AppText style={s.notesCount}>{notes.length}/{NOTES_MAX}</AppText>
          </View>
        </SectionCard>

        {err ? (
          <View style={s.errBanner}><AppText variant="caption" color={Colors.error}>{err}</AppText></View>
        ) : null}

        <TouchableOpacity style={s.cta} activeOpacity={0.9} onPress={onSave} disabled={saving}>
          <AppText style={s.ctaText}>{saving ? 'Saving…' : 'Save Entry'}</AppText>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmDialog
        visible={askStart}
        title="Is this the start of your period?"
        message="Your period start date affects your cycle predictions."
        confirmLabel="Yes, Start Period"
        cancelLabel="Not Yet"
        onCancel={() => { setAskStart(false); persist(false); }}
        onConfirm={() => { setAskStart(false); persist(true); }}
      />
    </SafeAreaView>
  );
}

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
  scroll: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40, gap: 20 },

  card: {
    backgroundColor: Colors.white, borderRadius: 30, padding: 10,
    borderWidth: 1, borderColor: 'rgba(153,153,153,0.20)', ...CARD_SHADOW,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  cardTitle: { fontFamily: 'DMSans-Bold', fontSize: 20, color: '#141414' },

  // ── Flow ──
  flowRow: { flexDirection: 'row', gap: 6 },
  flowCell: {
    flex: 1, height: 80, borderRadius: 24, gap: 4,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  flowCellOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  flowLabel: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#141414', textAlign: 'center' },
  flowRing: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#D1D5DB' },
  // Fixed height so cells with a 12px droplet and cells with an 18px one still
  // sit their labels on the same line.
  flowDots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 1, height: 20 },
  flowDot: { width: 5, height: 5, borderRadius: 2.5, marginHorizontal: 1 },

  // ── Symptoms ──
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 10 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    // Row height is set explicitly so every pill is identical regardless of
    // whether its emoji or label reports a taller line box.
    height: 38, paddingHorizontal: 16, borderRadius: 9999,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  pillOn: { backgroundColor: '#FFF0F0', borderColor: 'rgba(255,90,95,0.20)' },
  // includeFontPadding/lineHeight pinned so the emoji and the label share one
  // optical centre line — without it the emoji rides high and the tick that
  // follows looks off-axis.
  pillEmoji: { fontSize: 14, lineHeight: 18, includeFontPadding: false },
  pillLabel: {
    fontFamily: 'DMSans-Medium', fontSize: 14, lineHeight: 18,
    color: '#141414', includeFontPadding: false,
  },
  pillCheck: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Mood ──
  // Extra top/right padding on the row leaves room for the corner badge to sit
  // proud of the cell without being clipped by the card.
  moodRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 6, paddingTop: 6, paddingBottom: 4,
  },
  moodCell: {
    flex: 1, minWidth: 0, height: 81, borderRadius: 24, gap: 4,
    paddingHorizontal: 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6',
  },
  // A 2px border would shift the content by 1px against the unselected cells,
  // so the selected state keeps a 1px border and doubles up with an inset ring.
  moodCellOn: { backgroundColor: '#FFF0F0', borderColor: 'rgba(255,90,95,0.40)' },
  // Emoji need an explicit lineHeight taller than the glyph — the default line
  // box crops the top of tall emoji on Android.
  moodEmoji: {
    fontSize: 28, lineHeight: 36, includeFontPadding: false,
    textAlign: 'center',
  },
  moodLabel: {
    fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16,
    color: '#6B7280', includeFontPadding: false, textAlign: 'center',
  },
  moodLabelOn: { fontFamily: 'DMSans-Bold', color: ACCENT },
  moodCheck: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },

  // ── Medication ──
  medRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(153,153,153,0.20)',
  },
  medLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  medCheckbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  medCheckboxOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  medLabel: { fontFamily: 'DMSans-Medium', fontSize: 16, color: '#141414' },
  chevron: { fontSize: 20, color: '#9CA3AF' },

  // ── Temperature ──
  tempRow: {
    flexDirection: 'row', alignItems: 'center', minHeight: 74,
    paddingHorizontal: 16, borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(153,153,153,0.20)',
  },
  tempInput: {
    flex: 1, fontFamily: 'DMSans-Regular', fontSize: 16, color: '#141414', paddingVertical: 12,
  },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitOn:  { fontFamily: 'DMSans-Bold', fontSize: 14, color: ACCENT },
  unitOff: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#9CA3AF' },
  unitDivider: { fontSize: 14, color: '#D1D5DB' },

  // ── Notes ──
  notesBox: {
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(153,153,153,0.20)',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 22,
  },
  notesInput: {
    minHeight: 96, textAlignVertical: 'top',
    fontFamily: 'DMSans-Regular', fontSize: 16, color: '#141414', padding: 0,
  },
  notesCount: {
    alignSelf: 'flex-end', fontFamily: 'DMSans-Regular', fontSize: 12,
    color: 'rgba(153,153,153,0.80)',
  },

  errBanner: { backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12 },

  cta: {
    height: 64, borderRadius: 9999, backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center', marginTop: 10,
  },
  ctaText: { fontFamily: 'DMSans-Bold', fontSize: 16, color: Colors.white },
});
