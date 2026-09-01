/**
 * LogIntimacyScreen — create or edit an Intimacy entry: date, time, who it was
 * with, protection (partner only), how it felt, mood after, and free notes.
 */
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SvgProps } from 'react-native-svg';

import { RootState } from '../../../../store';
import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { DatePickerSheet, AddTimeSheet } from '../../components/HabitOverlays';
import { useIntimacyTracker } from '../../hooks/useTrackers';
import { IntimacyWho, ProtectionStatus, IntimacyFeeling, IntimacyMoodAfter } from '../../types';

import PartnerIcon  from '../../components/PartnerIcon';
import SelfloveIcon from '../../components/SelfloveIcon';
import { CheckBadge, CrossBadge } from '../../components/ProtectionBadges';

type Props = NativeStackScreenProps<any, 'LogIntimacy'>;

const todayISO = () => new Date().toISOString().split('T')[0];
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
/** DD/MM/YYYY for display; state stays ISO so sorting and the API are unaffected. */
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const NOTES_MAX = 500;

const WHO_OPTIONS: { key: IntimacyWho; label: string; Icon: React.ComponentType<SvgProps> }[] = [
  { key: 'partner',   label: 'Partner',   Icon: PartnerIcon },
  { key: 'self_love', label: 'Self love', Icon: SelfloveIcon },
];
const FEELING_OPTIONS: { key: IntimacyFeeling; label: string; emoji: string }[] = [
  { key: 'loved',        label: 'Loved',        emoji: '🥰' },
  { key: 'happy',        label: 'Happy',        emoji: '😄' },
  { key: 'relaxed',      label: 'Relaxed',      emoji: '😌' },
  { key: 'passionate',   label: 'Passionate',   emoji: '😍' },
  { key: 'neutral',      label: 'Neutral',      emoji: '🙂' },
  { key: 'disappointed', label: 'Disappointed', emoji: '😞' },
];
const MOOD_AFTER_OPTIONS: { key: IntimacyMoodAfter; label: string; emoji: string }[] = [
  { key: 'amazing', label: 'Amazing', emoji: '🤩' },
  { key: 'good',    label: 'Good',    emoji: '😍' },
  { key: 'ok',      label: 'Ok',      emoji: '😊' },
  { key: 'low',     label: 'Low',     emoji: '😔' },
];

export function LogIntimacyScreen({ navigation, route }: Props) {
  const editingId: string | undefined = route.params?.id;
  const existing = useSelector((st: RootState) => st.trackers.intimacy.find(e => e.id === editingId));
  const { logEntry, editEntry } = useIntimacyTracker();

  const [date, setDate]     = useState(existing?.date ?? route.params?.date ?? todayISO());
  const [time, setTime]     = useState(existing?.time ?? nowHHMM());
  const [who, setWho]       = useState<IntimacyWho>(existing?.who ?? 'partner');
  const [protection, setProtection] = useState<ProtectionStatus | undefined>(existing?.protection);
  const [feeling, setFeeling]       = useState<IntimacyFeeling | undefined>(existing?.feeling);
  const [moodAfter, setMoodAfter]   = useState<IntimacyMoodAfter | undefined>(existing?.moodAfter);
  const [notes, setNotes]   = useState(existing?.notes ?? '');

  const [dateSheet, setDateSheet] = useState(false);
  const [timeSheet, setTimeSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSave = async () => {
    if (date > todayISO()) { setErr("That date is in the future — pick today or earlier."); return; }
    if (who === 'partner' && !protection) { setErr('Select a protection status.'); return; }

    setErr(null);
    setSaving(true);
    try {
      const data = {
        date, time, who,
        // Protection is meaningless for self-love; clear it so switching Who
        // can't leave a stale value attached to the saved entry.
        protection: who === 'partner' ? protection : undefined,
        feeling, moodAfter,
        notes: notes.trim() || undefined,
      };
      if (editingId) await editEntry(editingId, data); else await logEntry(data);
      navigation.goBack();
    } catch {
      setErr('Could not save. Check your connection and try again.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>{editingId ? 'Edit Entry' : 'Log Intimacy'}</AppText>
        <View style={s.hBtn} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Date / Time */}
        <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => setDateSheet(true)}>
          <View style={s.inlineRow}>
            <AppText style={s.cardTitle}>Date</AppText>
            <AppText style={s.inlineValue}>{fmtDate(date)}</AppText>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => setTimeSheet(true)}>
          <View style={s.inlineRow}>
            <AppText style={s.cardTitle}>Time</AppText>
            <AppText style={s.inlineValue}>{time}</AppText>
          </View>
        </TouchableOpacity>

        {/* Who */}
        <View style={s.card}>
          <View style={s.titleRow}><AppText style={s.cardTitle}>Who was it with?</AppText></View>
          <View style={s.cellRow}>
            {WHO_OPTIONS.map(o => {
              const on = who === o.key;
              return (
                <TouchableOpacity
                  key={o.key}
                  style={[s.whoCell, on && s.whoCellOn]}
                  activeOpacity={0.85}
                  // §4.2 — switching to Self love clears any protection
                  // choice. Save already masks it, so nothing bad reaches the
                  // database, but leaving it in state means toggling back to
                  // Partner silently restores a value the user never
                  // re-confirmed for this entry.
                  onPress={() => {
                    setWho(o.key);
                    if (o.key === 'self_love') setProtection(undefined);
                  }}
                >
                  <View style={[s.radio, s.whoRadio, on && s.radioOn]}>
                    {on ? <View style={s.radioDot} /> : null}
                  </View>
                  <o.Icon width={40} height={40} />
                  <AppText style={s.cellLabel}>{o.label}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Protection — partner only */}
        {who === 'partner' ? (
          <View style={s.card}>
            <View style={s.titleRow}><AppText style={s.cardTitle}>Protection</AppText></View>
            <View style={s.protRow}>
              {([
                { key: 'protected' as const,   label: 'Protected',   Badge: CheckBadge },
                { key: 'unprotected' as const, label: 'Unprotected', Badge: CrossBadge },
              ]).map(o => {
                const on = protection === o.key;
                return (
                  <TouchableOpacity
                    key={o.key}
                    style={[s.protCell, on && s.protCellOn]}
                    activeOpacity={0.85}
                    onPress={() => setProtection(o.key)}
                  >
                    <View style={s.protLeft}>
                      <o.Badge size={22} />
                      {/* Shrinks a little rather than truncating: at two cells
                          across a 375px screen, "Unprotected" at full size
                          doesn't fit beside the badge and the radio. */}
                      <AppText
                        style={[s.protLabel, on && s.protLabelOn]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                      >
                        {o.label}
                      </AppText>
                    </View>
                    <View style={[s.radio, s.protRadio, on && s.radioOn]}>
                      {on ? <View style={s.protRadioDot} /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* How was it? */}
        <View style={s.card}>
          <View style={s.titleRow}><AppText style={s.cardTitle}>How was it?</AppText></View>
          {[FEELING_OPTIONS.slice(0, 3), FEELING_OPTIONS.slice(3)].map((row, ri) => (
            <View key={ri} style={s.cellRow}>
              {row.map(o => {
                const on = feeling === o.key;
                return (
                  <TouchableOpacity
                    key={o.key}
                    style={[s.optCell, on && s.optCellOn]}
                    activeOpacity={0.85}
                    // Tapping the selected option clears it — feeling is optional.
                    onPress={() => setFeeling(on ? undefined : o.key)}
                  >
                    <AppText style={s.optEmoji}>{o.emoji}</AppText>
                    <AppText style={s.cellLabel} numberOfLines={1}>{o.label}</AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Mood after */}
        <View style={s.card}>
          <View style={s.titleRow}><AppText style={s.cardTitle}>Mood after</AppText></View>
          <View style={s.cellRow}>
            {MOOD_AFTER_OPTIONS.map(o => {
              const on = moodAfter === o.key;
              return (
                <TouchableOpacity
                  key={o.key}
                  style={[s.optCell, on && s.optCellOn]}
                  activeOpacity={0.85}
                  onPress={() => setMoodAfter(on ? undefined : o.key)}
                >
                  <AppText style={s.optEmoji}>{o.emoji}</AppText>
                  <AppText style={s.cellLabel} numberOfLines={1}>{o.label}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <View style={s.card}>
          <View style={s.titleRow}><AppText style={s.cardTitle}>Highlights &amp; notes?</AppText></View>
          <View style={s.notesBox}>
            <TextInput
              style={s.notesInput}
              placeholder="Write about your feelings or specific moments..."
              placeholderTextColor="rgba(70,69,82,0.50)"
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={NOTES_MAX}
            />
          </View>
        </View>

        {err ? (
          <View style={s.errBanner}>
            <AppText variant="caption" color={Colors.error}>{err}</AppText>
          </View>
        ) : null}

        <TouchableOpacity style={s.saveBtn} activeOpacity={0.9} onPress={onSave} disabled={saving}>
          <AppText style={s.saveText}>{saving ? 'Saving…' : 'Save'}</AppText>
        </TouchableOpacity>
      </ScrollView>

      <DatePickerSheet visible={dateSheet} title="Date" value={date} onConfirm={setDate} onClose={() => setDateSheet(false)} />
      <AddTimeSheet visible={timeSheet} onAdd={setTime} onClose={() => setTimeSheet(false)} />
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

  // Flat header — no card, shadow or rounded corners behind the title.
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12,
  },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, gap: 20 },

  card: {
    backgroundColor: Colors.white, borderRadius: 30, padding: 10, gap: 10,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  cardTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: '#141414' },
  titleRow: { paddingHorizontal: 10, paddingVertical: 5 },
  inlineRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: 10, paddingRight: 14, paddingVertical: 5,
  },
  inlineValue: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: '#141414' },

  cellRow: { flexDirection: 'row', gap: 10 },

  // ── Who ──
  whoCell: {
    flex: 1, height: 86, borderRadius: 30, gap: 4,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: HAIRLINE, backgroundColor: Colors.white,
  },
  whoCellOn: { borderColor: '#141414' },
  // Corner-pinned so the icon and label stay optically centred in the cell.
  whoRadio: { position: 'absolute', left: 14, top: 14 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(20,20,20,0.60)',
  },
  radioOn: { borderColor: '#141414' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#141414' },

  cellLabel: {
    fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16,
    color: '#141414', textAlign: 'center', includeFontPadding: false,
  },

  // ── Protection ──
  protRow: { flexDirection: 'row', gap: 10 },
  protCell: {
    flex: 1, minWidth: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 6, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 20,
    borderWidth: 1.5, borderColor: HAIRLINE, backgroundColor: Colors.white,
  },
  protCellOn: { borderColor: '#141414' },
  // minWidth:0 lets the label shrink inside the row instead of overflowing.
  protLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  protLabel: {
    fontFamily: 'DMSans-Medium', fontSize: 15, color: 'rgba(20,20,20,0.60)', flexShrink: 1,
  },
  protLabelOn: { color: '#141414' },
  // Slightly smaller than the Who radio to buy the label back some room.
  protRadio: { width: 18, height: 18, borderRadius: 9, flexShrink: 0 },
  protRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#141414' },

  // ── Option cells (feeling / mood after) ──
  optCell: {
    flex: 1, height: 86, borderRadius: 20, gap: 4,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: HAIRLINE, backgroundColor: Colors.white,
  },
  optCellOn: { borderWidth: 1.5, borderColor: '#141414' },
  // Explicit lineHeight — the default line box crops tall emoji on Android.
  optEmoji: { fontSize: 32, lineHeight: 40, includeFontPadding: false },

  // ── Notes ──
  notesBox: {
    height: 128, padding: 16, borderRadius: 20,
    backgroundColor: '#F6F7F8', borderWidth: 1, borderColor: '#C7C5D4',
  },
  notesInput: {
    flex: 1, textAlignVertical: 'top', padding: 0,
    fontFamily: 'DMSans-Regular', fontSize: 16, lineHeight: 24, color: '#141414',
  },

  errBanner: { backgroundColor: '#FDE7EA', borderRadius: 12, padding: 12 },

  saveBtn: {
    paddingVertical: 20, paddingHorizontal: 30, borderRadius: 9999,
    backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center',
    ...CARD_SHADOW,
  },
  saveText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 24, color: Colors.white },
});
