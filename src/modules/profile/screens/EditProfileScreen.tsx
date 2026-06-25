import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }          from '../../../store';
import { updateProfile }      from '../../auth/store/authSlice';
import { updateUserProfile }  from '../services/profileService';
import { AppHeader }          from '../../../shared/components/AppHeader';
import { AppInput }           from '../../../shared/components/AppInput';
import { AppButton }          from '../../../shared/components/AppButton';
import { AppAvatar }          from '../../../shared/components/AppAvatar';
import { AppText }            from '../../../shared/components/AppText';
import { Colors }             from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { ProfileStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditProfile'>;

export function EditProfileScreen({ navigation }: Props) {
  const dispatch = useDispatch();
  const user     = useSelector((s: RootState) => s.auth.user);

  const [name,       setName]       = useState(user?.name ?? '');
  const [bio,        setBio]        = useState((user as any)?.bio ?? '');
  const [phone,      setPhone]      = useState(user?.phone ?? '');
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to change your avatar.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) setLocalAvatar(result.assets[0].uri);
  };

  const save = async () => {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter your name.'); return; }
    if (!user) return;
    setSaving(true);
    try {
      const finalAvatarUrl = await updateUserProfile(
        user.id,
        { name: name.trim(), bio: bio.trim(), avatarUrl: user.avatarUrl, phone: phone.trim(), countryCode: user.countryCode },
        localAvatar ?? undefined,
      );
      dispatch(updateProfile({
        name:      name.trim(),
        bio:       bio.trim() as any,
        avatarUrl: finalAvatarUrl ?? user.avatarUrl,
        phone:     phone.trim(),
      }));
      Alert.alert('✅ Profile updated');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = localAvatar ?? user?.avatarUrl;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader
        title="Edit Profile"
        leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()}
        accentColor={Colors.profile}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar picker */}
          <View style={s.avatarSection}>
            <TouchableOpacity onPress={pickAvatar} style={s.avatarWrap} activeOpacity={0.85}>
              <AppAvatar uri={displayAvatar} name={name} size={100} />
              <View style={s.camBadge}>
                <AppText style={{ fontSize: 16 }}>📷</AppText>
              </View>
            </TouchableOpacity>
            <AppText variant="caption" color={Colors.textMuted} align="center">
              Tap to change photo
            </AppText>
          </View>

          {/* Form */}
          <View style={s.form}>
            <AppInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoCapitalize="words"
              returnKeyType="next"
            />
            <AppInput
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us a little about yourself…"
              multiline
              numberOfLines={3}
              style={{ minHeight: 72, textAlignVertical: 'top' }}
              returnKeyType="done"
            />
            <AppInput
              label="Mobile Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="Mobile number"
              keyboardType="phone-pad"
              returnKeyType="done"
            />
            <AppText variant="caption" color={Colors.textMuted}>
              Saved to your profile. With real SMS auth enabled, changing your number requires OTP re-verification.
            </AppText>
          </View>

          <AppButton
            label="Save Changes"
            onPress={save}
            loading={saving}
            variant="primary"
            size="lg"
            fullWidth
            style={s.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bgApp },
  scroll: { padding: Spacing.base, gap: Spacing.lg },
  avatarSection: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  avatarWrap: { position: 'relative' },
  camBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
    ...Shadows.md,
  },
  form:    { gap: Spacing.md },
  infoRow: {
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
  },
  saveBtn: { marginTop: Spacing.sm },
});
