import React, { useMemo, useState } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useClubGroups, useCommunities } from '../hooks/useClub';
import { GroupCard }     from '../components/GroupCard';
import { CommunityCard } from '../components/CommunityCard';
import { AppText }       from '../../../shared/components/AppText';
import { AppEmptyState } from '../../../shared/components/AppEmptyState';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { AppTopNav }     from '../../../shared/components/AppTopNav';
import { Colors }        from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { Group, Community } from '../types';

type SortKey = 'members' | 'alpha' | 'recent';
const SORT_LABELS: Record<SortKey, string> = {
  members: 'Most members',
  alpha:   'A – Z',
  recent:  'Recently joined',
};

// ── GroupsListScreen — the module's Groups/Community landing screen ───────────
// Spec 2.2: a Forums|Groups tab switch. "Forums" is the Community/Hive list
// (this module's forum-style spaces, e.g. Baehive) with search + category
// filter + sort; "Groups" is the pre-existing small opt-in chat-group list,
// UI unchanged from before this rebuild.
type ListProps = NativeStackScreenProps<any, 'GroupsList'>;

const fmtMembers = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${n}`);

export function GroupsListScreen({ navigation }: ListProps) {
  const { communities, loading } = useCommunities();
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? communities.filter(c => c.name.toLowerCase().includes(q)) : communities;
  }, [communities, query]);

  const renderItem = ({ item }: { item: Community }) => (
    <TouchableOpacity
      style={s.commCard}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('CommunityDetail', { communityId: item.id, name: item.name })}
    >
      <View style={s.commIcon}><AppText style={{ fontSize: 24 }}>{item.emoji ?? '🐝'}</AppText></View>
      <View style={{ flex: 1 }}>
        <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={1}>{item.name}</AppText>
        <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
          {fmtMembers(item.memberCount)} members{item.status ? ` • ${item.status}` : ''}
        </AppText>
      </View>
      {!!item.badge && (
        <View style={s.commBadge}>
          <AppText variant="caption" color={Colors.white} style={{ fontFamily: 'DMSans-Bold' }}>{item.badge}</AppText>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <AppText variant="headingLarge" color={Colors.textPrimary}>Groups</AppText>
      </View>

      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <AppText style={{ fontSize: 16 }}>🔍</AppText>
          <TextInput
            style={s.searchInput}
            placeholder="Search Communities..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <View style={s.filterBtn}><AppText style={{ fontSize: 20, color: Colors.textSecondary }}>≡</AppText></View>
      </View>

      <View style={s.sectionRow}>
        <AppText variant="headingSmall" color={Colors.textPrimary}>Joined Communities</AppText>
        <AppText variant="label" color={Colors.textMuted}>View all</AppText>
      </View>

      {loading && communities.length === 0 ? (
        <AppLoadingSpinner fullscreen message="Loading communities…" />
      ) : (
        <FlatList
          data={list}
          keyExtractor={c => c.id}
          renderItem={renderItem}
          contentContainerStyle={s.commList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<AppEmptyState emoji="🔍" title="No communities" subtitle="Try a different search." />}
        />
      )}
    </SafeAreaView>
  );
}

// ── Forums (Communities) tab ───────────────────────────────────────────────────
function ForumsTab({ navigation }: { navigation: ListProps['navigation'] }) {
  const { communities, joined, discover, myMemberships, loading, join, leave, refresh } = useCommunities();
  const [search, setSearch]   = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('members');

  const categories = useMemo(
    () => Array.from(new Set(communities.map(c => c.category).filter(Boolean))) as string[],
    [communities],
  );

  const applyFilters = (list: Community[]) => {
    let out = list;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    if (category) out = out.filter(c => c.category === category);
    out = [...out].sort((a, b) => {
      if (sort === 'members') return b.memberCount - a.memberCount;
      if (sort === 'alpha')   return a.name.localeCompare(b.name);
      return 0; // 'recent' has no per-community timestamp to sort by here — falls back to server order
    });
    return out;
  };

  const joinedFiltered   = applyFilters(joined);
  const discoverFiltered = applyFilters(discover);

  const openCommunity = (c: Community) => navigation.navigate('CommunityDetail', { communityId: c.id, name: c.name });

  const sections = [
    { key: 'joined',   title: 'Your Communities', data: joinedFiltered },
    { key: 'discover', title: 'Discover New',      data: discoverFiltered },
  ].filter(sec => sec.data.length > 0);

  return (
    <>
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <AppText style={{ fontSize: 16 }}>🔍</AppText>
          <TextInput
            style={s.searchInput}
            placeholder="Search communities…"
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={s.filterBtn} onPress={() => setFilterOpen(true)}>
          <AppText style={{ fontSize: 18 }}>⚙️</AppText>
        </TouchableOpacity>
      </View>

      {loading && communities.length === 0 ? (
        <AppLoadingSpinner fullscreen message="Loading communities…" />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={sec => sec.key}
          renderItem={({ item: sec }) => (
            <View>
              <AppText variant="label" color={Colors.textMuted} style={s.sectionTitle}>
                {sec.title.toUpperCase()}
              </AppText>
              {sec.data.map(c => (
                <CommunityCard
                  key={c.id}
                  community={c}
                  joined={sec.key === 'joined'}
                  membership={myMemberships.find(m => m.communityId === c.id)}
                  onPress={() => openCommunity(c)}
                  onJoin={() => join(c.id)}
                  onLeave={() => leave(c.id)}
                />
              ))}
            </View>
          )}
          contentContainerStyle={s.list}
          refreshing={loading}
          onRefresh={refresh}
          ListEmptyComponent={
            <AppEmptyState
              emoji="🐝"
              title="No communities found"
              subtitle={search ? 'Try a different search term.' : 'Communities will appear here.'}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setFilterOpen(false)}>
          <View style={s.modalCard} onStartShouldSetResponder={() => true}>
            <AppText variant="headingSmall" color={Colors.textPrimary} style={{ marginBottom: Spacing.sm }}>
              Sort by
            </AppText>
            <View style={s.chipRow}>
              {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
                <TouchableOpacity
                  key={key}
                  style={[s.chip, sort === key && s.chipActive]}
                  onPress={() => setSort(key)}
                >
                  <AppText variant="caption" color={sort === key ? Colors.white : Colors.textSecondary}>
                    {SORT_LABELS[key]}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            {categories.length > 0 && (
              <>
                <AppText variant="headingSmall" color={Colors.textPrimary} style={{ marginTop: Spacing.base, marginBottom: Spacing.sm }}>
                  Category
                </AppText>
                <View style={s.chipRow}>
                  <TouchableOpacity
                    style={[s.chip, category === null && s.chipActive]}
                    onPress={() => setCategory(null)}
                  >
                    <AppText variant="caption" color={category === null ? Colors.white : Colors.textSecondary}>All</AppText>
                  </TouchableOpacity>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[s.chip, category === cat && s.chipActive]}
                      onPress={() => setCategory(cat)}
                    >
                      <AppText variant="caption" color={category === cat ? Colors.white : Colors.textSecondary}>{cat}</AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity style={s.doneBtn} onPress={() => setFilterOpen(false)}>
              <AppText variant="button" color={Colors.white}>Done</AppText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Groups tab — unchanged behavior from the pre-rebuild GroupsListScreen ──────
function GroupsTab({ navigation }: { navigation: ListProps['navigation'] }) {
  const { groups, myGroups, loading, join, leave, openGroup } = useClubGroups();

  if (loading) return <AppLoadingSpinner fullscreen message="Loading groups…" />;

  return (
    <FlatList
      data={groups}
      keyExtractor={item => item.id}
      renderItem={({ item }: { item: Group }) => (
        <GroupCard
          group={item}
          joined={myGroups.includes(item.id)}
          onPress={() => {
            openGroup(item);
            navigation.navigate('GroupDetail', { groupId: item.id });
          }}
          onJoin={() => join(item.id)}
          onLeave={() => leave(item.id)}
        />
      )}
      contentContainerStyle={s.list}
      ListEmptyComponent={
        <AppEmptyState
          emoji="👥"
          title="No groups yet"
          subtitle="Groups will appear here once they're created."
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

// ── GroupDetailScreen ─────────────────────────────────────────────────────────
type DetailProps = NativeStackScreenProps<any, 'GroupDetail'>;

export function GroupDetailScreen({ route, navigation }: DetailProps) {
  const { groupId }  = route.params as { groupId: string };
  const { groups, myGroups, join, leave } = useClubGroups();
  const group  = groups.find(g => g.id === groupId);
  const joined = myGroups.includes(groupId);

  if (!group) return <AppLoadingSpinner fullscreen />;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <AppText variant="body" color={Colors.primary}>‹ Back</AppText>
        </TouchableOpacity>
        <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={1}>
          {group.name}
        </AppText>
        <View style={{ width: 64 }} />
      </View>

      <View style={s.detailBody}>
        <AppText variant="body" color={Colors.textSecondary} style={{ lineHeight: 22 }}>
          {group.description}
        </AppText>
        <AppText variant="caption" color={Colors.textMuted}>
          👥 {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
          {group.isPrivate && ' · 🔒 Private group'}
        </AppText>

        <View style={s.actionRow}>
          {joined ? (
            <>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: Colors.club }]}
                onPress={() => navigation.navigate('GroupChat', { groupId })}
              >
                <AppText style={{ fontSize: 18 }}>💬</AppText>
                <AppText variant="button" color={Colors.white}>Chat</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, s.ghostBtn]}
                onPress={() => leave(groupId)}
              >
                <AppText variant="button" color={Colors.textSecondary}>Leave group</AppText>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: Colors.club, flex: 1 }]}
              onPress={() => join(groupId)}
            >
              <AppText variant="button" color={Colors.white}>Join Group</AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },

  // Groups list (design)
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingTop: Spacing.base },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, height: 48,
  },
  searchInput: { flex: 1, fontFamily: 'DMSans-Regular', fontSize: 15, color: Colors.textPrimary, padding: 0 },
  filterBtn: {
    width: 48, height: 48, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  commList: { paddingHorizontal: Spacing.base, paddingBottom: 40, gap: Spacing.sm },
  commCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    ...Shadows.sm,
  },
  commIcon: {
    width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: Colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  commBadge: {
    minWidth: 30, height: 30, borderRadius: 15, paddingHorizontal: 6,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
  },
  backBtn:    { width: 64 },
  list:       { paddingTop: Spacing.base, paddingBottom: 40 },
  detailBody: { padding: Spacing.base, gap: Spacing.md },
  actionRow:  { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderRadius: 12,
  },
  ghostBtn: { borderWidth: 1.5, borderColor: Colors.border },

  // Forums/Groups tab switch
  tabRow: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  tabBtn: {
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgInput,
  },
  tabBtnActive: { backgroundColor: Colors.club + '18' },

  // Forums search + filter
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bgInput, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, height: 42,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary, padding: 0 },
  filterBtn: {
    width: 42, height: 42, borderRadius: Radius.md,
    backgroundColor: Colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: {
    paddingHorizontal: Spacing.base, paddingTop: Spacing.base, paddingBottom: Spacing.sm,
    letterSpacing: 0.5,
  },

  // Filter modal
  modalOverlay: { flex: 1, backgroundColor: Colors.bgOverlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: Spacing.base, paddingBottom: Spacing.xl,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgInput,
  },
  chipActive: { backgroundColor: Colors.club },
  doneBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.club,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
});
