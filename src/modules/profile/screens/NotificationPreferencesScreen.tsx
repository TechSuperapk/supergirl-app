/**
 * NotificationPreferencesScreen.tsx
 *
 * Extends Phase 2's NotificationsScreen with:
 *  - Push permission status display
 *  - Individual reminder time pickers
 *  - Schedule / cancel local reminders
 */
import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Alert, Platform, Linking,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import DateTimePicker     from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useSelector }    from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }      from '../../../store';
import { AppHeader }      from '../../../shared/components/AppHeader';
import { AppText }        from '../../../shared/components/AppText';
import { AppButton }      from '../../../shared/components/AppButton';
import { Colors }         from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import {
  scheduleDailyReminder,
  cancelReminder,
  REMINDER_IDS,
} from '../../notifications/services/notificationService';

type Props = NativeStackScreenProps<any, 'Notifications'>;

interface ReminderConfig {
  id:      string;
  key:     keyof typeof REMINDER_IDS;
  emoji:   string;
  title:   string;
  body:    string;
  hour:    number;
  minute:  number;
}

const REMINDERS: ReminderConfig[] = [
  {
    id:     REMINDER_IDS.JOURNAL,
    key:    'JOURNAL',
    emoji:  '📓',
    title:  'Journal Reminder',
    body:   'Time to write in your journal.',
    hour:   21,
    minute: 0,
  },
  {
    id:     REMINDER_IDS.TRACKER,
    key:    'TRACKER',
    emoji:  '📊',
    title:  'Tracker Check-in',
    body:   'Log your mood, sleep & habits.',
    hour:   8,
    minute: 30,
  },
  {
    id:     REMINDER_IDS.PLANNER,
    key:    'PLANNER',
    emoji:  '👗',
    title:  'Outfit Planner',
    body:   "Check today's planned outfit.",
    hour:   7,
    minute: 30,
  },
];

function fmtTime(h: number, m: number) {
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function NotificationPreferencesScreen({ navigation }: Props) {
  const permGranted   = useSelector((s: RootState) => s.notifications.permissionGranted);
  const [enabled,  setEnabled]  = useState<Record<string, boolean>>({
    JOURNAL: true, TRACKER: true, PLANNER: true,
  });
  const [times,    setTimes]    = useState<Record<string, { hour: number; minute: number }>>({
    JOURNAL: { hour: 21, minute: 0 },
    TRACKER: { hour: 8,  minute: 30 },
    PLANNER: { hour: 7,  minute: 30 },
  });
  const [picker,   setPicker]   = useState<string | null>(null);
  const [saving,   setSaving]   = useState<string | null>(null);

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const handleToggle = async (key: string, r: ReminderConfig, val: boolean) => {
    setEnabled(prev => ({ ...prev, [key]: val }));
    if (val) {
      const t = times[key];
      await scheduleDailyReminder(r.id, r.title, r.body, t.hour, t.minute);
    } else {
      await cancelReminder(r.id);
    }
  };

  const handleTimeChange = async (key: string, r: ReminderConfig, date?: Date) => {
    setPicker(null);
    if (!date) return;
    const h = date.getHours();
    const m = date.getMinutes();
    setTimes(prev => ({ ...prev, [key]: { hour: h, minute: m } }));
    if (enabled[key]) {
      setSaving(key);
      await scheduleDailyReminder(r.id, r.title, r.body, h, m);
      setSaving(null);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader
        title="Notifications"
        leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()}
        accentColor={Colors.primary}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Permission status */}
        <View style={[s.permCard, { backgroundColor: permGranted ? Colors.success + '12' : Colors.warning + '12' }]}>
          <AppText style={{ fontSize: 22 }}>{permGranted ? '✅' : '⚠️'}</AppText>
          <View style={{ flex: 1 }}>
            <AppText variant="headingSmall" color={Colors.textPrimary}>
              {permGranted ? 'Notifications enabled' : 'Notifications disabled'}
            </AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              {permGranted
                ? 'You\'ll receive push notifications from SuperGirl.'
                : 'Enable notifications in Settings to get reminders.'}
            </AppText>
          </View>
          {!permGranted && (
            <AppButton label="Settings" onPress={openSettings} variant="secondary" size="sm" />
          )}
        </View>

        {/* Daily reminders */}
        <View style={s.section}>
          <AppText variant="label" color={Colors.textMuted} style={s.sectionTitle}>
            DAILY REMINDERS
          </AppText>
          <View style={s.card}>
            {REMINDERS.map((r, i) => {
              const key      = r.key;
              const isActive = enabled[key];
              const t        = times[key];
              return (
                <View
                  key={r.id}
                  style={[s.reminderRow, i < REMINDERS.length - 1 && s.reminderBorder]}
                >
                  {/* Left */}
                  <AppText style={s.reminderEmoji}>{r.emoji}</AppText>
                  <View style={s.reminderInfo}>
                    <AppText variant="headingSmall" color={Colors.textPrimary}>{r.title}</AppText>
                    <TouchableOpacity
                      onPress={() => isActive && setPicker(key)}
                      disabled={!isActive}
                    >
                      <AppText
                        variant="caption"
                        color={isActive ? Colors.primary : Colors.textMuted}
                      >
                        {isActive ? `Daily at ${fmtTime(t.hour, t.minute)}` : 'Disabled'}
                        {saving === key ? ' (saving…)' : ''}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                  {/* Toggle */}
                  <Switch
                    value={isActive}
                    onValueChange={val => handleToggle(key, r, val)}
                    trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                    thumbColor={isActive ? Colors.primary : Colors.textLight}
                    disabled={!permGranted}
                  />
                </View>
              );
            })}
          </View>
        </View>

        <AppText variant="caption" color={Colors.textMuted} align="center" style={s.note}>
          Reminders are scheduled locally on your device.{'\n'}
          They work even without an internet connection.
        </AppText>
      </ScrollView>

      {/* Time picker */}
      {picker && (
        <DateTimePicker
          value={(() => {
            const t = times[picker];
            const d = new Date();
            d.setHours(t.hour, t.minute, 0, 0);
            return d;
          })()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            const r = REMINDERS.find(r => r.key === picker);
            if (r) handleTimeChange(picker, r, date);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bgApp },
  scroll:  { padding: Spacing.base, gap: Spacing.md, paddingBottom: 40 },
  permCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: Radius.lg, padding: Spacing.base,
  },
  section:      { gap: 6 },
  sectionTitle: { paddingHorizontal: 4 },
  card:         { backgroundColor: Colors.bgCard, borderRadius: 12, overflow: 'hidden' },
  reminderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  reminderBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.divider },
  reminderEmoji:  { fontSize: 24, width: 32 },
  reminderInfo:   { flex: 1, gap: 3 },
  note:           { lineHeight: 18 },
});
