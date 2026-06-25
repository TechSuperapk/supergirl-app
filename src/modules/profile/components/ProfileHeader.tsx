import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { Colors }    from '../../../shared/theme/colors';
import { FontFamily, FontSize } from '../../../shared/theme/typography';
import { Spacing, Shadows, Radius } from '../../../shared/theme/spacing';
import { AppAvatar } from '../../../shared/components/AppAvatar';

interface Stat { label: string; value: string | number }

interface Props {
  name:        string;
  bio?:        string;
  avatarUrl?:  string;
  phone:       string;
  isPremium:   boolean;
  stats:       Stat[];
  onEditPress: () => void;
}

export function ProfileHeader({
  name, bio, avatarUrl, phone, isPremium, stats, onEditPress,
}: Props) {
  return (
    <View style={s.wrap}>
      {/* Avatar row */}
      <View style={s.avatarRow}>
        <View style={s.avatarWrap}>
          <AppAvatar uri={avatarUrl} name={name} size={82} />
          {isPremium && (
            <View style={s.premiumBadge}>
              <Text style={s.premiumEmoji}>⭐</Text>
            </View>
          )}
        </View>
        <View style={s.nameCol}>
          <Text style={[s.name, { fontFamily: FontFamily.bold }]} numberOfLines={1}>
            {name || 'Your Name'}
          </Text>
          {!!bio && (
            <Text style={[s.bio, { fontFamily: FontFamily.regular }]} numberOfLines={2}>
              {bio}
            </Text>
          )}
          <Text style={[s.phone, { fontFamily: FontFamily.regular }]}>{phone}</Text>
          {isPremium && (
            <View style={s.premiumPill}>
              <Text style={[s.premiumTxt, { fontFamily: FontFamily.bold }]}>
                ⭐ Premium
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Edit button */}
      <TouchableOpacity style={s.editBtn} onPress={onEditPress} activeOpacity={0.8}>
        <Text style={[s.editTxt, { fontFamily: FontFamily.medium }]}>✏️  Edit Profile</Text>
      </TouchableOpacity>

      {/* Stats strip */}
      {stats.length > 0 && (
        <View style={s.statsRow}>
          {stats.map((stat, i) => (
            <React.Fragment key={stat.label}>
              <View style={s.statCell}>
                <Text style={[s.statValue, { fontFamily: FontFamily.bold }]}>
                  {stat.value}
                </Text>
                <Text style={[s.statLabel, { fontFamily: FontFamily.regular }]}>
                  {stat.label}
                </Text>
              </View>
              {i < stats.length - 1 && <View style={s.divider} />}
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.bgCard,
    paddingHorizontal: Spacing.base,
    paddingTop:   Spacing.base,
    paddingBottom: Spacing.md,
    gap:          Spacing.md,
    ...Shadows.sm,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.base },
  avatarWrap:{ position: 'relative' },
  premiumBadge: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 24, height: 24,
    borderRadius: 12,
    backgroundColor: Colors.premium,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  premiumEmoji: { fontSize: 12 },
  nameCol:  { flex: 1, gap: 3 },
  name:     { fontSize: FontSize.lg, color: Colors.textPrimary },
  bio:      { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  phone:    { fontSize: FontSize.sm, color: Colors.textMuted },
  premiumPill: {
    alignSelf:       'flex-start',
    backgroundColor: Colors.premiumLight,
    borderRadius:    Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 2,
  },
  premiumTxt:   { fontSize: FontSize.xs, color: Colors.premiumDark },
  editBtn: {
    alignSelf:       'flex-start',
    borderWidth:     1.5,
    borderColor:     Colors.border,
    borderRadius:    Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  editTxt:   { fontSize: FontSize.sm, color: Colors.textSecondary },
  statsRow: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: Colors.bgInput,
    borderRadius:   Radius.md,
    paddingVertical: Spacing.md,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: FontSize.lg, color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  divider:   { width: 1, height: 32, backgroundColor: Colors.border },
});
