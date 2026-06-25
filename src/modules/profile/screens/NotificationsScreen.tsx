import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }           from '../../../store';
import { AppHeader }           from '../../../shared/components/AppHeader';
import { AppText }             from '../../../shared/components/AppText';
import { SettingsRow }         from '../components/SettingsRow';
import { Colors }              from '../../../shared/theme/colors';
import { Spacing }             from '../../../shared/theme/spacing';
import { updateNotificationPrefs } from '../services/profileService';
import { ProfileStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Notifications'>;

type NotifKey =
  | 'likes' | 'comments' | 'replies' | 'groupMessages'
  | 'eventReminders' | 'subscriptionExpiry'
  | 'journalReminders' | 'trackerReminders' | 'plannerReminders';

const DEFAULTS: Record<NotifKey, boolean> = {
  likes:               true,
  comments:            true,
  replies:             true,
  groupMessages:       true,
  eventReminders:      true,
  subscriptionExpiry:  true,
  journalReminders:    false,
  trackerReminders:    false,
  plannerReminders:    false,
};

const SECTIONS = [
  {
    title: 'COMMUNITY',
    rows: [
      { key: 'likes'         as NotifKey, icon: '❤️', label: 'Likes',          subtitle: 'When someone likes your post' },
      { key: 'comments'      as NotifKey, icon: '💬', label: 'Comments',        subtitle: 'New comments on your posts' },
      { key: 'replies'       as NotifKey, icon: '↩️', label: 'Replies',         subtitle: 'Replies to your comments' },
      { key: 'groupMessages' as NotifKey, icon: '👥', label: 'Group messages',  subtitle: 'New messages in your groups' },
    ],
  },
  {
    title: 'EVENTS',
    rows: [
      { key: 'eventReminders' as NotifKey, icon: '🎟️', label: 'Event reminders', subtitle: '24h before events you joined' },
    ],
  },
  {
    title: 'REMINDERS',
    rows: [
      { key: 'journalReminders'  as NotifKey, icon: '📓', label: 'Journal reminder',  subtitle: 'Daily reminder to write' },
      { key: 'trackerReminders'  as NotifKey, icon: '📊', label: 'Tracker reminder',  subtitle: 'Daily tracker check-in' },
      { key: 'plannerReminders'  as NotifKey, icon: '📅', label: 'Planner reminder',  subtitle: 'Morning outfit reminder' },
    ],
  },
  {
    title: 'ACCOUNT',
    rows: [
      { key: 'subscriptionExpiry' as NotifKey, icon: '⭐', label: 'Subscription alerts', subtitle: '7 days before renewal' },
    ],
  },
];

export function NotificationsScreen({ navigation }: Props) {
  const user  = useSelector((s: RootState) => s.auth.user);
  const [prefs, setPrefs] = useState<Record<NotifKey, boolean>>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  const toggle = async (key: NotifKey, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    if (!user) return;
    setSaving(true);
    try {
      await updateNotificationPrefs(user.id, updated);
    } catch {
      // Revert on failure
      setPrefs(prefs);
      Alert.alert('Error', 'Could not save preferences. Check your connection.');
    } finally {
      setSaving(false);
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
        {SECTIONS.map(section => (
          <View key={section.title} style={s.section}>
            <AppText variant="label" color={Colors.textMuted} style={s.sectionTitle}>
              {section.title}
            </AppText>
            <View style={s.sectionCard}>
              {section.rows.map(row => (
                <SettingsRow
                  key={row.key}
                  type="toggle"
                  icon={row.icon}
                  label={row.label}
                  subtitle={row.subtitle}
                  value={prefs[row.key]}
                  onValueChange={(v) => toggle(row.key, v)}
                />
              ))}
            </View>
          </View>
        ))}

        <AppText
          variant="caption"
          color={Colors.textMuted}
          align="center"
          style={s.note}
        >
          You can also manage notification permissions{'\n'}in your device Settings app.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: Colors.bgApp },
  scroll:       { padding: Spacing.base, gap: Spacing.sm },
  section:      { gap: 6 },
  sectionTitle: { paddingHorizontal: 4 },
  sectionCard:  { backgroundColor: Colors.bgCard, borderRadius: 12, overflow: 'hidden' },
  note:         { marginTop: Spacing.base, lineHeight: 18 },
});
