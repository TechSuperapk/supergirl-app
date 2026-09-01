/**
 * LogMoodScreen — mood (single), intensity 1–10, influencers (multi) and
 * optional notes.
 *
 * One log per day: saving upserts by date, so re-opening a logged day edits it
 * rather than creating a duplicate. Everything downstream (dashboard, calendar,
 * charts, streak, insights) is Redux-derived and updates on its own.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput, Alert, PanResponder, StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { useMoodLogs } from '../../hooks/useMoodLogs';
import { MoodKey, MOOD_META, MOOD_INFLUENCERS } from '../../types';

type Props = NativeStackScreenProps<any, 'LogMood'>;

const NOTES_MAX = 1000;
const todayISO = () => new Date().toISOString().split('T')[0];
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const MOOD_ORDER: MoodKey[] = ['amazing', 'happy', 'calm', 'neutral', 'sad', 'anxious', 'angry', 'overwhelmed'];
const ACCENT = '#FF6B6B';

const CheckGlyph = () => (
  <Svg width={10} height={10} viewBox="0 0 12 12" fill="none">
    <Path d="M2.5 6.3 4.7 8.5 9.5 3.7" stroke={Colors.white} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ratioOf = (v: number) => (v - 1) / 9;
const valueOf = (r: number) => Math.max(1, Math.min(10, Math.round(r * 9) + 1));

/**
 * Dependency-free 1–10 slider. The project has no slider package, and adding a
 * native one for this is not worth the build risk.
 *
 * The thumb follows the finger continuously (its own `ratio`, not the rounded
 * value) and only snaps to the nearest step on release, so dragging feels
 * smooth instead of stepping in ten jumps. Positions are computed from
 * `pageX` against the track's measured window origin rather than `locationX`,
 * because `locationX` is relative to whichever child is under the finger — as
 * soon as you drag over the thumb it would jump.
 */
function IntensitySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<View>(null);
  const geom = useRef({ x: 0, w: 0 });
  const dragging = useRef(false);
  const [ratio, setRatio] = useState(ratioOf(value));

  // Keep in sync when the value changes from outside (e.g. loading an entry),
  // but never fight the finger mid-drag.
  useEffect(() => {
    if (!dragging.current) setRatio(ratioOf(value));
  }, [value]);

  const measure = () =>
    trackRef.current?.measureInWindow((x, _y, w) => { geom.current = { x, w }; });

  const ratioFromPage = (pageX: number) => {
    const { x, w } = geom.current;
    if (w <= 0) return ratio;
    return Math.max(0, Math.min(1, (pageX - x) / w));
  };

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    // Claim the gesture before the ScrollView can treat it as a scroll.
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => {
      dragging.current = true;
      measure();
      const r = ratioFromPage(e.nativeEvent.pageX);
      setRatio(r);
      onChange(valueOf(r));
    },
    onPanResponderMove: e => {
      const r = ratioFromPage(e.nativeEvent.pageX);
      setRatio(r);
      const next = valueOf(r);
      if (next !== value) onChange(next);
    },
    onPanResponderRelease: () => {
      dragging.current = false;
      setRatio(cur => ratioOf(valueOf(cur)));
    },
    onPanResponderTerminate: () => {
      dragging.current = false;
      setRatio(cur => ratioOf(valueOf(cur)));
    },
  }), [value]);

  const pct = ratio * 100;
  const shown = valueOf(ratio);

  return (
    <View style={s.sliderCard}>
      {/* Padded wrapper owns the gesture, so a slightly-off touch still grabs. */}
      <View style={s.sliderHit} {...responder.panHandlers}>
        <View
          ref={trackRef}
          style={s.sliderTrack}
          onLayout={measure}
          collapsable={false}
        >
          <View style={[s.sliderFill, { width: `${pct}%` }]} />
          {/* Bubble and thumb share the same ratio so they never drift. */}
          <View style={[s.valueBubble, { left: `${pct}%` }]}>
            <AppText style={s.valueBubbleText}>{shown}</AppText>
          </View>
          <View style={[s.sliderThumb, { left: `${pct}%` }]} />
        </View>
      </View>
      <View style={s.sliderLabels}>
        <AppText style={s.sliderLabel}>Low</AppText>
        <AppText style={s.sliderLabel}>High</AppText>
      </View>
    </View>
  );
}

export function LogMoodScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const paramDate: string = route.params?.date ?? todayISO();
  const { logFor, logMood, editMood } = useMoodLogs();
  const existing = logFor(paramDate);

  const [mood, setMood]           = useState<MoodKey | undefined>(existing?.mood);
  const [intensity, setIntensity] = useState(existing?.intensity ?? 7);
  const [influencers, setInfluencers] = useState<string[]>(existing?.influencers ?? []);
  const [notes, setNotes]         = useState(existing?.notes ?? '');

  // Not on this screen; preserved so editing never wipes values set elsewhere.
  const energy = existing?.energy;
  const stress = existing?.stress;
  const activities = existing?.activities ?? [];

  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  // Show any custom values the user previously saved alongside the presets.
  const influencerOptions = useMemo(() => {
    const preset = MOOD_INFLUENCERS.map(i => i.key);
    const extra = influencers.filter(i => !preset.includes(i));
    return [...MOOD_INFLUENCERS, ...extra.map(key => ({ key, emoji: '✨' }))];
  }, [influencers]);

  const toggleInfluencer = (v: string) =>
    setInfluencers(cur => (cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]));

  const onSave = async () => {
    if (!mood) { setErr("Pick how you're feeling first."); return; }
    if (paramDate > todayISO()) { setErr("You can't log a mood for a future date."); return; }

    setErr(null);
    setSaving(true);
    try {
      const payload = {
        date: paramDate,
        time: existing?.time ?? nowHHMM(),
        mood, intensity, influencers, activities,
        energy, stress,
        notes: notes.trim() || undefined,
      };
      if (existing) await editMood(existing.id, payload);
      else await logMood(payload);

      Alert.alert(
        existing ? 'Mood updated' : 'Mood logged',
        existing ? 'Your entry has been updated.' : 'Your streak, score and insights have been updated.',
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch {
      setErr('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>{existing ? 'Edit Mood' : 'Log Mood'}</AppText>
        <TouchableOpacity onPress={onSave} disabled={saving} style={s.saveChip} activeOpacity={0.85}>
          <AppText style={s.saveChipText}>{saving ? '…' : 'Save'}</AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Mood ── */}
        <View style={s.section}>
          <AppText style={s.sectionTitle}>How are you feeling?</AppText>
          <View style={s.moodGrid}>
            {MOOD_ORDER.map(key => {
              const m = MOOD_META[key];
              const on = mood === key;
              return (
                <View key={key} style={s.moodCell}>
                  <TouchableOpacity
                    style={[s.moodTile, on && { backgroundColor: m.color + '14', borderColor: m.color }]}
                    activeOpacity={0.85}
                    onPress={() => setMood(key)}
                  >
                    <AppText style={s.moodEmoji}>{m.emoji}</AppText>
                  </TouchableOpacity>
                  <AppText
                    style={[s.moodLabel, on && { color: m.color, fontFamily: 'DMSans-Bold' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {m.label}
                  </AppText>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Intensity ── */}
        <View style={s.section}>
          <AppText style={s.sectionTitle}>Mood Intensity</AppText>
          <IntensitySlider value={intensity} onChange={setIntensity} />
        </View>

        {/* ── Influencers ── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <AppText style={s.sectionTitle}>What influenced your mood?</AppText>
            <AppText style={s.sectionHint}>(Select all that apply)</AppText>
          </View>
          <View style={s.wrap}>
            {influencerOptions.map(o => {
              const on = influencers.includes(o.key);
              return (
                <TouchableOpacity
                  key={o.key}
                  style={[s.chip, on && s.chipOn]}
                  activeOpacity={0.85}
                  onPress={() => toggleInfluencer(o.key)}
                >
                  <AppText style={[s.chipText, on && s.chipTextOn]}>{o.emoji} {o.key}</AppText>
                  {on ? <View style={s.chipCheck}><CheckGlyph /></View> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Notes ── */}
        <View style={s.notesCard}>
          <AppText style={s.notesTitle}>
            Notes <AppText style={s.notesTitleMuted}>(Optional)</AppText>
          </AppText>
          <View style={s.notesBox}>
            <TextInput
              style={s.notesInput as any}
              placeholder="Write about your day…"
              placeholderTextColor="rgba(70,69,82,0.50)"
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={NOTES_MAX}
            />
          </View>
        </View>

        {err ? (
          <View style={s.errBanner}><AppText variant="caption" color={Colors.error}>{err}</AppText></View>
        ) : null}

        <TouchableOpacity style={s.saveBtn} onPress={onSave} disabled={saving} activeOpacity={0.9}>
          <AppText style={s.saveText}>{saving ? 'Saving…' : 'Save Log'}</AppText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const HAIRLINE = 'rgba(153,153,153,0.20)';
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.10,
  shadowRadius: 20,
  elevation: 4,
} as const;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  hBtn: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },
  saveChip: {
    paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999, backgroundColor: '#141414',
  },
  saveChipText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, lineHeight: 20, color: Colors.white },

  scroll: { paddingHorizontal: 16, paddingTop: 12, gap: 24 },
  section: { gap: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
  sectionTitle: { fontFamily: 'DMSans-Bold', fontSize: 16, lineHeight: 24, color: '#141414' },
  sectionHint: { fontFamily: 'DMSans-Regular', fontSize: 12, lineHeight: 17, color: '#6F767E' },

  // ── Mood grid ──
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  moodCell: { width: '25%', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingBottom: 12 },
  moodTile: {
    alignSelf: 'stretch', paddingVertical: 18, borderRadius: 20,
    backgroundColor: '#F8F9FA', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(20,20,20,0.05)',
  },
  moodEmoji: { fontSize: 28, lineHeight: 36, includeFontPadding: false } as any,
  moodLabel: { fontFamily: 'DMSans-Medium', fontSize: 10, lineHeight: 15, color: '#6F767E' },

  // ── Slider ──
  sliderCard: {
    paddingTop: 40, paddingBottom: 10, paddingHorizontal: 14,
    borderRadius: 12, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: '#F1F1F1',
  },
  // Vertical padding widens the grab area without moving the visible track.
  sliderHit: { paddingVertical: 12, marginVertical: -12 },
  sliderTrack: { height: 22, justifyContent: 'center' },
  sliderFill: { position: 'absolute', left: 0, height: 4, borderRadius: 4, backgroundColor: ACCENT },
  valueBubble: {
    position: 'absolute', top: -34, marginLeft: -18,
    width: 36, height: 30, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white, borderWidth: 1, borderColor: '#FEE2E2', ...CARD_SHADOW,
  },
  valueBubbleText: { fontFamily: 'DMSans-Bold', fontSize: 14, lineHeight: 20, color: ACCENT },
  sliderThumb: {
    position: 'absolute', width: 26, height: 26, borderRadius: 13, marginLeft: -13,
    backgroundColor: Colors.white, borderWidth: 4, borderColor: ACCENT,
  },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  sliderLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 11, lineHeight: 17, color: '#6F767E' },

  // ── Chips ──
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 30,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: Colors.white,
  },
  chipOn: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  chipText: { fontFamily: 'DMSans-Medium', fontSize: 13, lineHeight: 20, color: '#141414' },
  chipTextOn: { color: '#EF4444' },
  chipCheck: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Notes ──
  notesCard: {
    padding: 10, borderRadius: 30, gap: 12, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  notesTitle: {
    fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 26, color: '#141414',
    paddingHorizontal: 10, paddingVertical: 5,
  },
  notesTitleMuted: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#999999' },
  notesBox: {
    height: 128, padding: 16, borderRadius: 20,
    borderWidth: 1, borderColor: HAIRLINE,
  },
  notesInput: {
    flex: 1, textAlignVertical: 'top', padding: 0,
    fontFamily: 'DMSans-Regular', fontSize: 16, lineHeight: 24, color: '#141414',
  } as any,

  errBanner: { backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12 },

  saveBtn: {
    paddingVertical: 20, borderRadius: 999, backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center', ...CARD_SHADOW,
  },
  saveText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 24, color: Colors.white },
});
