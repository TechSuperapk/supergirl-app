import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { AppText }   from '../../../shared/components/AppText';
import { AppButton } from '../../../shared/components/AppButton';
import { Colors }    from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { Community, CommunityMembership } from '../types';

interface Props {
  community:   Community;
  joined:      boolean;
  membership?: CommunityMembership; // present only when `joined` — drives the unread dot
  onPress:     () => void;
  onJoin:      () => void;
  onLeave:     () => void;
}

// Cheap "unread" signal: a joined community the user has never opened
// (lastReadAt never set) shows a dot. We don't have a per-community
// "latest post time" denormalized anywhere yet, so this can't yet detect
// "new posts since last visit" precisely — that would need either a
// lastPostAt field on Community (bumped by createPost, another batched
// write) or a client-side comparison against the community feed's newest
// post. Flagged here rather than silently faked as more precise than it is.
function isUnread(membership?: CommunityMembership): boolean {
  return !!membership && !membership.lastReadAt;
}

export function CommunityCard({ community, joined, membership, onPress, onJoin, onLeave }: Props) {
  const unread = joined && isUnread(membership);

  return (
    <View style={s.cardShadowWrap}>
      <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.9}>
        <View style={s.icon}>
          {community.iconUrl
            ? <Image source={{ uri: community.iconUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <AppText style={{ fontSize: 24 }}>🐝</AppText>
          }
          {unread && <View style={s.unreadDot} />}
        </View>

        <View style={s.body}>
          <View style={s.row}>
            <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={1}>
              {community.name}
            </AppText>
            {community.isDefault && (
              <View style={s.defaultPill}>
                <AppText variant="caption" color={Colors.club}>Default</AppText>
              </View>
            )}
          </View>
          <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
            {community.memberCount} member{community.memberCount !== 1 ? 's' : ''}
            {community.category ? ` · ${community.category}` : ''}
          </AppText>
          {!!community.description && (
            <AppText variant="caption" color={Colors.textMuted} numberOfLines={1} style={s.desc}>
              {community.description}
            </AppText>
          )}
        </View>

        {!community.isDefault && (
          joined
            ? <AppButton label="Joined ✓" onPress={onLeave} variant="ghost" size="sm" />
            : <AppButton label="Join"     onPress={onJoin}  variant="secondary" size="sm" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  cardShadowWrap: {
    borderRadius:    Radius.lg,
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.base,
    marginBottom:    Spacing.sm,
    ...Shadows.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.md,
    padding:       Spacing.md,
    borderRadius:  Radius.lg,
    overflow:      'hidden',
  },
  icon: {
    width: 48, height: 48, borderRadius: Radius.md,
    backgroundColor: Colors.club + '18',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'visible',
  },
  unreadDot: {
    position: 'absolute', top: -2, right: -2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.error,
    borderWidth: 2, borderColor: Colors.bgCard,
  },
  body: { flex: 1, gap: 2 },
  row:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  desc: { marginTop: 1 },
  defaultPill: {
    backgroundColor: Colors.club + '18',
    borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 1,
  },
});
