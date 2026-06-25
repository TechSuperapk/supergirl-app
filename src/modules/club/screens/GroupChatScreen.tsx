import React, { useState, useEffect, useRef } from 'react';
import {
  View, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { useSelector }   from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }     from '../../../store';
import { AppAvatar }     from '../../../shared/components/AppAvatar';
import { AppText }       from '../../../shared/components/AppText';
import { Colors }        from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { FontFamily }    from '../../../shared/theme/typography';
import {
  subscribeToGroupMessages,
  sendGroupMessage,
} from '../services/clubFirestoreService';
import { GroupMessage }  from '../types';

type Props = NativeStackScreenProps<any, 'GroupChat'>;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function MessageBubble({ msg, isMe }: { msg: GroupMessage; isMe: boolean }) {
  return (
    <View style={[b.row, isMe && b.rowMe]}>
      {!isMe && <AppAvatar name={msg.senderName} uri={msg.senderAvatar} size={30} />}
      <View style={[b.bubble, isMe ? b.bubbleMe : b.bubbleThem]}>
        {!isMe && (
          <AppText variant="caption" color={Colors.club} style={{ fontFamily: FontFamily.bold }}>
            {msg.senderName}
          </AppText>
        )}
        <AppText
          variant="body"
          color={isMe ? Colors.white : Colors.textPrimary}
          style={{ lineHeight: 20 }}
        >
          {msg.content}
        </AppText>
        <AppText
          variant="caption"
          color={isMe ? 'rgba(255,255,255,0.65)' : Colors.textMuted}
          style={b.time}
        >
          {fmtTime(msg.createdAt)}
        </AppText>
      </View>
    </View>
  );
}

const b = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  rowMe:    { flexDirection: 'row-reverse' },
  bubble: {
    maxWidth: '72%', borderRadius: 16,
    padding: Spacing.sm,
    gap: 3,
  },
  bubbleThem: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 2,
  },
  bubbleMe: {
    backgroundColor: Colors.club,
    borderTopRightRadius: 2,
  },
  time: { alignSelf: 'flex-end', marginTop: 2 },
});

export function GroupChatScreen({ route, navigation }: Props) {
  const { groupId }  = route.params as { groupId: string };
  const user         = useSelector((s: RootState) => s.auth.user);
  const group        = useSelector((s: RootState) => s.club.activeGroup);

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const unsub = subscribeToGroupMessages(groupId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => unsub();
  }, [groupId]);

  const send = async () => {
    if (!text.trim() || !user) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      await sendGroupMessage({
        groupId,
        senderId:    user.id,
        senderName:  user.name,
        senderAvatar: user.avatarUrl,
        content,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <AppText style={{ fontSize: 22, color: Colors.primary }}>‹</AppText>
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={1}>
            {group?.name ?? 'Group Chat'}
          </AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {group?.memberCount ?? 0} members
          </AppText>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('GroupDetail', { groupId })}>
          <AppText style={{ fontSize: 22 }}>ℹ️</AppText>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <MessageBubble msg={item} isMe={item.senderId === user?.id} />
          )}
          contentContainerStyle={s.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <AppText variant="bodySmall" color={Colors.textMuted} align="center" style={{ marginTop: 40 }}>
              No messages yet.{'\n'}Say hello! 👋
            </AppText>
          }
        />

        {/* Input bar */}
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor={Colors.textLight}
            multiline
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <TouchableOpacity
            style={[s.sendBtn, { opacity: text.trim() ? 1 : 0.4 }]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            <AppText style={{ fontSize: 18, color: Colors.white }}>↑</AppText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  backBtn:      { width: 36, alignItems: 'center' },
  headerInfo:   { flex: 1, gap: 1 },
  messageList:  { padding: Spacing.base, paddingBottom: Spacing.md },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 0.5, borderTopColor: Colors.divider,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular, fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.club,
    alignItems: 'center', justifyContent: 'center',
  },
});
