import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, Share, Alert,
} from 'react-native';
import { AppAvatar }  from '../../../shared/components/AppAvatar';
import { AppText }    from '../../../shared/components/AppText';
import { Colors }     from '../../../shared/theme/colors';
import { FontFamily, FontSize } from '../../../shared/theme/typography';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { Post }       from '../types';

interface Props {
  post:        Post;
  currentUserId: string;
  onPress:     () => void;
  onLike:      () => void;
  onSave:      () => void;
  onComment:   () => void;
  onDelete?:   () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function PostCard({
  post, currentUserId, onPress, onLike, onSave, onComment, onDelete,
}: Props) {
  const isLiked  = post.likes.includes(currentUserId);
  const isSaved  = post.saves.includes(currentUserId);
  const isOwner  = post.authorId === currentUserId;
  const [menuOpen, setMenuOpen] = useState(false);

  const handleShare = async () => {
    await Share.share({ message: `${post.content}\n\nShared from SuperGirl` });
  };

  const handleMenuPress = () => {
    if (isOwner) {
      Alert.alert('Post options', undefined, [
        { text: 'Delete post', style: 'destructive', onPress: onDelete },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Report post', 'Report this post as inappropriate?', [
        { text: 'Report', style: 'destructive', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <TouchableOpacity
      style={s.card}
      onPress={onPress}
      activeOpacity={0.97}
    >
      {/* Header */}
      <View style={s.header}>
        <AppAvatar uri={post.authorAvatar} name={post.authorName} size={42} />
        <View style={s.authorCol}>
          <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={1}>
            {post.authorName}
          </AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {timeAgo(post.createdAt)}
            {post.groupId && ' · from group'}
          </AppText>
        </View>
        <TouchableOpacity onPress={handleMenuPress} style={s.menuBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.menuDots}>···</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {!!post.content && (
        <AppText variant="body" color={Colors.textPrimary} style={s.content} numberOfLines={6}>
          {post.content}
        </AppText>
      )}

      {/* Hashtags */}
      {post.hashtags.length > 0 && (
        <View style={s.tagsRow}>
          {post.hashtags.slice(0, 4).map(tag => (
            <View key={tag} style={s.tagPill}>
              <AppText variant="caption" color={Colors.primary}>#{tag}</AppText>
            </View>
          ))}
        </View>
      )}

      {/* Media grid */}
      {post.mediaUrls.length > 0 && (
        <View style={s.mediaGrid}>
          {post.mediaUrls.slice(0, 4).map((uri, i) => (
            <View
              key={i}
              style={[
                s.mediaThumb,
                post.mediaUrls.length === 1 && s.mediaSingle,
                post.mediaUrls.length === 2 && s.mediaHalf,
                post.mediaUrls.length >= 3 && i === 0 && s.mediaLarge,
                post.mediaUrls.length >= 3 && i > 0 && s.mediaSmall,
              ]}
            >
              <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              {i === 3 && post.mediaUrls.length > 4 && (
                <View style={s.moreOverlay}>
                  <AppText variant="headingMedium" color={Colors.white}>
                    +{post.mediaUrls.length - 4}
                  </AppText>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity style={s.actionBtn} onPress={onLike}>
          <Text style={[s.actionIcon, isLiked && { color: Colors.error }]}>
            {isLiked ? '❤️' : '🤍'}
          </Text>
          <AppText
            variant="caption"
            color={isLiked ? Colors.error : Colors.textMuted}
          >
            {post.likes.length > 0 ? post.likes.length : ''}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={onComment}>
          <Text style={s.actionIcon}>💬</Text>
          <AppText variant="caption" color={Colors.textMuted}>
            {post.commentCount > 0 ? post.commentCount : ''}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={handleShare}>
          <Text style={s.actionIcon}>↗️</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.actionBtn, s.actionRight]} onPress={onSave}>
          <Text style={[s.actionIcon, isSaved && { color: Colors.primary }]}>
            {isSaved ? '🔖' : '🏷️'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    marginBottom: 8,
    paddingTop: Spacing.base,
    ...Shadows.sm,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.sm,
    paddingHorizontal: Spacing.base,
    marginBottom:   Spacing.sm,
  },
  authorCol:  { flex: 1, gap: 2 },
  menuBtn:    { padding: 4 },
  menuDots:   { fontSize: 18, color: Colors.textMuted, letterSpacing: 2, fontFamily: FontFamily.bold },
  content: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
    paddingHorizontal: Spacing.base,
    marginBottom:  Spacing.sm,
  },
  tagPill: {
    backgroundColor: Colors.primaryLight,
    borderRadius:    Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  // Media grid
  mediaGrid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            2,
    marginBottom:   Spacing.sm,
    overflow:       'hidden',
  },
  mediaThumb:  { overflow: 'hidden', backgroundColor: Colors.bgInput },
  mediaSingle: { width: '100%', height: 280 },
  mediaHalf:   { width: '49.5%', height: 200 },
  mediaLarge:  { width: '100%', height: 200 },
  mediaSmall:  { width: '49.5%', height: 120 },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  // Actions row
  actions: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: Spacing.base,
    paddingVertical:  Spacing.sm,
    borderTopWidth:  0.5,
    borderTopColor:  Colors.divider,
    gap:             Spacing.md,
  },
  actionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionRight: { marginLeft: 'auto' },
  actionIcon:  { fontSize: 20 },
});
