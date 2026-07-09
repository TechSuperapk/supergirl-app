import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }            from '../../../store';
import { logout }               from '../../auth/store/authSlice';
import { loadEntries }          from '../../journaling/store/journalSlice';
import { saveBackup, getBestBackup, pushRestoredToServer } from '../../journaling/services/backupService';
import { auth }                 from '../../../lib/firebase';
import { signOut }              from 'firebase/auth';

import { ProfileHeader }        from '../components/ProfileHeader';
import { SubscriptionCard }     from '../components/SubscriptionCard';
import { SettingsRow }          from '../components/SettingsRow';
import { AppText }              from '../../../shared/components/AppText';
import { AppTopNav }            from '../../../shared/components/AppTopNav';
import { Colors }               from '../../../shared/theme/colors';
import { FontFamily, FontSize } from '../../../shared/theme/typography';
import { Spacing }              from '../../../shared/theme/spacing';
import { ProfileStackParamList } from '../../../navigation/types';
import { useSubscriptionPurchase } from '../../subscription/hooks/useSubscriptionPurchase';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

const SECTION_GAP = Spacing.sm;

export function ProfileScreen({ navigation }: Props) {
  const dispatch    = useDispatch();
  const user        = useSelector((s: RootState) => s.auth.user);
  const tier        = useSelector((s: RootState) => s.auth.subscriptionTier);
  const expiry      = useSelector((s: RootState) => s.auth.subscriptionExpiry);
  const entries     = useSelector((s: RootState) => s.journal.entries);
  const isPremium   = tier === 'premium';

  const { syncFromFirestore } = useSubscriptionPurchase();

  useEffect(() => {
    syncFromFirestore();
  }, []);

  const entryCount = entries.filter(e => !e.isPrivate && !e.isDraft).length;
  const privateCount = entries.filter(e => e.isPrivate).length;

  const handleBackupNow = async () => {
    if (!user?.id) return;
    await saveBackup(user.phone ?? '', user.id, entries);
    Alert.alert('Backup complete', `Saved ${entries.length} ${entries.length === 1 ? 'journal' : 'journals'} to this device and the cloud.`);
  };

  const handleRestore = async () => {
    if (!user?.id) return;
    const backup = await getBestBackup(user.phone ?? '', user.id);
    if (!backup || backup.count === 0) {
      Alert.alert('No backup found', 'There are no saved journals to restore yet.');
      return;
    }
    const when = (() => { try { return new Date(backup.savedAt).toLocaleDateString(); } catch { return ''; } })();
    Alert.alert(
      'Restore journals',
      `Restore ${backup.count} ${backup.count === 1 ? 'journal' : 'journals'}${when ? ` from ${when}` : ''}? This will merge them back into your journal.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', onPress: async () => {
            dispatch(loadEntries(backup.entries));
            await pushRestoredToServer(user.id, backup.entries);
            Alert.alert('Restored', `${backup.count} ${backup.count === 1 ? 'journal' : 'journals'} restored.`);
          } },
      ],
    );
  };

  const handleBackupRestore = () => {
    Alert.alert('Backup & Restore', 'Keep your journals safe on this device and in the cloud.', [
      { text: 'Back up now', onPress: handleBackupNow },
      { text: 'Restore saved journals', onPress: handleRestore },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out', style: 'destructive',
        onPress: async () => {
          try { await signOut(auth); } catch {}
          dispatch(logout());
          dispatch(loadEntries([]));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Top nav — identical on every feature's home screen */}
      <AppTopNav
        active="me"
        onBellPress={() => navigation.navigate('Notifications')}
        onMenuPress={() => navigation.navigate('Notifications')}
      />

      {/* Header */}
      <View style={s.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity onPress={() => (navigation.getParent() as any)?.goBack()} hitSlop={12} style={{ paddingRight: 4 }}>
            <Text style={{ fontSize: 28, color: Colors.textPrimary, lineHeight: 30 }}>‹</Text>
          </TouchableOpacity>
          <AppText variant="headingLarge" color={Colors.textPrimary}>Profile</AppText>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          style={s.bellBtn}
        >
          <Text style={s.bellIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* Profile header card */}
        <ProfileHeader
          name={user?.name ?? ''}
          bio={(user as any)?.bio}
          avatarUrl={user?.avatarUrl}
          phone={`${user?.countryCode ?? ''} ${user?.phone ?? ''}`}
          isPremium={isPremium}
          stats={[
            { label: 'Entries',  value: entryCount   },
            { label: 'Private',  value: privateCount  },
            { label: 'Streak',   value: '🔥 0'        },
          ]}
          onEditPress={() => navigation.navigate('EditProfile')}
        />

        {/* Subscription card */}
        <View style={{ marginTop: Spacing.base }}>
          <SubscriptionCard
            isPremium={isPremium}
            expiresAt={expiry}
            onUpgrade={() => navigation.navigate('Subscription')}
            onManage={() => navigation.navigate('Subscription')}
          />
        </View>

        {/* Boards quick-access */}
        <View style={[s.section, { marginTop: Spacing.base }]}>
          <AppText variant="label" color={Colors.textMuted} style={s.sectionTitle}>
            CONTENT
          </AppText>
          <View style={s.sectionCard}>
            <SettingsRow
              type="press"
              icon="🎨"
              label="My Boards"
              subtitle="Vision boards, mood boards & more"
              onPress={() => navigation.navigate('BoardsHome')}
            />
          </View>
        </View>

        {/* Account settings */}
        <View style={[s.section, { marginTop: SECTION_GAP }]}>
          <AppText variant="label" color={Colors.textMuted} style={s.sectionTitle}>
            ACCOUNT
          </AppText>
          <View style={s.sectionCard}>
            <SettingsRow
              type="press"
              icon="✏️"
              label="Edit Profile"
              onPress={() => navigation.navigate('EditProfile')}
            />
            <SettingsRow
              type="press"
              icon="🔔"
              label="Notifications"
              subtitle="Reminders, alerts, and more"
              onPress={() => navigation.navigate('Notifications')}
            />
            <SettingsRow
              type="press"
              icon="🔒"
              label="Privacy & Security"
              onPress={() => navigation.navigate('PrivacySettings')}
            />
            <SettingsRow
              type="press"
              icon="☁️"
              label="Backup & Sync"
              subtitle="Backup, restore & sync your journals"
              onPress={() => navigation.navigate('BackupSettings')}
            />
            <SettingsRow
              type="press"
              icon="🗑️"
              label="Trash"
              subtitle="Recently deleted (kept 30 days)"
              onPress={() => navigation.navigate('Trash')}
            />
            <SettingsRow
              type="press"
              icon="⭐"
              label="Subscription"
              subtitle={isPremium ? 'Premium active' : 'Upgrade to Premium'}
              onPress={() => navigation.navigate('Subscription')}
            />
          </View>
        </View>

        {/* Support */}
        <View style={[s.section, { marginTop: SECTION_GAP }]}>
          <AppText variant="label" color={Colors.textMuted} style={s.sectionTitle}>
            SUPPORT
          </AppText>
          <View style={s.sectionCard}>
            <SettingsRow
              type="press"
              icon="❓"
              label="Help Center"
              onPress={() => navigation.navigate('HelpCenter')}
            />
            <SettingsRow
              type="info"
              icon="ℹ️"
              label="App Version"
              value="1.0.0"
            />
          </View>
        </View>

        {/* Danger zone */}
        <View style={[s.section, { marginTop: SECTION_GAP, marginBottom: Spacing['3xl'] }]}>
          <View style={s.sectionCard}>
            <SettingsRow
              type="press"
              icon="🚪"
              label="Log out"
              danger
              onPress={handleLogout}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bgApp },
  topBar: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  bellBtn: {
    width: 40, height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bgCard,
  },
  bellIcon:     { fontSize: 18 },
  scroll:       { gap: 0 },
  section:      { gap: 6 },
  sectionTitle: { paddingHorizontal: Spacing.base, paddingTop: 4 },
  sectionCard:  { backgroundColor: Colors.bgCard, overflow: 'hidden' },
});
