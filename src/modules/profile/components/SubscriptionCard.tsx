import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors }    from '../../../shared/theme/colors';
import { FontFamily, FontSize } from '../../../shared/theme/typography';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';

interface Props {
  isPremium:  boolean;
  expiresAt?: string | null;
  onUpgrade:  () => void;
  onManage:   () => void;
}

function daysLeft(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function SubscriptionCard({ isPremium, expiresAt, onUpgrade, onManage }: Props) {
  if (isPremium && expiresAt) {
    const days = daysLeft(expiresAt);
    const urgent = days <= 30;

    return (
      <View style={[s.card, s.premiumCard]}>
        <View style={s.row}>
          <Text style={s.starIcon}>⭐</Text>
          <View style={s.textCol}>
            <Text style={[s.planTitle, { fontFamily: FontFamily.bold }]}>
              SuperGirl Premium
            </Text>
            <Text style={[s.planSub, { fontFamily: FontFamily.regular,
              color: urgent ? Colors.warning : Colors.textMuted }]}>
              {urgent
                ? `⚠️ Expires in ${days} day${days !== 1 ? 's' : ''}`
                : `Active until ${formatDate(expiresAt)}`
              }
            </Text>
          </View>
          <View style={s.activePill}>
            <Text style={[s.activeTxt, { fontFamily: FontFamily.bold }]}>Active</Text>
          </View>
        </View>
        <TouchableOpacity style={s.manageBtn} onPress={onManage} activeOpacity={0.8}>
          <Text style={[s.manageTxt, { fontFamily: FontFamily.medium }]}>
            Manage Subscription →
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.card, s.freeCard]}>
      <View style={s.row}>
        <Text style={s.lockIcon}>🔒</Text>
        <View style={s.textCol}>
          <Text style={[s.planTitle, { fontFamily: FontFamily.bold }]}>
            Free Plan
          </Text>
          <Text style={[s.planSub, { fontFamily: FontFamily.regular }]}>
            Upgrade to unlock Journal, Fits, Trackers & Boards
          </Text>
        </View>
      </View>
      <TouchableOpacity style={s.upgradeBtn} onPress={onUpgrade} activeOpacity={0.85}>
        <Text style={[s.upgradeTxt, { fontFamily: FontFamily.bold }]}>
          ⭐  Upgrade — ₹999/year
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.base,
    borderRadius:     Radius.lg,
    padding:          Spacing.base,
    gap:              Spacing.md,
    ...Shadows.md,
  },
  premiumCard: { backgroundColor: Colors.premiumLight, borderWidth: 1.5, borderColor: Colors.premium + '40' },
  freeCard:    { backgroundColor: Colors.bgCard },
  row:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  starIcon:    { fontSize: 28 },
  lockIcon:    { fontSize: 28 },
  textCol:     { flex: 1, gap: 2 },
  planTitle:   { fontSize: FontSize.md, color: Colors.textPrimary },
  planSub:     { fontSize: FontSize.sm, lineHeight: 18 },
  activePill: {
    backgroundColor: Colors.success + '20',
    borderRadius:    Radius.full,
    paddingHorizontal: 10,
    paddingVertical:  4,
  },
  activeTxt:   { fontSize: FontSize.xs, color: Colors.success },
  manageBtn: {
    borderTopWidth: 1,
    borderTopColor: Colors.premium + '30',
    paddingTop:     Spacing.sm,
  },
  manageTxt:   { fontSize: FontSize.sm, color: Colors.premiumDark },
  upgradeBtn: {
    backgroundColor: Colors.premium,
    borderRadius:    Radius.md,
    paddingVertical: 13,
    alignItems:      'center',
    ...Shadows.premium,
  },
  upgradeTxt:  { fontSize: FontSize.base, color: Colors.white },
});
