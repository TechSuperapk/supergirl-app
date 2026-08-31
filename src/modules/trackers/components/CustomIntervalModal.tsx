/**
 * CustomIntervalModal — the "Customize Repeat Interval" screen shown when the
 * user taps ✎ Custom in Repeat Cycle. Full-screen modal with Day/Weekly/
 * Monthly/Yearly tabs and their radio options (some with inline number inputs).
 */
import React, { useState } from 'react';
import {
  View, Modal, TouchableOpacity, TextInput, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../../shared/components/AppText';
import { Colors } from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { useKeyboardInset } from './HabitOverlays';
import { CustomInterval, CustomIntervalMode } from '../types';

type Unit = CustomInterval['unit'];
const TABS: { key: Unit; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];
const UNIT_WORD: Record<Unit, string> = { day: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };

export function summarizeInterval(ci: CustomInterval): string {
  const w = UNIT_WORD[ci.unit];
  switch (ci.mode) {
    case 'every':          return `Every ${w}`;
    case 'everyN':         return `Every ${ci.n ?? 2} ${w}s`;
    case 'anytimeInCycle': return `Anytime in a ${ci.n ?? 2}-${w} cycle`;
    case 'daysOnOff':      return `${ci.daysOn ?? 1} on, ${ci.daysOff ?? 1} off`;
    default:               return 'Custom';
  }
}

export function CustomIntervalModal({
  visible, initial, onConfirm, onClose,
}: {
  visible: boolean;
  initial?: CustomInterval;
  onConfirm: (ci: CustomInterval) => void;
  onClose: () => void;
}) {
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? 'day');
  const [mode, setMode] = useState<CustomIntervalMode>(initial?.mode ?? 'every');
  const [n, setN] = useState(String(initial?.n ?? 2));
  const [daysOn, setDaysOn] = useState(String(initial?.daysOn ?? 1));
  const [daysOff, setDaysOff] = useState(String(initial?.daysOff ?? 1));

  const w = UNIT_WORD[unit];
  const keyboardInset = useKeyboardInset();

  // NOTE: these are plain JSX-returning functions (NOT nested components) so the
  // number TextInputs reconcile by position and keep focus while typing.
  const renderRow = (m: CustomIntervalMode, content: React.ReactNode) => {
    const active = mode === m;
    return (
      <TouchableOpacity
        style={[o.row, active && o.rowActive]}
        activeOpacity={0.9}
        onPress={() => setMode(m)}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          {content}
        </View>
        <View style={[o.radio, active && o.radioActive]}>
          {active ? <View style={o.radioDot} /> : null}
        </View>
      </TouchableOpacity>
    );
  };

  const numInput = (value: string, onChangeText: (t: string) => void, key: string) => (
    <TextInput
      key={key}
      style={o.numInput}
      value={value}
      onChangeText={onChangeText}
      keyboardType="numeric"
      maxLength={3}
    />
  );

  const label = (active: boolean, text: string, key: string) => (
    <AppText key={key} variant="body" color={active ? Colors.white : Colors.textPrimary}
      style={active ? { fontFamily: 'DMSans-Bold' } : undefined}>{text}</AppText>
  );

  const confirm = () => {
    const ci: CustomInterval = { unit, mode };
    if (mode === 'everyN' || mode === 'anytimeInCycle') ci.n = Math.max(1, Number(n) || 1);
    if (mode === 'daysOnOff') { ci.daysOn = Math.max(1, Number(daysOn) || 1); ci.daysOff = Math.max(0, Number(daysOff) || 0); }
    onConfirm(ci);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* The card sits at flex-end, so padding on the backdrop lifts it clear
          of the keyboard. iOS only — Android's adjustResize already shrinks
          the modal (see useKeyboardInset). */}
      <View style={[o.backdrop, { paddingBottom: keyboardInset }]}>
        <SafeAreaView style={o.card} edges={['bottom']}>
          <View style={o.grabber} />
          <AppText variant="headingMedium" style={{ marginBottom: Spacing.lg }}>Customize Repeat Interval</AppText>

          {/* Tabs */}
          <View style={o.tabs}>
            {TABS.map(t => {
              const active = unit === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[o.tab, active && o.tabActive]}
                  onPress={() => {
                    setUnit(t.key);
                    if (t.key !== 'day' && mode === 'daysOnOff') setMode('every');
                  }}
                >
                  <AppText variant="body" color={active ? Colors.textPrimary : Colors.textMuted}
                    style={active ? { fontFamily: 'DMSans-Bold' } : undefined}>{t.label}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Options */}
          <View style={{ gap: 12, marginBottom: Spacing.xl }}>
            {renderRow('every', label(mode === 'every', `Every ${w}`, 'every-l'))}

            {renderRow('everyN', [
              label(mode === 'everyN', 'Every ', 'n-l1'),
              numInput(n, setN, 'n-in'),
              label(mode === 'everyN', ` ${w}`, 'n-l2'),
            ])}

            {renderRow('anytimeInCycle', [
              label(mode === 'anytimeInCycle', 'Anytime in a ', 'c-l1'),
              numInput(n, setN, 'c-in'),
              label(mode === 'anytimeInCycle', `-${w} cycle`, 'c-l2'),
            ])}

            {unit === 'day' && renderRow('daysOnOff', [
              numInput(daysOn, setDaysOn, 'on-in'),
              label(mode === 'daysOnOff', ' days on, ', 'on-l'),
              numInput(daysOff, setDaysOff, 'off-in'),
              label(mode === 'daysOnOff', ' days off', 'off-l'),
            ])}
          </View>

          {/* Actions */}
          <View style={o.actions}>
            <TouchableOpacity style={o.ghostBtn} onPress={onClose}>
              <AppText variant="button" color={Colors.textMuted}>Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={o.confirmBtn} onPress={confirm}>
              <AppText variant="button" color={Colors.white}>Confirm</AppText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const o = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.bgOverlay, justifyContent: 'flex-end' },
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, marginBottom: Spacing.md },
  tabs: { flexDirection: 'row', backgroundColor: Colors.bgInput, borderRadius: Radius.md, padding: 4, marginBottom: Spacing.lg },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.sm },
  tabActive: { backgroundColor: Colors.white },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
    paddingVertical: 16, paddingHorizontal: 18,
  },
  rowActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: Colors.white },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.white },
  numInput: {
    minWidth: 40, borderBottomWidth: 1.5, borderBottomColor: Colors.borderStrong,
    textAlign: 'center', paddingVertical: 2, fontFamily: 'DMSans-Bold', fontSize: 15, color: Colors.textPrimary,
  } as any,
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ghostBtn: { paddingVertical: 16, paddingHorizontal: 24 },
  confirmBtn: { flex: 1, marginLeft: Spacing.md, backgroundColor: Colors.black, borderRadius: Radius.full, paddingVertical: 16, alignItems: 'center' },
});
