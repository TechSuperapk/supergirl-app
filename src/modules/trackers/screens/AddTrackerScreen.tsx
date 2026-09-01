/**
 * AddTrackerScreen — create a custom tracker (name, icon, color, unit, daily
 * target). Saved to the `trackers_custom` collection and shown on the Goals
 * home "All trackers" grid. Mirrors the Add Habit builder's style.
 */
import { BackArrowIcon } from '../../../shared/components/AppBackButton';
import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState } from '../../../store';
import { createDoc } from '../../../services/dataApi';
import { AppText } from '../../../shared/components/AppText';
import { Colors } from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { ColorPickerSheet, HABIT_COLORS } from '../components/HabitOverlays';

type Props = NativeStackScreenProps<any, 'AddTracker'>;

const EMOJIS = ['💧', '👟', '📖', '🏋️', '💊', '🧘', '🥗', '😴', '🩺', '📏', '❤️', '🧠', '💰', '🚭', '🚶', '🎯', '🩸', '⚖️', '🌸', '☀️'];

export function AddTrackerScreen({ navigation }: Props) {
  const user = useSelector((s: RootState) => s.auth.user);
  const [name, setName]     = useState('');
  const [emoji, setEmoji]   = useState('💧');
  const [color, setColor]   = useState(HABIT_COLORS[9]); // blue-ish
  const [unit, setUnit]     = useState('');
  const [target, setTarget] = useState('');
  const [sheet, setSheet]   = useState(false);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await createDoc('trackers_custom', {
        name: name.trim() || 'New Tracker',
        emoji,
        color,
        unit: unit.trim() || undefined,
        target: target ? Number(target) : undefined,
      });
      navigation.goBack();
    } catch (e) {
      // Backend must allowlist `trackers_custom` (see dataService). Fail soft.
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <BackArrowIcon />
        </TouchableOpacity>
        <AppText variant="headingSmall">Add Tracker</AppText>
        <TouchableOpacity onPress={onSave} disabled={saving} style={s.headerBtn}>
          <AppText variant="button" color={Colors.primary}>{saving ? '…' : 'Save'}</AppText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Preview: color circle + emoji + name */}
        <View style={s.nameRow}>
          <TouchableOpacity onPress={() => setSheet(true)} style={[s.iconCircle, { backgroundColor: color }]}>
            <AppText style={{ fontSize: 26 }}>{emoji}</AppText>
          </TouchableOpacity>
          <TextInput
            style={s.nameInput}
            placeholder="Tracker name"
            placeholderTextColor={Colors.textLight}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Icon picker */}
        <View style={s.card}>
          <AppText variant="headingSmall" style={{ marginBottom: 12 }}>Icon</AppText>
          <View style={s.emojiWrap}>
            {EMOJIS.map(e => (
              <TouchableOpacity key={e} style={[s.emojiBtn, emoji === e && s.emojiBtnActive]} onPress={() => setEmoji(e)}>
                <AppText style={{ fontSize: 24 }}>{e}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color */}
        <TouchableOpacity style={s.card} onPress={() => setSheet(true)} activeOpacity={0.9}>
          <View style={s.rowBetween}>
            <AppText variant="headingSmall">Color</AppText>
            <View style={[s.colorDot, { backgroundColor: color }]} />
          </View>
        </TouchableOpacity>

        {/* Unit + target */}
        <View style={s.card}>
          <View style={s.fieldRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="label" color={Colors.textSecondary}>Unit</AppText>
              <TextInput
                style={s.underline}
                placeholder="Glasses, km, kg…"
                placeholderTextColor={Colors.textLight}
                value={unit}
                onChangeText={setUnit}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label" color={Colors.textSecondary}>Daily target</AppText>
              <TextInput
                style={s.underline}
                placeholder="e.g. 8"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
                value={target}
                onChangeText={setTarget}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={onSave} disabled={saving} activeOpacity={0.9}>
          <AppText variant="button" color={Colors.white}>{saving ? 'Saving…' : 'Create Tracker'}</AppText>
        </TouchableOpacity>
      </ScrollView>

      <ColorPickerSheet visible={sheet} current={color} onSelect={setColor} onClose={() => setSheet(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgSplash },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  headerBtn: { minWidth: 48, paddingVertical: 6 },
  scroll: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 48 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 8 },
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  nameInput: { flex: 1, fontFamily: 'DMSans-Bold', fontSize: 22, color: Colors.textPrimary } as any,

  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, ...Shadows.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  colorDot: { width: 28, height: 28, borderRadius: 14 },

  emojiWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emojiBtn: {
    width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bgInput,
  },
  emojiBtnActive: { borderWidth: 2, borderColor: Colors.primary },

  fieldRow: { flexDirection: 'row', gap: Spacing.lg },
  underline: {
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingVertical: 8, fontSize: 15, fontFamily: 'DMSans-Regular', color: Colors.textPrimary,
  } as any,

  saveBtn: {
    backgroundColor: Colors.black, borderRadius: Radius.full,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.sm,
  },
});
