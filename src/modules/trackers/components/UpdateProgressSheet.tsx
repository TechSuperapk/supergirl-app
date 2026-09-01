/**
 * UpdateProgressSheet — "Update process" bottom sheet used by the group-habit
 * cards. A minus/plus stepper around a large value with a per-challenge unit
 * (ml, km, pages…), then Save.
 *
 * Built as its own Modal rather than reusing the shared BottomSheet because the
 * spec calls for a 40px corner radius and a 112px grabber, where the shared one
 * uses 24 and 40 — overriding those would have meant fighting its styles.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal, View, TouchableOpacity, TouchableWithoutFeedback, TextInput, StyleSheet,
} from 'react-native';

import { AppText } from '../../../shared/components/AppText';
import { Colors } from '../../../shared/theme/colors';
import { Spacing } from '../../../shared/theme/spacing';

interface Props {
  visible:   boolean;
  /** Prompt under the title, e.g. "How much water did you drink?" */
  question:  string;
  /** Display unit shown under the value — ml / km / pages … */
  unit:      string;
  /** Starting value when the sheet opens. */
  value:     number;
  /** Amount each −/+ press changes the value by. */
  step?:     number;
  /** Clamp — defaults to 0…no upper bound. */
  min?:      number;
  max?:      number;
  /** Decimal places to display; 0 keeps it integer. */
  decimals?: number;
  onClose:   () => void;
  onSave:    (next: number) => void;
}

export function UpdateProgressSheet({
  visible, question, unit, value, step = 1, min = 0, max, decimals = 0, onClose, onSave,
}: Props) {
  const [draft, setDraft] = useState(value);

  // Re-seed whenever the sheet is reopened, so it always reflects current progress.
  useEffect(() => { if (visible) setDraft(value); }, [visible, value]);

  const clamp = (n: number) => {
    const lo = Math.max(min, n);
    return max != null ? Math.min(max, lo) : lo;
  };
  const round = (n: number) => Number(n.toFixed(decimals));
  const bump = (dir: -1 | 1) => setDraft(d => round(clamp(d + dir * step)));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.backdrop} />
      </TouchableWithoutFeedback>

      <View style={s.sheet}>
        <View style={s.grabber} />

        <AppText style={s.title}>Update process</AppText>
        <AppText style={s.subtitle}>{question}</AppText>

        <View style={s.stepperRow}>
          <TouchableOpacity
            style={s.circleBtn}
            activeOpacity={0.7}
            onPress={() => bump(-1)}
            disabled={draft <= min}
          >
            <View style={[s.minus, draft <= min && { opacity: 0.35 }]} />
          </TouchableOpacity>

          <View style={s.valueCol}>
            <TextInput
              style={s.value}
              keyboardType="decimal-pad"
              value={String(draft)}
              onChangeText={t => {
                const n = Number(t.replace(/[^0-9.]/g, ''));
                setDraft(Number.isFinite(n) ? clamp(n) : 0);
              }}
            />
            <AppText style={s.unit}>{unit}</AppText>
          </View>

          <TouchableOpacity
            style={s.circleBtn}
            activeOpacity={0.7}
            onPress={() => bump(1)}
            disabled={max != null && draft >= max}
          >
            <View style={[s.plusH, max != null && draft >= max && { opacity: 0.35 }]} />
            <View style={[s.plusV, max != null && draft >= max && { opacity: 0.35 }]} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.saveBtn} activeOpacity={0.9} onPress={() => onSave(round(draft))}>
          <AppText style={s.saveText}>Save</AppText>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.bgOverlay },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 40, borderTopRightRadius: 40,
    borderWidth: 1, borderColor: 'rgba(153,153,153,0.20)',
    paddingTop: 10, paddingBottom: 40, paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  grabber: {
    width: 112, height: 4, borderRadius: 9999,
    backgroundColor: '#EBEBEB', marginBottom: 26,
  },

  title:    { fontFamily: 'DMSans-Bold', fontSize: 32, color: '#141414', textAlign: 'center' },
  subtitle: { fontFamily: 'DMSans-Medium', fontSize: 20, color: '#999999', textAlign: 'center', marginTop: 4 },

  stepperRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 40, marginTop: 30,
  },
  circleBtn: {
    width: 67, height: 67, borderRadius: 50,
    backgroundColor: 'rgba(153,153,153,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  // Drawn as bars rather than glyphs so the weight matches at any font scale.
  minus: { width: 20, height: 3.4, borderRadius: 2, backgroundColor: '#141414' },
  plusH: { position: 'absolute', width: 20, height: 3.4, borderRadius: 2, backgroundColor: '#141414' },
  plusV: { position: 'absolute', width: 3.4, height: 20, borderRadius: 2, backgroundColor: '#141414' },

  valueCol: { alignItems: 'center', minWidth: 90 },
  value: {
    fontFamily: 'DMSans-SemiBold', fontSize: 40, color: '#141414',
    textAlign: 'center', padding: 0, minWidth: 90,
  },
  unit: { fontFamily: 'DMSans-Medium', fontSize: 20, color: '#999999', opacity: 0.9, marginTop: -2 },

  saveBtn: {
    alignSelf: 'stretch', height: 64, borderRadius: 20, backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center', marginTop: 40,
  },
  saveText: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: Colors.white },
});
