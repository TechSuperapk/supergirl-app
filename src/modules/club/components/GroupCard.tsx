import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { AppText }   from '../../../shared/components/AppText';
import { AppButton } from '../../../shared/components/AppButton';
import { Colors }    from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { Group }     from '../types';

interface Props {
  group:    Group;
  joined:   boolean;
  onPress:  () => void;
  onJoin:   () => void;
  onLeave:  () => void;
}

export function GroupCard({ group, joined, onPress, onJoin, onLeave }: Props) {
  return (
    // Shadow lives on this outer wrapper (no overflow:'hidden' here) — the
    // inner TouchableOpacity clips the cover image to its rounded corners.
    // overflow:'hidden' on the SAME view as a shadow suppresses it on Android.
    <View style={s.cardShadowWrap}>
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.9}>
      {/* Cover strip */}
      <View style={s.cover}>
        {group.coverUrl
          ? <Image source={{ uri: group.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.club + '25', alignItems: 'center', justifyContent: 'center' }]}>
              <AppText style={{ fontSize: 32 }}>👥</AppText>
            </View>
        }
        {group.isPrivate && (
          <View style={s.privateBadge}>
            <AppText variant="caption" color={Colors.white}>🔒 Private</AppText>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={s.body}>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={1}>
              {group.name}
            </AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
            </AppText>
          </View>
          {joined
            ? <AppButton label="Joined ✓" onPress={onLeave} variant="ghost" size="sm" />
            : <AppButton label="Join"     onPress={onJoin}  variant="secondary" size="sm" />
          }
        </View>
        {!!group.description && (
          <AppText variant="caption" color={Colors.textMuted} numberOfLines={2}>
            {group.description}
          </AppText>
        )}
      </View>
    </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  // Shadow-casting wrapper — no overflow/clipping of its own so the shadow
  // renders fully on both iOS (shadow* props) and Android (elevation).
  cardShadowWrap: {
    borderRadius:    Radius.lg,
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.base,
    marginBottom:    Spacing.md,
    ...Shadows.md,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.lg,
    overflow:        'hidden',
  },
  cover: { height: 90 },
  privateBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  body: { padding: Spacing.base, gap: Spacing.sm },
  row:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
