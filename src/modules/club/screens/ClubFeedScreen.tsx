import React, { useCallback } from 'react';
import {
  View, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector }  from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }     from '../../../store';
import { useClubFeed }   from '../hooks/useClub';
import { PostCard }      from '../components/PostCard';
import { AppText }       from '../../../shared/components/AppText';
import { AppEmptyState } from '../../../shared/components/AppEmptyState';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { AppAvatar }     from '../../../shared/components/AppAvatar';
import { AppTopNav }     from '../../../shared/components/AppTopNav';
import { Colors }        from '../../../shared/theme/colors';
import { Spacing }       from '../../../shared/theme/spacing';
import { Post }          from '../types';

// Navigation type — ClubFeed stack param list defined in types.ts
type Props = NativeStackScreenProps<any, 'ClubFeed'>;

export function ClubFeedScreen({ navigation }: Props) {
  const user = useSelector((s: RootState) => s.auth.user);
  const {
    feed, loading, refreshing, hasMore,
    loadMore, refresh, likePost, savePost, removePost,
  } = useClubFeed();

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      currentUserId={user?.id ?? ''}
      onPress={()  => navigation.navigate('PostDetail', { postId: item.id })}
      onLike={()   => likePost(item.id)}
      onSave={()   => savePost(item.id)}
      onComment={() => navigation.navigate('PostDetail', { postId: item.id })}
      onDelete={item.authorId === user?.id ? () => removePost(item.id) : undefined}
    />
  ), [user?.id, likePost, savePost, removePost]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Top nav — identical on every feature's home screen.
          Note: Club isn't mounted under the root tab navigator yet, so this
          screen currently can only be reached in isolation (e.g. dev/preview). */}
      <AppTopNav active="club" onBellPress={() => {}} onMenuPress={() => {}} />

      {/* Header */}
      <View style={s.header}>
        <AppText variant="headingLarge" color={Colors.textPrimary}>Club</AppText>
        <View style={s.headerRight}>
          <TouchableOpacity
            style={s.avatarBtn}
            onPress={() => navigation.navigate('CreatePost', {})}
          >
            <View style={s.newPostBtn}>
              <AppText style={{ fontSize: 18 }}>✏️</AppText>
            </View>
          </TouchableOpacity>
          <AppAvatar uri={user?.avatarUrl} name={user?.name} size={36} />
        </View>
      </View>

      {/* Stories strip placeholder */}
      <View style={s.storiesStrip}>
        <TouchableOpacity
          style={s.storyAdd}
          onPress={() => navigation.navigate('CreatePost', {})}
        >
          <View style={s.storyAddCircle}>
            <AppText style={{ fontSize: 22 }}>+</AppText>
          </View>
          <AppText variant="caption" color={Colors.textMuted}>Post</AppText>
        </TouchableOpacity>
      </View>

      {/* Feed */}
      {loading && feed.length === 0 ? (
        <AppLoadingSpinner fullscreen message="Loading feed…" />
      ) : (
        <FlatList
          data={feed}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={Colors.club}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <AppEmptyState
              emoji="🌸"
              title="No posts yet"
              subtitle="Be the first to share something with the community!"
              actionLabel="Create post"
              onAction={() => navigation.navigate('CreatePost', {})}
            />
          }
          ListFooterComponent={
            hasMore ? <AppLoadingSpinner size="small" /> : null
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={feed.length === 0 ? { flex: 1 } : undefined}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('CreatePost', {})}
        activeOpacity={0.85}
      >
        <AppText style={s.fabIcon}>✏️</AppText>
      </TouchableOpacity>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatarBtn:   {},
  newPostBtn: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  storiesStrip: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
    gap: Spacing.base,
  },
  storyAdd:   { alignItems: 'center', gap: 4 },
  storyAddCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.bgInput,
    borderWidth: 1.5, borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.club,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.club,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 10,
  },
  fabIcon: { fontSize: 22 },
});
