import React, { useState, useEffect, useRef } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector }  from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }     from '../../../store';
import { PostCard }      from '../components/PostCard';
import { CommentItem }   from '../components/CommentItem';
import { AppText }       from '../../../shared/components/AppText';
import { AppAvatar }     from '../../../shared/components/AppAvatar';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { Colors }        from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { FontFamily }    from '../../../shared/theme/typography';
import {
  fetchComments, addComment, addReply, toggleLikeComment,
} from '../services/clubFirestoreService';
import { useClubFeed } from '../hooks/useClub';
import { Comment }     from '../types';

type Props = NativeStackScreenProps<any, 'PostDetail'>;

export function PostDetailScreen({ route, navigation }: Props) {
  const { postId }     = route.params as { postId: string };
  const user           = useSelector((s: RootState) => s.auth.user);
  const { feed, likePost, savePost } = useClubFeed();
  const post           = feed.find(p => p.id === postId);

  const [comments,  setComments]  = useState<Comment[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    fetchComments(postId)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [postId]);

  const submitComment = async () => {
    if (!commentText.trim() || !user || !postId) return;
    setSubmitting(true);
    try {
      const comment = await addComment({
        postId,
        authorId:    user.id,
        authorName:  user.name,
        authorAvatar: user.avatarUrl,
        content:     commentText.trim(),
      });
      setComments(prev => [...prev, comment]);
      setCommentText('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (commentId: string, content: string) => {
    if (!user) return;
    await addReply(commentId, {
      commentId,
      authorId:  user.id,
      authorName: user.name,
      content,
      likes:     [],
      createdAt: new Date().toISOString(),
    });
    const updated = await fetchComments(postId);
    setComments(updated);
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    const liked = comment.likes.includes(user.id);
    setComments(prev =>
      prev.map(c => c.id === commentId
        ? { ...c, likes: liked ? c.likes.filter(id => id !== user.id) : [...c.likes, user.id] }
        : c,
      ),
    );
    await toggleLikeComment(commentId, user.id, liked);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <AppText variant="body" color={Colors.primary}>‹ Back</AppText>
        </TouchableOpacity>
        <AppText variant="headingSmall" color={Colors.textPrimary}>Post</AppText>
        <View style={{ width: 64 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={comments}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            post ? (
              <PostCard
                post={post}
                currentUserId={user?.id ?? ''}
                onPress={() => {}}
                onLike={() => likePost(post.id)}
                onSave={() => savePost(post.id)}
                onComment={() => inputRef.current?.focus()}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <View style={s.commentWrap}>
              <CommentItem
                comment={item}
                currentUserId={user?.id ?? ''}
                onLike={() => handleLikeComment(item.id)}
                onReply={(content) => handleReply(item.id, content)}
              />
            </View>
          )}
          ListFooterComponent={loading ? <AppLoadingSpinner size="small" /> : <View style={{ height: 80 }} />}
          ListEmptyComponent={
            !loading ? (
              <AppText variant="bodySmall" color={Colors.textMuted} align="center" style={{ marginTop: Spacing.xl }}>
                No comments yet. Be the first!
              </AppText>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />

        {/* Comment input bar */}
        <View style={s.inputBar}>
          <AppAvatar uri={user?.avatarUrl} name={user?.name} size={34} />
          <TextInput
            ref={inputRef}
            style={s.textInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add a comment…"
            placeholderTextColor={Colors.textLight}
            multiline
            returnKeyType="send"
            onSubmitEditing={submitComment}
          />
          <TouchableOpacity
            onPress={submitComment}
            disabled={!commentText.trim() || submitting}
            style={[s.sendBtn, { opacity: commentText.trim() ? 1 : 0.4 }]}
          >
            <AppText style={{ fontSize: 20 }}>
              {submitting ? '⏳' : '↑'}
            </AppText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  backBtn:     { width: 64 },
  commentWrap: { paddingHorizontal: Spacing.base },
  inputBar: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           Spacing.sm,
    padding:       Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 0.5,
    borderTopColor: Colors.divider,
  },
  textInput: {
    flex:         1,
    fontFamily:   FontFamily.regular,
    fontSize:     15,
    color:        Colors.textPrimary,
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight:    100,
  },
  sendBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: Colors.club,
    alignItems: 'center', justifyContent: 'center',
  },
});
