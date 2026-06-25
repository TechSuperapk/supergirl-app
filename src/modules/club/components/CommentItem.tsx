import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppAvatar } from '../../../shared/components/AppAvatar';
import { AppText }   from '../../../shared/components/AppText';
import { AppInput }  from '../../../shared/components/AppInput';
import { Colors }    from '../../../shared/theme/colors';
import { Spacing }   from '../../../shared/theme/spacing';
import { Comment, Reply } from '../types';

interface Props {
  comment:       Comment;
  currentUserId: string;
  onLike:        () => void;
  onReply:       (content: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function CommentItem({ comment, currentUserId, onLike, onReply }: Props) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showReplies,    setShowReplies]    = useState(false);
  const [replyText,      setReplyText]      = useState('');
  const isLiked = comment.likes.includes(currentUserId);

  const submitReply = () => {
    if (!replyText.trim()) return;
    onReply(replyText.trim());
    setReplyText('');
    setShowReplyInput(false);
    setShowReplies(true);
  };

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <AppAvatar name={comment.authorName} uri={comment.authorAvatar} size={34} />
        <View style={s.bubble}>
          <AppText variant="label" color={Colors.textPrimary}>{comment.authorName}</AppText>
          <AppText variant="bodySmall" color={Colors.textSecondary} style={{ lineHeight: 19 }}>
            {comment.content}
          </AppText>
        </View>
      </View>

      {/* Meta row */}
      <View style={s.meta}>
        <AppText variant="caption" color={Colors.textMuted}>{timeAgo(comment.createdAt)}</AppText>
        <TouchableOpacity onPress={onLike}>
          <AppText variant="caption" color={isLiked ? Colors.error : Colors.textMuted}>
            {isLiked ? '❤️' : '🤍'} {comment.likes.length > 0 ? comment.likes.length : ''}
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowReplyInput(!showReplyInput)}>
          <AppText variant="caption" color={Colors.primary}>Reply</AppText>
        </TouchableOpacity>
        {comment.replies.length > 0 && (
          <TouchableOpacity onPress={() => setShowReplies(!showReplies)}>
            <AppText variant="caption" color={Colors.textMuted}>
              {showReplies ? 'Hide' : `${comment.replies.length} repl${comment.replies.length > 1 ? 'ies' : 'y'}`}
            </AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* Replies */}
      {showReplies && comment.replies.map((reply: Reply) => (
        <View key={reply.id} style={s.replyRow}>
          <AppAvatar name={reply.authorName} size={26} />
          <View style={[s.bubble, s.replyBubble]}>
            <AppText variant="label" color={Colors.textPrimary} style={{ fontSize: 12 }}>
              {reply.authorName}
            </AppText>
            <AppText variant="caption" color={Colors.textSecondary} style={{ lineHeight: 17 }}>
              {reply.content}
            </AppText>
          </View>
        </View>
      ))}

      {/* Reply input */}
      {showReplyInput && (
        <View style={s.replyInput}>
          <AppInput
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Write a reply…"
            onSubmitEditing={submitReply}
            returnKeyType="send"
            style={{ paddingVertical: 8 }}
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:        { marginBottom: Spacing.md },
  row:         { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  bubble: {
    flex:            1,
    backgroundColor: Colors.bgInput,
    borderRadius:    12,
    borderTopLeftRadius: 2,
    padding:         Spacing.sm,
    gap:             4,
  },
  meta: {
    flexDirection: 'row',
    gap:           Spacing.base,
    paddingLeft:   42,
    marginTop:     4,
  },
  replyRow:   { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', paddingLeft: 42, marginTop: 6 },
  replyBubble:{ backgroundColor: Colors.bgApp },
  replyInput: { paddingLeft: 42, marginTop: 6 },
});
