/**
 * HabitOverlays — all the bottom-sheets & dialogs used by the Add Habit screen:
 *   BottomSheet, ConfirmDialog, ColorPickerSheet, TargetAmountSheet,
 *   AddTimeSheet (time wheel), NotificationTypeSheet, ReminderSheet,
 *   DatePickerSheet (month calendar).
 *
 * Self-contained (RN Modal + ScrollView) — no extra native deps.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Modal, TouchableOpacity, TouchableWithoutFeedback, ScrollView,
  TextInput, StyleSheet, NativeSyntheticEvent, NativeScrollEvent,
  Keyboard, Platform,
} from 'react-native';
import { AppText } from '../../../shared/components/AppText';
import { useGridCellWidth } from '../../../shared/hooks/useGridCellWidth';
import { Colors } from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import {
  HabitNotificationType, ReminderOffset,
} from '../types';

/**
 * How far to lift a bottom sheet so the keyboard doesn't cover its inputs.
 *
 * Android only: the manifest sets `windowSoftInputMode="adjustResize"`, so the
 * modal's own container already shrinks when the keyboard appears and a sheet
 * pinned to `bottom: 0` sits above it. Offsetting there too would push the
 * sheet a full keyboard-height off the top of the screen.
 *
 * iOS modals don't resize at all, so the inset is applied by hand. `willShow`
 * (rather than `didShow`) fires alongside the keyboard animation, so the two
 * move together instead of the sheet jumping after the fact.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', e => setInset(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setInset(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  return inset;
}

// ── Base bottom sheet ─────────────────────────────────────────────────────────
export function BottomSheet({
  visible, onClose, title, children,
}: {
  visible: boolean; onClose: () => void; title?: string; children: React.ReactNode;
}) {
  const keyboardInset = useKeyboardInset();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Tapping the backdrop dismisses the keyboard first if it's open, so a
          stray tap while typing doesn't discard what the user was entering. */}
      <TouchableWithoutFeedback
        onPress={() => { if (keyboardInset > 0) Keyboard.dismiss(); else onClose(); }}
      >
        <View style={s.backdrop} />
      </TouchableWithoutFeedback>
      <View style={[s.sheet, { bottom: keyboardInset }]}>
        <View style={s.grabber} />
        {title ? <AppText variant="headingSmall" style={{ marginBottom: Spacing.md }}>{title}</AppText> : null}
        {children}
      </View>
    </Modal>
  );
}

// ── Centered confirm dialog ───────────────────────────────────────────────────
export function ConfirmDialog({
  visible, title, message, confirmLabel, cancelLabel = 'Cancel',
  onCancel, onConfirm, destructive,
}: {
  visible: boolean; title: string; message: string; confirmLabel: string;
  /** Override for question-style dialogs where "Cancel" reads wrong
   *  (e.g. "Not Yet"). */
  cancelLabel?: string;
  onCancel: () => void; onConfirm: () => void; destructive?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.dialogWrap}>
        <View style={s.dialog}>
          <AppText variant="headingSmall" style={{ marginBottom: 6 }}>{title}</AppText>
          <AppText variant="body" color={Colors.textSecondary} style={{ marginBottom: Spacing.lg }}>
            {message}
          </AppText>
          <View style={s.dialogRow}>
            <TouchableOpacity style={s.dialogCancel} onPress={onCancel}>
              <AppText variant="button" color={Colors.textMuted}>{cancelLabel}</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.dialogConfirm, destructive && { backgroundColor: Colors.black }]}
              onPress={onConfirm}
            >
              <AppText variant="button" color={Colors.white}>{confirmLabel}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Color picker ──────────────────────────────────────────────────────────────
export const HABIT_COLORS = [
  '#FF5A5A', '#FF9F40', '#FFC24B', '#FFEB3B', '#D4F84B',
  '#6EE86E', '#42E29B', '#37E0C8', '#3ED8E8', '#4AA3FF',
  '#4A63FF', '#7B5CFF', '#B14BFF', '#F04BFF', '#FF5A7A',
];

export function ColorPickerSheet({
  visible, current, onSelect, onClose,
}: {
  visible: boolean; current: string; onSelect: (c: string) => void; onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Select Color">
      <View style={s.colorGrid}>
        {HABIT_COLORS.map(c => (
          <TouchableOpacity
            key={c}
            style={[s.swatch, { backgroundColor: c }, current === c && s.swatchActive]}
            onPress={() => { onSelect(c); onClose(); }}
          />
        ))}
      </View>
    </BottomSheet>
  );
}

// ── Set target amount ─────────────────────────────────────────────────────────
export function TargetAmountSheet({
  visible, amount, unit, onConfirm, onClose,
}: {
  visible: boolean; amount?: number; unit?: string;
  onConfirm: (amount: number, unit: string) => void; onClose: () => void;
}) {
  const [amt, setAmt] = useState(amount ? String(amount) : '');
  const [u, setU] = useState(unit ?? '');
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Set Target Amount">
      <View style={s.targetRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color={Colors.textSecondary}>Target Amount</AppText>
          <TextInput
            style={s.underlineInput}
            placeholder="Quantity per routine"
            placeholderTextColor={Colors.textLight}
            keyboardType="numeric"
            value={amt}
            onChangeText={setAmt}
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color={Colors.textSecondary}>Unit</AppText>
          <TextInput
            style={s.underlineInput}
            placeholder="Times, km, etc."
            placeholderTextColor={Colors.textLight}
            value={u}
            onChangeText={setU}
          />
        </View>
      </View>
      <PrimaryButton
        label="Confirm"
        onPress={() => { onConfirm(Number(amt) || 0, u.trim()); onClose(); }}
      />
    </BottomSheet>
  );
}

// ── Time wheel ────────────────────────────────────────────────────────────────
const ITEM_H = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55
const pad = (n: number) => String(n).padStart(2, '0');

function WheelColumn({
  data, value, onChange,
}: { data: number[]; value: number; onChange: (v: number) => void }) {
  const ref = useRef<ScrollView>(null);
  const idx = Math.max(0, data.indexOf(value));
  const onMomentum = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(data.length - 1, i));
    onChange(data[clamped]);
  };
  return (
    <View style={s.wheelCol}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        contentOffset={{ x: 0, y: idx * ITEM_H }}
        onMomentumScrollEnd={onMomentum}
      >
        {data.map(n => (
          <View key={n} style={s.wheelItem}>
            <AppText variant="headingMedium" color={n === value ? Colors.textPrimary : Colors.textLight}>
              {pad(n)}
            </AppText>
          </View>
        ))}
      </ScrollView>
      <View pointerEvents="none" style={s.wheelHighlight} />
    </View>
  );
}

export function AddTimeSheet({
  visible, onAdd, onClose, initial,
}: {
  visible: boolean; onAdd: (hhmm: string) => void; onClose: () => void;
  /** HH:mm to open on — set when editing an existing slot rather than adding. */
  initial?: string;
}) {
  const [h, setH] = useState(17);
  const [m, setM] = useState(0);

  // Seed the wheels each time the sheet opens, so editing 09:00 starts at
  // 09:00 rather than the default.
  useEffect(() => {
    if (!visible) return;
    if (initial) {
      const [hh, mm] = initial.split(':').map(Number);
      if (!Number.isNaN(hh)) setH(hh);
      if (!Number.isNaN(mm)) setM(mm - (mm % 5));
    }
  }, [visible, initial]);
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Add Time">
      <View style={s.wheelRow}>
        <WheelColumn data={HOURS} value={h} onChange={setH} />
        <AppText variant="headingLarge" color={Colors.textLight}>:</AppText>
        <WheelColumn data={MINUTES} value={m} onChange={setM} />
      </View>
      <View style={s.sheetActions}>
        <TouchableOpacity style={s.ghostBtn} onPress={onClose}>
          <AppText variant="button" color={Colors.textMuted}>Cancel</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.darkPill}
          onPress={() => { onAdd(`${pad(h)}:${pad(m)}`); onClose(); }}
        >
          <AppText variant="button" color={Colors.white}>Add</AppText>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// ── Notification type ─────────────────────────────────────────────────────────
export function NotificationTypeSheet({
  visible, value, onSelect, onClose,
}: {
  visible: boolean; value: HabitNotificationType;
  onSelect: (t: HabitNotificationType) => void; onClose: () => void;
}) {
  const opt = (t: HabitNotificationType, label: string) => (
    <TouchableOpacity style={s.listOption} onPress={() => { onSelect(t); onClose(); }}>
      <AppText variant="body" color={value === t ? Colors.textPrimary : Colors.textSecondary}
        style={value === t ? { fontFamily: 'DMSans-Bold' } : undefined}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Notification">
      {opt('push', 'Push Notification')}
      {opt('sound_alarm', 'Sound Alarm')}
    </BottomSheet>
  );
}

// ── Reminder ──────────────────────────────────────────────────────────────────
const REMINDER_OPTIONS: { value: ReminderOffset; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: '5m', label: '5 minutes before' },
  { value: '10m', label: '10 minutes before' },
  { value: '15m', label: '15 minutes before' },
  { value: '30m', label: '30 minutes before' },
  { value: '1h', label: '1 hour before' },
  { value: '12h', label: '12 hour before' },
  { value: '1d', label: '1 day before' },
];

export function ReminderSheet({
  visible, value, onConfirm, onClose,
}: {
  visible: boolean; value: ReminderOffset;
  onConfirm: (v: ReminderOffset) => void; onClose: () => void;
}) {
  const [sel, setSel] = useState<ReminderOffset>(value);
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Remainder">
      <View style={s.reminderGrid}>
        {REMINDER_OPTIONS.map(o => (
          <TouchableOpacity
            key={o.value}
            style={[s.reminderPill, sel === o.value && s.reminderPillActive]}
            onPress={() => setSel(o.value)}
          >
            <AppText variant="body" color={sel === o.value ? Colors.white : Colors.textSecondary}>
              {o.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
      <PrimaryButton label="Confirm" onPress={() => { onConfirm(sel); onClose(); }} />
    </BottomSheet>
  );
}

// ── Date picker (month calendar) ──────────────────────────────────────────────
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const toISO = (d: Date) => d.toISOString().split('T')[0];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DatePickerSheet({
  visible, title, value, min, onConfirm, onClose,
}: {
  visible: boolean; title: string; value?: string; min?: string;
  onConfirm: (iso: string) => void; onClose: () => void;
}) {
  const initial = value ? new Date(value + 'T00:00:00') : new Date();
  const [sel, setSel] = useState<Date>(initial);
  const [view, setView] = useState<{ y: number; m: number }>({
    y: initial.getFullYear(), m: initial.getMonth(),
  });
  // Whole-pixel column widths — a %-width 7th cell wraps on Android. See
  // useGridCellWidth for the full explanation.
  const { onLayout: onGridLayout, cellWidth } = useGridCellWidth(7);

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    // Monday-first offset
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(view.y, view.m, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [view.y, view.m]);

  const minDate = min ? new Date(min + 'T00:00:00') : null;
  const isDisabled = (d: Date) => (minDate ? d < minDate : false);
  const shiftMonth = (delta: number) => {
    const m = view.m + delta;
    setView({ y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="label" color={Colors.textSecondary}>{title}</AppText>
      <AppText variant="displayMedium" style={{ marginBottom: Spacing.md }}>
        {WEEKDAY_SHORT[sel.getDay()]}, {MONTH_NAMES[sel.getMonth()].slice(0, 3)} {sel.getDate()}
      </AppText>

      <View style={s.calHeader}>
        <TouchableOpacity onPress={() => shiftMonth(-1)} style={s.calNav}>
          <AppText variant="headingSmall" color={Colors.textMuted}>‹</AppText>
        </TouchableOpacity>
        <AppText variant="headingSmall">{MONTH_NAMES[view.m]} {view.y}</AppText>
        <TouchableOpacity onPress={() => shiftMonth(1)} style={s.calNav}>
          <AppText variant="headingSmall" color={Colors.textMuted}>›</AppText>
        </TouchableOpacity>
      </View>

      <View style={s.calWeekRow}>
        {WEEKDAYS.map(w => (
          <AppText key={w} variant="caption" color={Colors.textMuted}
            style={[s.calWeekCell, cellWidth ? { width: cellWidth } : null]}>{w}</AppText>
        ))}
      </View>

      <View style={s.calGrid} onLayout={onGridLayout}>
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={[s.calCell, { width: cellWidth }]} />;
          const selected = toISO(d) === toISO(sel);
          const disabled = isDisabled(d);
          return (
            <TouchableOpacity
              key={toISO(d)}
              style={[s.calCell, { width: cellWidth }]}
              disabled={disabled}
              onPress={() => setSel(d)}
            >
              <View style={[s.calDay, selected && s.calDaySelected]}>
                <AppText
                  variant="body"
                  color={disabled ? Colors.textLight : selected ? Colors.white : Colors.textPrimary}
                >
                  {pad(d.getDate())}
                </AppText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={s.sheetActions}>
        <TouchableOpacity style={s.ghostBtn} onPress={onClose}>
          <AppText variant="button" color={Colors.textMuted}>Cancel</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={s.darkPill} onPress={() => { onConfirm(toISO(sel)); onClose(); }}>
          <AppText variant="button" color={Colors.white}>Confirm</AppText>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
/**
 * The design's pill switch. RN's own <Switch> renders a near-white track on
 * iOS when off, which disappeared against these white cards — so the off state
 * here is an outlined track with a grey knob, and on is a filled blue track
 * with a white knob. Both states are visible on white.
 */
export function AppToggle({
  value, onValueChange, disabled,
}: { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      activeOpacity={0.85}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[s.tgTrack, value ? s.tgTrackOn : s.tgTrackOff, disabled && { opacity: 0.5 }]}
    >
      <View style={[s.tgKnob, value ? s.tgKnobOn : s.tgKnobOff]} />
    </TouchableOpacity>
  );
}

// ── Generic multi-select grid sheet ───────────────────────────────────────────
export interface ChoiceOption { key: number; label: string }

/**
 * Checkbox-style grid used by every "Select …" popup in Repeat Cycle.
 * Selection is held locally and only handed back on Confirm, so backing out
 * with Cancel/backdrop leaves the habit untouched.
 */
export function MultiChoiceSheet({
  visible, title, options, selected, columns = 4, onConfirm, onClose,
}: {
  visible: boolean;
  title: string;
  options: ChoiceOption[];
  selected: number[];
  columns?: number;
  onConfirm: (keys: number[]) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<number[]>(selected);

  // Re-seed each time it opens, so reopening shows what's actually saved
  // rather than whatever was half-selected last time.
  useEffect(() => { if (visible) setPicked(selected); }, [visible]);

  const toggle = (k: number) =>
    setPicked(p => (p.includes(k) ? p.filter(x => x !== k) : [...p, k]));

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={s.msGrid}>
        {options.map(o => {
          const on = picked.includes(o.key);
          return (
            <TouchableOpacity
              key={o.key}
              style={[s.msCell, { width: `${100 / columns}%` }]}
              activeOpacity={0.8}
              onPress={() => toggle(o.key)}
            >
              <View style={[s.msPill, on && s.msPillOn]}>
                <AppText variant="bodySmall" color={on ? Colors.white : Colors.textSecondary}
                  numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {o.label}
                </AppText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <PrimaryButton label="Confirm" onPress={() => { onConfirm(picked); onClose(); }} />
    </BottomSheet>
  );
}

// ── Shared primary button ─────────────────────────────────────────────────────
export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.primaryBtn} onPress={onPress} activeOpacity={0.9}>
      <AppText variant="button" color={Colors.white}>{label}</AppText>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.bgOverlay },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: Spacing.lg, paddingBottom: Spacing['2xl'],
  },
  grabber: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, marginBottom: Spacing.md,
  },

  // dialog
  dialogWrap: { flex: 1, backgroundColor: Colors.bgOverlay, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  dialog: { width: '100%', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg },
  dialogRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.md },
  dialogCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  dialogConfirm: { backgroundColor: Colors.black, borderRadius: Radius.full, paddingVertical: 12, paddingHorizontal: 24 },

  // color
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' },
  swatch: { width: 48, height: 48, borderRadius: 24 },
  swatchActive: { borderWidth: 3, borderColor: Colors.black },

  // target
  targetRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.xl },
  underlineInput: {
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingVertical: 8, fontSize: 15, fontFamily: 'DMSans-Regular', color: Colors.textPrimary,
  } as any,

  // wheel
  wheelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing.lg },
  wheelCol: { height: ITEM_H * 3, width: 90, overflow: 'hidden' },
  wheelItem: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  wheelHighlight: {
    position: 'absolute', top: ITEM_H, left: 0, right: 0, height: ITEM_H,
    backgroundColor: Colors.bgInput, borderRadius: Radius.md, zIndex: -1,
  },

  sheetActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  ghostBtn: { paddingVertical: 14, paddingHorizontal: 20 },
  darkPill: { backgroundColor: Colors.black, borderRadius: Radius.full, paddingVertical: 14, paddingHorizontal: 40 },

  // notification list
  listOption: { paddingVertical: 16, alignItems: 'center' },

  // reminder
  reminderGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: Spacing.lg },
  reminderPill: {
    width: '48%', paddingVertical: 14, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  reminderPillActive: { backgroundColor: Colors.black, borderColor: Colors.black },

  // calendar
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  calNav: { padding: 8, minWidth: 32, alignItems: 'center' },
  calWeekRow: { flexDirection: 'row', marginBottom: 6 },
  calWeekCell: { textAlign: 'center' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.md },
  calCell: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calDay: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  calDaySelected: { backgroundColor: Colors.black },

  primaryBtn: {
    backgroundColor: Colors.black, borderRadius: Radius.full,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.sm,
  },

  // Toggle
  tgTrack: {
    width: 72, height: 40, borderRadius: 20,
    padding: 4, justifyContent: 'center',
  },
  tgTrackOff: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: 'rgba(153,153,153,0.30)' },
  tgTrackOn:  { backgroundColor: '#1668FF' },
  tgKnob: { width: 30, height: 30, borderRadius: 15 },
  tgKnobOff: { backgroundColor: '#999999', alignSelf: 'flex-start' },
  tgKnobOn:  { backgroundColor: Colors.white, alignSelf: 'flex-end' },

  // Multi-select grid
  msGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.sm },
  msCell: { padding: 4 },
  msPill: {
    height: 44, borderRadius: 12, paddingHorizontal: 6,
    backgroundColor: 'rgba(153,153,153,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  msPillOn: { backgroundColor: Colors.black },
});
