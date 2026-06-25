import React, { useState } from 'react';
import {
  View, TextInput, TouchableOpacity, Image,
  StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { useSelector }   from 'react-redux';
import * as ImagePicker  from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }     from '../../../store';
import { useClubFeed }   from '../hooks/useClub';
import { AppText }       from '../../../shared/components/AppText';
import { AppAvatar }     from '../../../shared/components/AppAvatar';
import { AppButton }     from '../../../shared/components/AppButton';
import { Colors }        from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { FontFamily }    from '../../../shared/theme/typography';

type Props = NativeStackScreenProps<any, 'CreatePost'>;

const MAX_MEDIA = 4;

export function CreatePostScreen({ route, navigation }: Props) {
  const groupId   = (route.params as any)?.groupId as string | undefined;
  const user      = useSelector((s: RootState) => s.auth.user);
  const { submitPost } = useClubFeed();

  const [content,    setContent]    = useState('');
  const [mediaUris,  setMediaUris]  = useState<string[]>([]);
  const [posting,    setPosting]    = useState(false);

  const pickMedia = async () => {
    if (mediaUris.length >= MAX_MEDIA) {
      Alert.alert(`Max ${MAX_MEDIA} images`); return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_MEDIA - mediaUris.length,
      quality: 0.85,
    });
    if (!result.canceled) {
      setMediaUris(prev => [
        ...prev,
        ...result.assets.map(a => a.uri),
      ].slice(0, MAX_MEDIA));
    }
  };

  const removeMedia = (idx: number) => {
    setMediaUris(prev => prev.filter((_, i) => i !== idx));
  };

  const post = async () => {
    if (!content.trim() && mediaUris.length === 0) {
      Alert.alert('Nothing to post', 'Write something or add a photo.'); return;
    }
    setPosting(true);
    try {
      await submitPost(content, mediaUris, groupId);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not post. Try again.');
    } finally {
      setPosting(false);
    }
  };

  const canPost = (content.trim().length > 0 || mediaUris.length > 0) && !posting;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.cancelBtn}>
          <AppText variant="body" color={Colors.textSecondary}>Cancel</AppText>
        </TouchableOpacity>
        <AppText variant="headingSmall" color={Colors.textPrimary}>
          {groupId ? 'Post to Group' : 'New Post'}
        </AppText>
        <AppButton
          label="Post"
          onPress={post}
          loading={posting}
          disabled={!canPost}
          variant="primary"
          size="sm"
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Author row */}
          <View style={s.authorRow}>
            <AppAvatar uri={user?.avatarUrl} name={user?.name} size={44} />
            <View>
              <AppText variant="headingSmall" color={Colors.textPrimary}>
                {user?.name ?? 'You'}
              </AppText>
              {groupId && (
                <AppText variant="caption" color={Colors.club}>Posting to group</AppText>
              )}
            </View>
          </View>

          {/* Text input */}
          <TextInput
            style={s.textInput}
            value={content}
            onChangeText={setContent}
            placeholder="What's on your mind?"
            placeholderTextColor={Colors.textLight}
            multiline
            autoFocus
            textAlignVertical="top"
          />

          {/* Media previews */}
          {mediaUris.length > 0 && (
            <View style={s.mediaGrid}>
              {mediaUris.map((uri, i) => (
                <View key={i} style={s.mediaTile}>
                  <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <TouchableOpacity style={s.removeBtn} onPress={() => removeMedia(i)}>
                    <AppText style={{ color: Colors.white, fontSize: 12, fontFamily: FontFamily.bold }}>✕</AppText>
                  </TouchableOpacity>
                </View>
              ))}
              {mediaUris.length < MAX_MEDIA && (
                <TouchableOpacity style={s.addMore} onPress={pickMedia}>
                  <AppText style={{ fontSize: 28, color: Colors.textLight }}>+</AppText>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        {/* Toolbar */}
        <View style={s.toolbar}>
          <TouchableOpacity style={s.toolBtn} onPress={pickMedia}>
            <AppText style={s.toolIcon}>🖼️</AppText>
            <AppText variant="caption" color={Colors.textMuted}>Photo</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={s.toolBtn} onPress={() => setContent(c => `${c} #`)}>
            <AppText style={s.toolIcon}>#️⃣</AppText>
            <AppText variant="caption" color={Colors.textMuted}>Hashtag</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={s.toolBtn} onPress={() => setContent(c => `${c} @`)}>
            <AppText style={s.toolIcon}>👤</AppText>
            <AppText variant="caption" color={Colors.textMuted}>Mention</AppText>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <AppText variant="caption" color={content.length > 450 ? Colors.warning : Colors.textLight}>
            {content.length}/500
          </AppText>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bgCard },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  cancelBtn: { width: 64 },
  scroll:    { padding: Spacing.base, gap: Spacing.base },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  textInput: {
    fontFamily:  FontFamily.regular,
    fontSize:    17,
    color:       Colors.textPrimary,
    minHeight:   140,
    lineHeight:  26,
    textAlignVertical: 'top',
  },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mediaTile: {
    width: 100, height: 100, borderRadius: Radius.md,
    overflow: 'hidden', backgroundColor: Colors.bgInput,
  },
  removeBtn: {
    position:  'absolute', top: 5, right: 5,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  addMore: {
    width: 100, height: 100, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.bgCard,
  },
  toolBtn:  { alignItems: 'center', gap: 2 },
  toolIcon: { fontSize: 22 },
});
