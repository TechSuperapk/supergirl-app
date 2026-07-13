import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { loginSuccess } from '../store/authSlice';
import { RootState } from '../../../store';
import { apiClient } from '../../../services/apiClient';
import { BackendUser } from '../services/backendAuthService';
import { uploadFileToFirebase } from '../../../services/storageService';

const F  = 'DMSans-Regular';
const FB = 'DMSans-Bold';

interface Props { onDone: () => void; }

export function ProfileSetupScreen({ onDone }: Props) {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const [name,   setName]   = useState(user?.name ?? '');
  const [avatar, setAvatar] = useState(user?.avatarUrl ?? '');
  const [loading, setLoading] = useState(false);

  const pickAvatar = async () => {
    if (loading) return;
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) { Alert.alert('Permission needed'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.8 });
    if (!r.canceled) setAvatar(r.assets[0].uri);
  };

  const save = async () => {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    if (!user) return;
    
    setLoading(true);
    try {
      let finalAvatarUrl = avatar;

      // If the avatar is a local file URI, upload it to Firebase Storage.
      // Best-effort: if the upload fails, keep going and save the name —
      // don't let a broken photo upload block the whole profile save.
      if (avatar && !avatar.startsWith('http://') && !avatar.startsWith('https://')) {
        try {
          const fileExt = avatar.split('.').pop() || 'jpg';
          const storagePath = `profiles/${user.id}/avatar_${Date.now()}.${fileExt}`;
          finalAvatarUrl = await uploadFileToFirebase(avatar, storagePath);
        } catch (uploadErr) {
          console.error('Avatar upload failed, continuing without it:', uploadErr);
          finalAvatarUrl = user.avatarUrl ?? '';
        }
      }

      // Save via the backend (Express + Mongo) — this is the real session
      // owner now that login goes through native Firebase Auth + our JWT,
      // not the Firestore JS SDK.
      const res = await apiClient.patch<{ user: BackendUser }>('/auth/me', {
        name: name.trim(),
        ...(finalAvatarUrl && finalAvatarUrl.startsWith('http') ? { avatarUrl: finalAvatarUrl } : {}),
      });

      dispatch(loginSuccess({
        ...user,
        name: res.user.name,
        avatarUrl: res.user.avatarUrl,
      }));
      onDone();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message || 'Failed to save profile details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.inner}>
        <Text style={[s.title, {fontFamily:FB}]}>Set up your profile</Text>
        <Text style={[s.sub, {fontFamily:F}]}>Add your name and a photo to personalise your journal</Text>

        <TouchableOpacity style={s.avatarWrap} onPress={pickAvatar}>
          {avatar
            ? <Image source={{uri:avatar}} style={s.avatar}/>
            : <View style={s.avatarPlaceholder}>
                <Text style={{fontSize:36}}>👩</Text>
              </View>
          }
          <View style={s.camBadge}><Text style={{fontSize:16}}>📷</Text></View>
        </TouchableOpacity>

        <View style={s.inputWrap}>
          <Text style={[s.label, {fontFamily:F}]}>Your Name</Text>
          <TextInput
            style={[s.input, {fontFamily:F}]}
            placeholder="Enter your name"
            placeholderTextColor="#AAAAAA"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        <TouchableOpacity style={s.btn} onPress={save} activeOpacity={0.85} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={[s.btnT, {fontFamily:FB}]}>Save & Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onDone} style={{alignItems:'center'}} disabled={loading}>
          <Text style={[{fontSize:14, color:'#888'}, {fontFamily:F}, loading && {opacity: 0.5}]}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex:1, backgroundColor:'#FFF' },
  inner:             { flex:1, paddingHorizontal:28, paddingTop:40, gap:20 },
  title:             { fontSize:28, color:'#111' },
  sub:               { fontSize:15, color:'#888', lineHeight:22 },
  avatarWrap:        { alignSelf:'center', position:'relative' },
  avatar:            { width:110, height:110, borderRadius:55 },
  avatarPlaceholder: { width:110, height:110, borderRadius:55, backgroundColor:'#E3EEFF', alignItems:'center', justifyContent:'center' },
  camBadge:          { position:'absolute', bottom:4, right:4, width:32, height:32, borderRadius:16, backgroundColor:'#2979FF', alignItems:'center', justifyContent:'center' },
  inputWrap:         { gap:8 },
  label:             { fontSize:13, color:'#555' },
  input:             { borderWidth:1.5, borderColor:'#E0E0E0', borderRadius:14, paddingHorizontal:16, paddingVertical:14, fontSize:16, color:'#111', backgroundColor:'#FAFAFA' },
  btn:               { backgroundColor:'#2979FF', borderRadius:50, paddingVertical:18, alignItems:'center' },
  btnT:              { fontSize:17, color:'#FFF' },
});
