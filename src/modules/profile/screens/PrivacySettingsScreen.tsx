import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader }   from '../../../shared/components/AppHeader';
import { AppText }     from '../../../shared/components/AppText';
import { SettingsRow } from '../components/SettingsRow';
import { Colors }      from '../../../shared/theme/colors';
import { Spacing }     from '../../../shared/theme/spacing';
import { ProfileStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PrivacySettings'>;

export function PrivacySettingsScreen({ navigation }: Props) {
  const [publicProfile,    setPublicProfile]    = useState(true);
  const [showPhone,        setShowPhone]        = useState(false);
  const [allowMentions,    setAllowMentions]    = useState(true);
  const [showActivity,     setShowActivity]     = useState(true);
  const [dataCollection,   setDataCollection]   = useState(true);
  const [crashReports,     setCrashReports]     = useState(true);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader
        title="Privacy & Security"
        leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()}
        accentColor={Colors.profile}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        <View style={s.section}>
          <AppText variant="label" color={Colors.textMuted} style={s.sectionTitle}>
            PROFILE VISIBILITY
          </AppText>
          <View style={s.card}>
            <SettingsRow
              type="toggle"
              icon="🌍"
              label="Public profile"
              subtitle="Others can find and view your profile"
              value={publicProfile}
              onValueChange={setPublicProfile}
            />
            <SettingsRow
              type="toggle"
              icon="📞"
              label="Show phone number"
              subtitle="Display phone to other members"
              value={showPhone}
              onValueChange={setShowPhone}
            />
            <SettingsRow
              type="toggle"
              icon="📢"
              label="Allow mentions"
              subtitle="Anyone can tag you in posts"
              value={allowMentions}
              onValueChange={setAllowMentions}
            />
            <SettingsRow
              type="toggle"
              icon="👁️"
              label="Show activity status"
              subtitle="Let others see when you were last active"
              value={showActivity}
              onValueChange={setShowActivity}
            />
          </View>
        </View>

        <View style={s.section}>
          <AppText variant="label" color={Colors.textMuted} style={s.sectionTitle}>
            DATA & PRIVACY
          </AppText>
          <View style={s.card}>
            <SettingsRow
              type="toggle"
              icon="📊"
              label="Analytics"
              subtitle="Help improve the app with usage data"
              value={dataCollection}
              onValueChange={setDataCollection}
            />
            <SettingsRow
              type="toggle"
              icon="🐛"
              label="Crash reports"
              subtitle="Automatically send crash reports"
              value={crashReports}
              onValueChange={setCrashReports}
            />
          </View>
        </View>

        <View style={s.section}>
          <AppText variant="label" color={Colors.textMuted} style={s.sectionTitle}>
            JOURNAL SECURITY
          </AppText>
          <View style={s.card}>
            <SettingsRow
              type="info"
              icon="🔐"
              label="Journal encryption"
              value="Enabled"
            />
            <SettingsRow
              type="info"
              icon="🔒"
              label="Private vault lock"
              value="PIN + Biometric"
            />
          </View>
        </View>

        <View style={s.section}>
          <AppText variant="label" color={Colors.textMuted} style={s.sectionTitle}>
            ACCOUNT ACTIONS
          </AppText>
          <View style={s.card}>
            <SettingsRow
              type="press"
              icon="📥"
              label="Download my data"
              subtitle="Get a copy of all your data"
              onPress={() => {}}
            />
            <SettingsRow
              type="press"
              icon="🗑️"
              label="Delete account"
              subtitle="Permanently remove your account and data"
              danger
              onPress={() => {}}
            />
          </View>
        </View>

        <AppText
          variant="caption"
          color={Colors.textMuted}
          align="center"
          style={s.note}
        >
          Your journal entries are encrypted locally{'\n'}and never shared with third parties.
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
  card:         { backgroundColor: Colors.bgCard, borderRadius: 12, overflow: 'hidden' },
  note:         { marginTop: Spacing.base, lineHeight: 18 },
});
