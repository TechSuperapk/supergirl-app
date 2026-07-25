import React, { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector }  from 'react-redux';
import Svg, { Circle }  from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }     from '../../../store';
import { useHomeFeed, useClubEvents } from '../hooks/useClub';
import { PostCard }      from '../components/PostCard';
import { AppText }       from '../../../shared/components/AppText';
import { AppEmptyState } from '../../../shared/components/AppEmptyState';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { AppAvatar }     from '../../../shared/components/AppAvatar';
import { AppTopNav }     from '../../../shared/components/AppTopNav';
import { Colors }        from '../../../shared/theme/colors';
import { FontFamily }    from '../../../shared/theme/typography';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { Post, Event }   from '../types';
import { SAMPLE_FEED }   from '../sampleFeed';

// Usage ring for the banner (static template values — the app doesn't track
// per-module session time; matches the design's "89% Used" dial).
function UsageRing({ pct = 0.89 }: { pct?: number }) {
  const R = 30, C = 2 * Math.PI * R;
  return (
    <View style={{ width: 74, height: 74, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={74} height={74} style={StyleSheet.absoluteFill}>
        <Circle cx={37} cy={37} r={R} stroke="rgba(255,255,255,0.16)" strokeWidth={7} fill="none" />
        <Circle
          cx={37} cy={37} r={R} stroke="#FFCF0D" strokeWidth={7} fill="none"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)} strokeLinecap="round"
          transform="rotate(-90 37 37)"
        />
      </Svg>
      <Text style={ss.ringPct}>{Math.round(pct * 100)}<Text style={ss.ringPctSm}>%</Text></Text>
      <Text style={ss.ringSub}>Used</Text>
    </View>
  );
}

// ── ClubFeedScreen — the Club module's Home screen (spec 2.1) ─────────────────
// This is the cross-community "Recent Threads" feed (useHomeFeed — every post
// from every community the user has joined, Baehive included by default),
// not the single-community feed shown on an individual club's own page
// (CommunityDetailScreen uses useCommunityFeed for that instead).
//
// Simplification: the spec's header banner includes a "usage ring" stat
// (e.g. time-spent-today). Nothing in this app tracks per-module session
// time anywhere, and adding that tracking is out of scope for this pass —
// the banner below shows a joined-communities count instead, which is real
// data already available from useHomeFeed/useCommunities.
type Props = NativeStackScreenProps<any, 'ClubFeed'>;

function upcomingEvents(events: Event[]): Event[] {
  return events
    .filter(e => new Date(e.endDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export function ClubFeedScreen({ navigation }: Props) {
  const user = useSelector((s: RootState) => s.auth.user);
  const {
    homeFeed, loading, refreshing, hasMore,
    loadMore, refresh, likePost, savePost, removePost,
  } = useHomeFeed();
  const { events } = useClubEvents();
  const popular = upcomingEvents(events).slice(0, 6);

  // When the live feed is empty (fresh account / no posts yet), show the
  // template threads so the home screen matches the design. These are
  // read-only — no Firestore writes — so their like/save/open handlers no-op.
  const usingSample = !loading && homeFeed.length === 0;
  const feedData    = usingSample ? SAMPLE_FEED : homeFeed;

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

  const PopularEvents = popular.length > 0 ? (
    <View style={s.eventsSection}>
      <View style={s.sectionHeaderRow}>
        <AppText variant="headingMedium" color={Colors.textPrimary}>Popular Events</AppText>
        <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Hangouts')}>
          <AppText variant="label" color={Colors.textMuted}>View More</AppText>
        </TouchableOpacity>
      </View>
      <FlatList
        data={popular}
        keyExtractor={e => e.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: Spacing.sm }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.eventCard}
            onPress={() => navigation.getParent()?.navigate('Hangouts', { screen: 'EventDetail', params: { eventId: item.id } })}
            activeOpacity={0.9}
          >
            <View style={s.eventCover}>
              {item.coverUrl
                ? <Image source={{ uri: item.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                : <View style={[StyleSheet.absoluteFill, s.eventCoverPlaceholder]}>
                    <AppText style={{ fontSize: 28 }}>🎉</AppText>
                  </View>
              }
            </View>
            <AppText variant="label" color={Colors.textPrimary} numberOfLines={1} style={{ marginTop: Spacing.sm }}>
              {item.title}
            </AppText>
            <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
              {new Date(item.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              {' · '}{item.attendeeCount} going
            </AppText>
          </TouchableOpacity>
        )}
      />
    </View>
  ) : null;

  const ListHeader = (
    <View>
      {/* Black hero banner */}
      <View style={s.banner}>
        <View style={s.bannerGlow} />
        <AppText style={s.bannerText}>Your Tribe.{'\n'}Your People.{'\n'}Your Safe Space.</AppText>
        <View style={s.bannerRight}>
          <UsageRing pct={0.89} />
          <AppText style={s.bannerNew}>22 New this month ✨</AppText>
        </View>
      </View>

      {/* Add Forum compose prompt */}
      <View style={s.addForumCard}>
        <View style={s.addForumLeft}>
          <AppAvatar uri={user?.avatarUrl} name={user?.name} size={46} />
          <View>
            <AppText variant="headingSmall" color={Colors.textPrimary}>{user?.name ?? 'You'}</AppText>
            <AppText variant="body" color={Colors.textMuted}>What's new?</AppText>
          </View>
        </View>
        <TouchableOpacity style={s.addForumBtn} onPress={() => navigation.navigate('CreatePost', {})} activeOpacity={0.85}>
          <Text style={s.addForumPlus}>+</Text>
          <AppText variant="label" color={Colors.textPrimary}>Add Forum</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListFooter = (
    <View>
      {PopularEvents}
      {hasMore ? <AppLoadingSpinner size="small" /> : null}
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Top nav — identical on every feature's home screen. */}
      <AppTopNav active="club" onBellPress={() => {}} onMenuPress={() => {}} />

      {/* Feed */}
      {loading && homeFeed.length === 0 ? (
        <AppLoadingSpinner fullscreen message="Loading feed…" />
      ) : (
        <FlatList
          data={feedData}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          ListHeaderComponent={ListHeader}
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
          ListFooterComponent={ListFooter}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={feedData.length === 0 ? { flex: 1 } : undefined}
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
  newPostBtn: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingTop: Spacing.base, paddingBottom: Spacing.sm,
  },
  eventsSection: { paddingBottom: Spacing.sm },
  eventCard: {
    width: 140,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    ...Shadows.sm,
  },
  eventCover: {
    width: '100%', height: 80, borderRadius: Radius.sm,
    backgroundColor: Colors.bgInput, overflow: 'hidden',
  },
  eventCoverPlaceholder: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.club + '15',
  },

  // Black hero banner
  banner: {
    marginHorizontal: Spacing.sm, marginTop: Spacing.sm,
    backgroundColor: '#141414', borderRadius: 26,
    paddingVertical: Spacing.base, paddingHorizontal: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    overflow: 'hidden', minHeight: 132,
  },
  bannerGlow: {
    position: 'absolute', top: -110, left: 0,
    width: 170, height: 170, borderRadius: 85,
    backgroundColor: '#E4FFFE', opacity: 0.16,
  },
  bannerText: { flex: 1, color: Colors.white, fontFamily: FontFamily.bold, fontSize: 18, lineHeight: 26 },
  bannerRight: { alignItems: 'center', gap: 6 },
  bannerNew:  { color: Colors.white, fontFamily: FontFamily.medium, fontSize: 10 },

  // Add Forum card
  addForumCard: {
    marginHorizontal: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.xs,
    backgroundColor: Colors.bgCard, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(153,153,153,0.20)',
    padding: Spacing.base,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...Shadows.sm,
  },
  addForumLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  addForumBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(153,153,153,0.20)',
  },
  addForumPlus: { fontSize: 18, color: Colors.textPrimary, fontFamily: FontFamily.bold, marginTop: -2 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 10,
  },
  fabIcon: { fontSize: 22 },
});

const ss = StyleSheet.create({
  ringPct:   { color: Colors.white, fontFamily: FontFamily.bold, fontSize: 19, lineHeight: 22 },
  ringPctSm: { fontSize: 9, fontFamily: FontFamily.medium },
  ringSub:   { color: 'rgba(255,255,255,0.85)', fontFamily: FontFamily.medium, fontSize: 8, marginTop: -2 },
});
