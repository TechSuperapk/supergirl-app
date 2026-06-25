import React from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useClubGroups } from '../hooks/useClub';
import { GroupCard }     from '../components/GroupCard';
import { AppText }       from '../../../shared/components/AppText';
import { AppEmptyState } from '../../../shared/components/AppEmptyState';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { Colors }        from '../../../shared/theme/colors';
import { Spacing }       from '../../../shared/theme/spacing';
import { Group }         from '../types';

// ── GroupsListScreen ──────────────────────────────────────────────────────────
type ListProps = NativeStackScreenProps<any, 'GroupsList'>;

export function GroupsListScreen({ navigation }: ListProps) {
  const { groups, myGroups, loading, join, leave, openGroup } = useClubGroups();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <AppText variant="headingLarge" color={Colors.textPrimary}>Groups</AppText>
      </View>

      {loading ? (
        <AppLoadingSpinner fullscreen message="Loading groups…" />
      ) : (
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
      )}
    </SafeAreaView>
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
});
