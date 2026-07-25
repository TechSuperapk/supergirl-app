import React, { useCallback, useMemo, useState } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector }  from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState } from '../../../store';
import { useCommunityFeed, useCommunities } from '../hooks/useClub';
import { PostCard }      from '../components/PostCard';
import { AppText }       from '../../../shared/components/AppText';
import { AppEmptyState } from '../../../shared/components/AppEmptyState';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { Colors }        from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { Post } from '../types';
import { SAMPLE_FEED } from '../sampleFeed';

// ── CommunityDetailScreen — the individual club/Hive page (spec 2.3) ──────────
// Shows ONLY this community's own feed (useCommunityFeed), never the
// cross-community mix the Home screen shows. Forum/Anonymous is a client-side
// filter over the same loaded feed rather than two separate Firestore
// queries — isAnonymous is a boolean on a post already fetched for this
// community, so there's nothing a second query would add except latency.
type Props = NativeStackScreenProps<any, 'CommunityDetail'>;

export function CommunityDetailScreen({ route, navigation }: Props) {
  const { communityId, name } = route.params as { communityId: string; name?: string };
  const user = useSelector((s: RootState) => s.auth.user);
  const { communities, joined, join, leave, markRead } = useCommunities();
  const {
    feed, loading, refreshing, hasMore,
    loadMore, refresh, likePost, savePost, removePost,
  } = useCommunityFeed(communityId);

  const [search, setSearch] = useState('');
  const [view, setView] = useState<'forum' | 'anonymous'>('forum');

  const community = communities.find(c => c.id === communityId);
  const isJoined  = joined.some(c => c.id === communityId);

  // Mark this community read the first time its feed finishes loading —
  // best-effort, not blocking the render either way.
  const markedRef = React.useRef(false);
  React.useEffect(() => {
    if (!loading && !markedRef.current) {
      markedRef.current = true;
      markRead(communityId).catch(() => {});
    }
  }, [loading, communityId]);

  // When this community's live feed is empty (fresh account), fall back to the
  // template threads so the page shows multiple club posts/threads. Baehive
  // aggregates every post, so this is where "all posts show".
  const usingSample = !loading && feed.length === 0;
  const baseFeed = usingSample ? SAMPLE_FEED : feed;

  const filtered = useMemo(() => {
    let out = baseFeed;
    if (view === 'anonymous') out = out.filter(p => p.isAnonymous);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(p => p.content.toLowerCase().includes(q));
    }
    return out;
  }, [baseFeed, view, search]);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      currentUserId={user?.id ?? ''}
      onPress={()  => usingSample ? undefined : navigation.navigate('PostDetail', { postId: item.id })}
      onLike={()   => usingSample ? undefined : likePost(item.id)}
      onSave={()   => usingSample ? undefined : savePost(item.id)}
      onComment={() => usingSample ? undefined : navigation.navigate('PostDetail', { postId: item.id })}
      onDelete={!usingSample && item.authorId === user?.id ? () => removePost(item.id) : undefined}
    />
  ), [user?.id, likePost, savePost, removePost, navigation, usingSample]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <AppText variant="body" color={Colors.primary}>‹ Back</AppText>
        </TouchableOpacity>
        <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={1} style={{ flex: 1 }}>
          {community?.name ?? name ?? 'Community'}
        </AppText>
        {community && !community.isDefault && (
          isJoined
            ? <TouchableOpacity style={s.joinBtn} onPress={() => leave(communityId)}>
                <AppText variant="caption" color={Colors.textSecondary}>Joined ✓</AppText>
              </TouchableOpacity>
            : <TouchableOpacity style={[s.joinBtn, { backgroundColor: Colors.club }]} onPress={() => join(communityId)}>
                <AppText variant="caption" color={Colors.white}>Join</AppText>
              </TouchableOpacity>
        )}
      </View>

      {!!community && (
        <AppText variant="caption" color={Colors.textMuted} style={s.memberLine}>
          {community.memberCount} member{community.memberCount !== 1 ? 's' : ''}
          {community.category ? ` · ${community.category}` : ''}
        </AppText>
      )}

      <View style={s.searchBox}>
        <AppText style={{ fontSize: 16 }}>🔍</AppText>
        <TextInput
          style={s.searchInput}
          placeholder={`Search ${community?.name ?? 'this community'}…`}
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, view === 'forum' && s.tabBtnActive]} onPress={() => setView('forum')}>
          <AppText variant="button" color={view === 'forum' ? Colors.club : Colors.textMuted}>Forum</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, view === 'anonymous' && s.tabBtnActive]} onPress={() => setView('anonymous')}>
          <AppText variant="button" color={view === 'anonymous' ? Colors.club : Colors.textMuted}>Anonymous</AppText>
        </TouchableOpacity>
      </View>

      {loading && feed.length === 0 ? (
        <AppLoadingSpinner fullscreen message="Loading posts…" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.club} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <AppEmptyState
              emoji="🐝"
              title={view === 'anonymous' ? 'No anonymous posts yet' : 'No posts yet'}
              subtitle="Posts tagged to this community will show up here."
            />
          }
          ListFooterComponent={hasMore ? <AppLoadingSpinner size="small" /> : null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={filtered.length === 0 ? { flex: 1 } : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  backBtn: { width: 56 },
  joinBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgInput,
  },
  memberLine: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bgInput, borderRadius: Radius.md,
    marginHorizontal: Spacing.base, marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md, height: 42,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary, padding: 0 },
  tabRow: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  tabBtn: {
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgInput,
  },
  tabBtnActive: { backgroundColor: Colors.club + '18' },
});
