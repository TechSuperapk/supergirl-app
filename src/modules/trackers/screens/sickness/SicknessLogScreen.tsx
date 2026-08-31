/**
 * SicknessLogScreen — top toggle between "My medic" (medication log) and
 * "My Symptoms" (symptom log). Handles both create and edit (via
 * route.params.symptomId / medicationId). Full validation before saving.
 */
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Image, Alert, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { RootState } from '../../../../store';
import { AppText } from '../../../../shared/components/AppText';
import { Colors } from '../../../../shared/theme/colors';
import { DatePickerSheet, AddTimeSheet } from '../../components/HabitOverlays';
import { PickerSheet } from '../../components/PickerSheet';
import { useSicknessTracker } from '../../hooks/useTrackers';
import * as Sick from '../../utils/sicknessAnalytics';
import { uploadLocalFile } from '../../../../lib/firebaseStorage';
import {
  SicknessFeeling, SicknessSeverity, MedicationFoodTiming, MedicationStatus,
} from '../../types';
import {
  COMMON_SYMPTOMS, FEELING_OPTIONS, SEVERITY_OPTIONS,
  FOOD_TIMING_OPTIONS, FREQUENCY_OPTIONS, SIDE_EFFECT_OPTIONS, MEDICATION_STATUS_OPTIONS,
} from './sicknessMeta';

type Props = NativeStackScreenProps<any, 'SicknessLog'>;

const todayISO = () => new Date().toISOString().split('T')[0];
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const fmtDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const NOTES_MAX = 500;

// ── Glyphs ───────────────────────────────────────────────────────────────────

const CaretGlyph = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9.5 12 15.5l6-6" stroke="#000000" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const CalendarGlyph = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={5} width={16} height={15} rx={3} stroke="#000000" strokeWidth={1.5} />
    <Path d="M4 10h16M8.5 3v4M15.5 3v4" stroke="#000000" strokeWidth={1.5} strokeLinecap="round" />
    {[8, 12, 16].map(cx => (
      <React.Fragment key={cx}>
        <Circle cx={cx} cy={13.5} r={0.8} fill="#000000" />
        <Circle cx={cx} cy={16.5} r={0.8} fill="#000000" />
      </React.Fragment>
    ))}
  </Svg>
);
const DocGlyph = () => (
  <Svg width={36} height={36} viewBox="0 0 40 40" fill="none">
    <Path d="M11 6h13l6 6v22a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" fill="#F7F1E4" stroke="#D9C9A5" strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M24 6v6h6" fill="#EDE2C8" stroke="#D9C9A5" strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M14 18h11M14 23h11M14 28h7" stroke="#B9A67C" strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

/** Distinct face per feeling, so the row reads without relying on colour. */
const FeelingFace = ({ feeling, on }: { feeling: SicknessFeeling; on: boolean }) => {
  const stroke = on ? Colors.white : '#141414';
  const st = { stroke, strokeWidth: 1.8, fill: 'none' as const, strokeLinecap: 'round' as const };
  const mouth =
    feeling === 'good' ? 'M8 14.5c1.1 1.5 2.4 2.2 4 2.2s2.9-.7 4-2.2'
    : feeling === 'queasy' ? 'M8 15.2c1.3-1.1 2.7-1.1 4 0s2.7 1.1 4 0'
    : feeling === 'nauseous' ? 'M8.5 16h7'
    : 'M8 16.6c1.1-1.5 2.4-2.2 4-2.2s2.9.7 4 2.2';
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9.4} {...st} />
      {feeling === 'queasy' ? (
        <>
          <Path d="M7.4 9.2 10.4 11M7.4 11l3-1.8" {...st} strokeWidth={1.5} />
          <Path d="M13.6 9.2l3 1.8M13.6 11l3-1.8" {...st} strokeWidth={1.5} />
        </>
      ) : (
        <>
          <Circle cx={9} cy={10} r={1.15} fill={stroke} />
          <Circle cx={15} cy={10} r={1.15} fill={stroke} />
        </>
      )}
      <Path d={mouth} {...st} />
    </Svg>
  );
};

export function SicknessLogScreen({ navigation, route }: Props) {
  const initialTab: 'medic' | 'symptoms' =
    route.params?.tab === 'symptoms' || route.params?.symptomId ? 'symptoms'
      : route.params?.tab === 'medic' || route.params?.medicationId ? 'medic' : 'symptoms';
  const [tab, setTab] = useState<'medic' | 'symptoms'>(initialTab);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hBtn} hitSlop={8}>
          <AppText style={s.backArrow}>←</AppText>
        </TouchableOpacity>
        <AppText style={s.headerTitle}>{tab === 'medic' ? 'Medication log' : 'Symptoms log'}</AppText>
        <View style={s.hBtn} />
      </View>

      <View style={s.toggle}>
        {(['medic', 'symptoms'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.toggleBtn, tab === t && s.toggleBtnActive]}
            activeOpacity={0.85}
            onPress={() => setTab(t)}
          >
            <AppText style={[s.toggleText, tab === t && s.toggleTextOn]}>
              {t === 'medic' ? 'My medic' : 'My Symptoms'}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'symptoms'
        ? <SymptomForm navigation={navigation} route={route} />
        : <MedicationForm navigation={navigation} route={route} />}
    </SafeAreaView>
  );
}

// ── Symptom form ────────────────────────────────────────────────────────────
function SymptomForm({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const editingId: string | undefined = route.params?.symptomId;
  const existing = useSelector((st: RootState) => st.trackers.symptoms.find(e => e.id === editingId));
  const { logSymptom, editSymptom } = useSicknessTracker();

  const [feeling, setFeeling] = useState<SicknessFeeling | undefined>(existing?.feeling);
  const [symptom, setSymptom] = useState(existing?.symptom ?? '');
  const [date, setDate]       = useState(existing?.date ?? todayISO());
  const [severity, setSeverity] = useState<SicknessSeverity>(existing?.severity ?? 'moderate');
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>(existing?.temperatureUnit ?? 'C');
  const [temperature, setTemperature] = useState(existing?.temperature ? String(existing.temperature) : '');
  const [attachment, setAttachment] = useState<string | undefined>(existing?.attachmentUrl);
  const [notes, setNotes]     = useState(existing?.notes ?? '');

  const [symptomSheet, setSymptomSheet] = useState(false);
  const [severitySheet, setSeveritySheet] = useState(false);
  const [dateSheet, setDateSheet] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** Convert the entered reading rather than just relabelling the unit. */
  const switchTempUnit = (next: 'C' | 'F') => {
    if (next === tempUnit) return;
    const n = Number(temperature);
    if (temperature && Number.isFinite(n)) {
      const conv = next === 'F' ? (n * 9) / 5 + 32 : ((n - 32) * 5) / 9;
      setTemperature(String(Math.round(conv * 10) / 10));
    }
    setTempUnit(next);
  };

  const pickImage = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setErr('Allow photo access to attach a report.'); return; }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return;
    setUploading(true);
    try {
      const url = await uploadLocalFile(`sickness/${Date.now()}.jpg`, res.assets[0].uri);
      setAttachment(url);
    } catch { setErr('Could not attach photo. Try again.'); }
    finally { setUploading(false); }
  };
  const attachFile = () => Alert.alert('Attach report', undefined, [
    { text: 'Camera', onPress: () => pickImage(true) },
    { text: 'Gallery', onPress: () => pickImage(false) },
    ...(attachment ? [{ text: 'Remove', style: 'destructive' as const, onPress: () => setAttachment(undefined) }] : []),
    { text: 'Cancel', style: 'cancel' as const },
  ]);

  const onSave = async () => {
    if (!symptom) { setErr('Select a symptom'); return; }
    if (date > todayISO()) { setErr("You can't log a symptom for a future date."); return; }

    // A reading outside these bounds is a typo or the wrong unit, not a fever.
    if (temperature) {
      const n = Number(temperature);
      const [lo, hi] = tempUnit === 'C' ? [30, 45] : [86, 113];
      if (!Number.isFinite(n) || n < lo || n > hi) {
        setErr(`Temperature looks off for °${tempUnit} — check the value.`);
        return;
      }
    }

    setErr(null); setSaving(true);
    const data = {
      date, feeling, symptom, severity,
      temperature: temperature ? Number(temperature) : undefined,
      temperatureUnit: temperature ? tempUnit : undefined,
      attachmentUrl: attachment, notes: notes.trim() || undefined,
    };
    try {
      if (editingId) await editSymptom(editingId, data); else await logSymptom(data);
      navigation.goBack();
    } catch { setErr('Could not save. Check your connection.'); setSaving(false); }
  };

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingBottom: 32 + insets.bottom }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Feeling ── */}
      <View style={s.card}>
        <AppText style={s.cardTitle}>How are you feeling?</AppText>
        <View style={s.feelingRow}>
          {FEELING_OPTIONS.map(o => {
            const on = feeling === o.key;
            return (
              <TouchableOpacity
                key={o.key}
                style={s.feelingCell}
                activeOpacity={0.85}
                onPress={() => setFeeling(on ? undefined : o.key)}
              >
                <View style={[s.feelingIcon, on && s.feelingIconOn]}>
                  <FeelingFace feeling={o.key} on={on} />
                </View>
                <AppText style={[s.feelingLabel, on && s.feelingLabelOn]} numberOfLines={1}>
                  {o.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Symptom ── */}
      <View style={s.card}>
        <AppText style={s.cardTitle}>Select symptoms</AppText>
        <TouchableOpacity style={s.innerCard} activeOpacity={0.85} onPress={() => setSymptomSheet(true)}>
          <View style={s.innerRow}>
            <AppText style={[s.innerValue, !symptom && s.innerPlaceholder]} numberOfLines={1}>
              {symptom || 'Choose a symptom'}
            </AppText>
            <CaretGlyph />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Date ── */}
      <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => setDateSheet(true)}>
        <View style={s.headRow}>
          <AppText style={s.cardTitleFlat}>Date</AppText>
          <View style={s.headRight}>
            <AppText style={s.headValue}>{fmtDate(date)}</AppText>
            <CalendarGlyph />
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Severity ── */}
      <View style={s.card}>
        <AppText style={s.cardTitle}>Severity</AppText>
        <TouchableOpacity style={s.innerCard} activeOpacity={0.85} onPress={() => setSeveritySheet(true)}>
          <View style={s.innerRow}>
            <AppText style={s.innerValue}>{SEVERITY_OPTIONS.find(o => o.key === severity)?.label}</AppText>
            <CaretGlyph />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Temperature ── */}
      <View style={s.card}>
        <View style={s.headRow}>
          <AppText style={s.cardTitleFlat}>Temperature</AppText>
          <View style={s.unitToggle}>
            {(['C', 'F'] as const).map(u => (
              <TouchableOpacity
                key={u}
                style={[s.unitBtn, tempUnit === u && s.unitBtnActive]}
                activeOpacity={0.85}
                onPress={() => switchTempUnit(u)}
              >
                <AppText style={s.unitText}>{u}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={s.innerCard}>
          <View style={s.innerRow}>
            <TextInput
              style={s.tempInput as any}
              placeholder="37.8"
              placeholderTextColor="rgba(20,20,20,0.30)"
              keyboardType="decimal-pad"
              value={temperature}
              onChangeText={setTemperature}
            />
            <AppText style={s.tempUnit}>°{tempUnit}</AppText>
          </View>
        </View>
      </View>

      {/* ── Attachment ── */}
      <View style={s.card}>
        <AppText style={s.cardTitle}>
          Attach Report <AppText style={s.cardTitleMuted}>(Optional)</AppText>
        </AppText>
        <View style={s.attachRow}>
          <TouchableOpacity style={s.attachTile} activeOpacity={0.85} onPress={attachFile}>
            {attachment ? (
              <Image source={{ uri: attachment }} style={s.attachPreview} resizeMode="cover" />
            ) : (
              <>
                <DocGlyph />
                <AppText style={s.attachLabel}>{uploading ? 'Uploading…' : 'Add Report'}</AppText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Notes ── */}
      <View style={s.card}>
        <AppText style={s.cardTitle}>
          Notes <AppText style={s.cardTitleMuted}>(Optional)</AppText>
        </AppText>
        <View style={s.notesBox}>
          <TextInput
            style={s.notesInput as any}
            placeholder="Write about your symptoms…"
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
        <AppText style={s.saveText}>{saving ? 'Saving…' : 'Save'}</AppText>
      </TouchableOpacity>

      <PickerSheet
        visible={symptomSheet} title="Select symptom" options={COMMON_SYMPTOMS} allowCustom
        value={symptom} onSelect={setSymptom} onClose={() => setSymptomSheet(false)}
      />
      <PickerSheet
        visible={severitySheet} title="Severity" options={SEVERITY_OPTIONS.map(o => o.label)}
        value={SEVERITY_OPTIONS.find(o => o.key === severity)?.label}
        onSelect={label => setSeverity(SEVERITY_OPTIONS.find(o => o.label === label)!.key)}
        onClose={() => setSeveritySheet(false)}
      />
      <DatePickerSheet visible={dateSheet} title="Date" value={date} onConfirm={setDate} onClose={() => setDateSheet(false)} />
    </ScrollView>
  );
}

// ── Medication form ─────────────────────────────────────────────────────────
function MedicationForm({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const editingId: string | undefined = route.params?.medicationId;
  const existing = useSelector((st: RootState) => st.trackers.medications.find(e => e.id === editingId));
  const { logMedication, editMedication } = useSicknessTracker();

  const [medication, setMedication] = useState(existing?.medication ?? '');
  const [date, setDate]         = useState(existing?.date ?? todayISO());
  const [time, setTime]         = useState(existing?.time ?? nowHHMM());
  const [dosage, setDosage]     = useState(existing?.dosage ?? '');
  const [frequency, setFrequency] = useState(existing?.frequency ?? 'Once');
  const [foodTiming, setFoodTiming] = useState<MedicationFoodTiming>(existing?.foodTiming ?? 'after_food');
  const [purpose, setPurpose]   = useState(existing?.purpose ?? '');
  const [status, setStatus]     = useState<MedicationStatus>(existing?.status ?? 'taken');
  const [sideEffects, setSideEffects] = useState<string[]>(existing?.sideEffects ?? []);
  const [reminderEnabled, setReminderEnabled] = useState(existing?.reminderEnabled ?? false);
  const [reminderRepeat] = useState(existing?.reminderRepeat ?? 'Daily');
  const [attachment, setAttachment] = useState<string | undefined>(existing?.attachmentUrl);
  const [notes, setNotes]       = useState(existing?.notes ?? '');

  const [dateSheet, setDateSheet] = useState(false);
  const [timeSheet, setTimeSheet] = useState(false);
  const [freqSheet, setFreqSheet] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /**
   * §18 — "None" is mutually exclusive with the specific effects. Selecting it
   * clears them, and picking a specific effect clears None: "None, plus nausea
   * and a headache" is a contradiction that would also poison any later
   * analysis of which medications cause side effects.
   */
  const toggleSideEffect = (v: string) =>
    setSideEffects(cur => Sick.toggleSideEffect(cur, v));

  const attachFile = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return;
    setUploading(true);
    try {
      const url = await uploadLocalFile(`sickness/${Date.now()}.jpg`, res.assets[0].uri);
      setAttachment(url);
    } catch { setErr('Could not attach photo. Try again.'); }
    finally { setUploading(false); }
  };

  const onSave = async () => {
    if (!medication.trim()) { setErr('Enter the medication name'); return; }
    setErr(null); setSaving(true);
    const data = {
      date, time, medication: medication.trim(), dosage: dosage.trim() || undefined,
      frequency, foodTiming, purpose: purpose.trim() || undefined, status,
      sideEffects: sideEffects.length ? sideEffects : undefined,
      reminderEnabled, reminderRepeat: reminderEnabled ? reminderRepeat : undefined,
      attachmentUrl: attachment, notes: notes.trim() || undefined,
    };
    try {
      if (editingId) await editMedication(editingId, data); else await logMedication(data);
      navigation.goBack();
    } catch { setErr('Could not save. Check your connection.'); setSaving(false); }
  };

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingBottom: 32 + insets.bottom }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.card}>
        <AppText style={s.cardTitle}>Medication</AppText>
        <View style={s.innerCard}>
          <TextInput
            style={s.plainInput as any}
            placeholder="e.g. Paracetamol 650mg"
            placeholderTextColor="rgba(20,20,20,0.30)"
            value={medication}
            onChangeText={setMedication}
          />
        </View>
      </View>

      <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => setDateSheet(true)}>
        <View style={s.headRow}>
          <AppText style={s.cardTitleFlat}>Date</AppText>
          <View style={s.headRight}>
            <AppText style={s.headValue}>{fmtDate(date)}</AppText>
            <CalendarGlyph />
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => setTimeSheet(true)}>
        <View style={s.headRow}>
          <AppText style={s.cardTitleFlat}>Time</AppText>
          <AppText style={s.headValue}>{time}</AppText>
        </View>
      </TouchableOpacity>

      <View style={s.card}>
        <AppText style={s.cardTitle}>Dosage</AppText>
        <View style={s.innerCard}>
          <TextInput
            style={s.plainInput as any}
            placeholder="e.g. 650 mg"
            placeholderTextColor="rgba(20,20,20,0.30)"
            value={dosage}
            onChangeText={setDosage}
          />
        </View>
      </View>

      <View style={s.card}>
        <AppText style={s.cardTitle}>Frequency</AppText>
        <TouchableOpacity style={s.innerCard} activeOpacity={0.85} onPress={() => setFreqSheet(true)}>
          <View style={s.innerRow}>
            <AppText style={s.innerValue}>{frequency}</AppText>
            <CaretGlyph />
          </View>
        </TouchableOpacity>
      </View>

      <View style={s.card}>
        <AppText style={s.cardTitle}>Before / After Food</AppText>
        <View style={s.wrap}>
          {FOOD_TIMING_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.key}
              style={[s.pill, foodTiming === o.key && s.pillActive]}
              onPress={() => setFoodTiming(o.key)}
            >
              <AppText style={[s.pillText, foodTiming === o.key && s.pillTextOn]}>{o.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.card}>
        <AppText style={s.cardTitle}>Purpose</AppText>
        <View style={s.innerCard}>
          <TextInput
            style={s.plainInput as any}
            placeholder="e.g. Treating cold"
            placeholderTextColor="rgba(20,20,20,0.30)"
            value={purpose}
            onChangeText={setPurpose}
          />
        </View>
      </View>

      <View style={s.card}>
        <AppText style={s.cardTitle}>Did you take it?</AppText>
        <View style={s.wrap}>
          {MEDICATION_STATUS_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.key}
              style={[s.pill, status === o.key && s.pillActive]}
              onPress={() => setStatus(o.key)}
            >
              <AppText style={[s.pillText, status === o.key && s.pillTextOn]}>{o.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.card}>
        <AppText style={s.cardTitle}>
          Side effects <AppText style={s.cardTitleMuted}>(Optional)</AppText>
        </AppText>
        <View style={s.wrap}>
          {SIDE_EFFECT_OPTIONS.map(v => (
            <TouchableOpacity
              key={v}
              style={[s.pill, sideEffects.includes(v) && s.pillActive]}
              onPress={() => toggleSideEffect(v)}
            >
              <AppText style={[s.pillText, sideEffects.includes(v) && s.pillTextOn]}>{v}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.card}>
        <View style={s.headRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText style={s.cardTitleFlat}>Reminder</AppText>
            <AppText style={s.reminderHint}>{time} · {reminderRepeat}</AppText>
          </View>
          <TouchableOpacity
            onPress={() => setReminderEnabled(v => !v)}
            style={[s.switchTrack, reminderEnabled && s.switchTrackOn]}
          >
            <View style={[s.switchThumb, reminderEnabled && s.switchThumbOn]} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.card}>
        <AppText style={s.cardTitle}>
          Attach Prescription <AppText style={s.cardTitleMuted}>(Optional)</AppText>
        </AppText>
        <View style={s.attachRow}>
          <TouchableOpacity style={s.attachTile} activeOpacity={0.85} onPress={attachFile}>
            {attachment ? (
              <Image source={{ uri: attachment }} style={s.attachPreview} resizeMode="cover" />
            ) : (
              <>
                <DocGlyph />
                <AppText style={s.attachLabel}>{uploading ? 'Uploading…' : 'Add Prescription'}</AppText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.card}>
        <AppText style={s.cardTitle}>
          Notes <AppText style={s.cardTitleMuted}>(Optional)</AppText>
        </AppText>
        <View style={s.notesBox}>
          <TextInput
            style={s.notesInput as any}
            placeholder="Write about your medication…"
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
        <AppText style={s.saveText}>{saving ? 'Saving…' : 'Save'}</AppText>
      </TouchableOpacity>

      <DatePickerSheet visible={dateSheet} title="Date" value={date} onConfirm={setDate} onClose={() => setDateSheet(false)} />
      <AddTimeSheet visible={timeSheet} onAdd={setTime} onClose={() => setTimeSheet(false)} />
      <PickerSheet visible={freqSheet} title="Frequency" options={FREQUENCY_OPTIONS} value={frequency} onSelect={setFrequency} onClose={() => setFreqSheet(false)} />
    </ScrollView>
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
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: '#141414' },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: '#141414' },

  toggle: {
    flexDirection: 'row', alignItems: 'stretch', gap: 4,
    marginHorizontal: 20, marginVertical: 10, padding: 5,
    backgroundColor: Colors.white, borderRadius: 30,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 24, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#141414' },
  toggleText: { fontFamily: 'DMSans-SemiBold', fontSize: 15, letterSpacing: 0.12, color: '#141414' },
  toggleTextOn: { color: Colors.white },

  scroll: { paddingHorizontal: 20, paddingTop: 6, gap: 16 },

  // ── Cards ──
  card: {
    padding: 10, borderRadius: 30, gap: 10, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  cardTitle: {
    fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 26, color: '#141414',
    paddingHorizontal: 10, paddingVertical: 5,
  },
  cardTitleFlat: { fontFamily: 'DMSans-SemiBold', fontSize: 20, lineHeight: 26, color: '#141414' },
  cardTitleMuted: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#999999' },

  headRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    paddingLeft: 10, paddingRight: 12, paddingVertical: 5,
  },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 },
  headValue: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: '#141414', flexShrink: 1 },

  innerCard: {
    padding: 10, borderRadius: 30, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  innerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    paddingLeft: 10, paddingRight: 12, paddingVertical: 5,
  },
  innerValue: { flex: 1, minWidth: 0, fontFamily: 'DMSans-SemiBold', fontSize: 19, color: '#141414' },
  innerPlaceholder: { color: 'rgba(20,20,20,0.35)' },
  plainInput: {
    paddingHorizontal: 10, paddingVertical: 6,
    fontFamily: 'DMSans-Medium', fontSize: 17, color: '#141414',
  } as any,

  // ── Feeling ──
  feelingRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4, paddingBottom: 6 },
  feelingCell: { flex: 1, minWidth: 0, alignItems: 'center', gap: 8, paddingVertical: 4 },
  feelingIcon: {
    width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  feelingIconOn: { backgroundColor: '#141414', borderColor: '#141414' },
  feelingLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#141414' },
  feelingLabelOn: { color: '#141414' },

  // ── Temperature ──
  unitToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4, borderRadius: 12,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  unitBtn: {
    width: 34, paddingVertical: 2, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  unitBtnActive: { borderColor: HAIRLINE, backgroundColor: '#F6F7F8' },
  unitText: { fontFamily: 'DMSans-SemiBold', fontSize: 19, color: '#141414' },
  tempInput: {
    flex: 1, minWidth: 0, padding: 0,
    fontFamily: 'DMSans-SemiBold', fontSize: 19, color: '#141414',
  } as any,
  tempUnit: { fontFamily: 'DMSans-Bold', fontSize: 12, letterSpacing: 0.6, color: '#141414' },

  // ── Pills (medication form) ──
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 6, paddingBottom: 6 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: HAIRLINE, backgroundColor: Colors.white,
  },
  pillActive: { backgroundColor: '#141414', borderColor: '#141414' },
  pillText: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#494453' },
  pillTextOn: { color: Colors.white },
  reminderHint: { fontFamily: 'DMSans-Regular', fontSize: 13, color: '#999999' },

  switchTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#E5E5E5', padding: 3, justifyContent: 'center' },
  switchTrackOn: { backgroundColor: '#34C759' },
  switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.white },
  switchThumbOn: { alignSelf: 'flex-end' },

  // ── Attachment ──
  attachRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 6, paddingBottom: 6 },
  attachTile: {
    width: 120, height: 86, borderRadius: 20, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: HAIRLINE, ...CARD_SHADOW,
  },
  attachPreview: { width: '100%', height: '100%' },
  attachLabel: { fontFamily: 'DMSans-Medium', fontSize: 12, lineHeight: 16, color: '#141414' },

  // ── Notes ──
  notesBox: {
    height: 128, padding: 16, borderRadius: 20,
    backgroundColor: '#F6F7F8', borderWidth: 1, borderColor: '#C7C5D4',
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
