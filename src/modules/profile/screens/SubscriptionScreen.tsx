import React from 'react';
import {
  View, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector }  from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }       from '../../../store';
import { AppHeader }       from '../../../shared/components/AppHeader';
import { AppText }         from '../../../shared/components/AppText';
import { AppButton }       from '../../../shared/components/AppButton';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { Colors }          from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { FontFamily, FontSize } from '../../../shared/theme/typography';
import { useSubscriptionPurchase } from '../../subscription/hooks/useSubscriptionPurchase';
import { ProfileStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Subscription'>;

// ── Perks ─────────────────────────────────────────────────────────────────────
const PERKS = [
  { emoji: '📓', title: 'Unlimited Journal',     desc: 'Rich text, voice notes, scribble & media' },
  { emoji: '👗', title: 'AI Wardrobe & Fits',    desc: 'Smart outfit builder + weekly planner' },
  { emoji: '📊', title: 'All 6 Trackers',        desc: 'Mood, sleep, habits, period, health & expenses' },
  { emoji: '🎨', title: 'Boards',                desc: 'Vision boards, mood boards & travel boards' },
  { emoji: '🔒', title: 'Private Vault',         desc: 'PIN + biometric lock for your private journal' },
  { emoji: '🤖', title: 'AI Insights',           desc: 'Personalised weekly summaries & outfit tips' },
  { emoji: '📴', title: 'Offline Access',        desc: 'All data stored locally — always available' },
];

function PerkRow({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <View style={p.row}>
      <View style={p.emojiBox}><AppText style={{ fontSize: 22 }}>{emoji}</AppText></View>
      <View style={p.textCol}>
        <AppText variant="headingSmall" color={Colors.textPrimary}>{title}</AppText>
        <AppText variant="caption" color={Colors.textMuted} style={{ lineHeight: 16 }}>{desc}</AppText>
      </View>
      <AppText style={p.check}>✓</AppText>
    </View>
  );
}

const p = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.md,
    paddingVertical: Spacing.sm,
  },
  emojiBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.premiumLight,
    alignItems: 'center', justifyContent: 'center',
  },
  textCol: { flex: 1, gap: 2 },
  check: { fontSize: 18, color: Colors.success, fontFamily: FontFamily.bold },
});

// ── Active subscription view ──────────────────────────────────────────────────
function ActiveSubscription({
  expiresAt,
  provider,
  onRestore,
  onBack,
}: {
  expiresAt: string;
  provider: string;
  onRestore: () => void;
  onBack: () => void;
}) {
  const formatted = new Date(expiresAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);

  return (
    <ScrollView contentContainerStyle={act.scroll} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={act.hero}>
        <AppText style={{ fontSize: 56 }}>⭐</AppText>
        <AppText variant="displayMedium" color={Colors.white} align="center">
          You're Premium!
        </AppText>
        <AppText variant="body" color="rgba(255,255,255,0.82)" align="center">
          All features unlocked. Thank you for supporting SuperGirl.
        </AppText>
      </View>

      {/* Details card */}
      <View style={act.card}>
        <View style={act.row}>
          <AppText variant="label" color={Colors.textMuted}>Status</AppText>
          <View style={act.activePill}>
            <AppText variant="caption" color={Colors.success} style={{ fontFamily: FontFamily.bold }}>
              ● Active
            </AppText>
          </View>
        </View>
        <View style={act.row}>
          <AppText variant="label" color={Colors.textMuted}>Plan</AppText>
          <AppText variant="body" color={Colors.textPrimary}>Yearly</AppText>
        </View>
        <View style={act.row}>
          <AppText variant="label" color={Colors.textMuted}>Renews on</AppText>
          <AppText variant="body" color={Colors.textPrimary}>{formatted}</AppText>
        </View>
        <View style={act.row}>
          <AppText variant="label" color={Colors.textMuted}>Days remaining</AppText>
          <AppText variant="body" color={days <= 30 ? Colors.warning : Colors.textPrimary}>
            {days} days
          </AppText>
        </View>
        <View style={[act.row, { borderBottomWidth: 0 }]}>
          <AppText variant="label" color={Colors.textMuted}>Payment via</AppText>
          <AppText variant="body" color={Colors.textSecondary}>
            {provider === 'ios_iap' ? 'Apple In-App Purchase'
              : provider === 'android_iap' ? 'Google Play'
              : 'Razorpay'}
          </AppText>
        </View>
      </View>

      {/* Manage note */}
      <AppText variant="caption" color={Colors.textMuted} align="center" style={act.note}>
        {Platform.OS === 'ios'
          ? 'To cancel or manage billing, go to Settings → Apple ID → Subscriptions.'
          : 'To cancel or manage billing, open Google Play → Subscriptions.'}
      </AppText>

      <TouchableOpacity onPress={onBack} style={act.backBtn}>
        <AppText variant="body" color={Colors.primary}>← Back to Profile</AppText>
      </TouchableOpacity>
    </ScrollView>
  );
}

const act = StyleSheet.create({
  scroll:     { padding: Spacing.base, gap: Spacing.base },
  hero: {
    alignItems:      'center',
    backgroundColor: Colors.premium,
    marginHorizontal: -Spacing.base,
    paddingVertical:  Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    gap:             Spacing.sm,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.lg,
    overflow:        'hidden',
    ...Shadows.md,
  },
  row: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  activePill: {
    backgroundColor: Colors.success + '15',
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  note:   { lineHeight: 18 },
  backBtn:{ alignItems: 'center', marginTop: Spacing.md },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export function SubscriptionScreen({ navigation }: Props) {
  const user        = useSelector((s: RootState) => s.auth.user);
  const tier        = useSelector((s: RootState) => s.auth.subscriptionTier);
  const expiry      = useSelector((s: RootState) => s.auth.subscriptionExpiry);
  const subState    = useSelector((s: RootState) => s.subscription);
  const isPremium   = tier === 'premium';

  const { buy, restore, buying, restoring } = useSubscriptionPurchase();

  if (buying || restoring) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <AppHeader
          title="Subscription"
          leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
          onLeftPress={() => navigation.goBack()}
        />
        <AppLoadingSpinner
          fullscreen
          message={buying ? 'Processing payment…' : 'Restoring purchases…'}
          color={Colors.premium}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader
        title="Subscription"
        leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()}
        accentColor={Colors.premium}
      />

      {isPremium && expiry ? (
        <ActiveSubscription
          expiresAt={expiry}
          provider={subState.provider ?? 'razorpay'}
          onRestore={restore}
          onBack={() => navigation.goBack()}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
          {/* Hero band */}
          <View style={s.hero}>
            <AppText style={{ fontSize: 52 }}>⭐</AppText>
            <AppText variant="displayMedium" color={Colors.white} align="center">
              SuperGirl Premium
            </AppText>
            <AppText variant="body" color="rgba(255,255,255,0.85)" align="center">
              Everything you need — one subscription, one year.
            </AppText>
          </View>

          {/* Price card */}
          <View style={s.priceCard}>
            <View style={s.priceRow}>
              <AppText variant="displayLarge" color={Colors.premium}>₹999</AppText>
              <View style={s.priceRightCol}>
                <AppText variant="headingSmall" color={Colors.textPrimary}>per year</AppText>
                <AppText variant="caption" color={Colors.textMuted}>Auto-renews annually</AppText>
              </View>
            </View>
            <AppText variant="caption" color={Colors.success} style={s.savingsBadge}>
              🎉  That's just ₹83/month — less than a cup of coffee
            </AppText>
          </View>

          {/* Perks list */}
          <View style={s.perksCard}>
            <AppText variant="headingSmall" color={Colors.textPrimary} style={s.perksTitle}>
              Everything included
            </AppText>
            {PERKS.map(perk => <PerkRow key={perk.title} {...perk} />)}
          </View>

          {/* CTA */}
          <AppButton
            label={`Start Premium — ₹999/year`}
            onPress={buy}
            variant="premium"
            size="lg"
            fullWidth
            loading={buying}
            style={s.cta}
          />

          {/* Restore */}
          <TouchableOpacity onPress={restore} style={s.restoreBtn} disabled={restoring}>
            <AppText variant="bodySmall" color={Colors.primary}>
              Restore previous purchase
            </AppText>
          </TouchableOpacity>

          {/* Legal */}
          <AppText variant="caption" color={Colors.textMuted} align="center" style={s.legal}>
            Payment charged to your {Platform.OS === 'ios' ? 'Apple ID' : Platform.OS === 'android' ? 'Google Play account' : 'payment method'}{' '}
            upon confirmation. Subscription automatically renews each year unless cancelled{' '}
            at least 24 hours before the renewal date.{'\n\n'}
            By subscribing you agree to our{' '}
            <AppText variant="caption" color={Colors.primary}>Terms of Service</AppText>
            {' '}and{' '}
            <AppText variant="caption" color={Colors.primary}>Privacy Policy</AppText>.
          </AppText>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bgApp },
  scroll: { gap: Spacing.base },
  hero: {
    backgroundColor:   Colors.premiumDark,
    alignItems:        'center',
    paddingVertical:   Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    gap:               Spacing.sm,
  },
  priceCard: {
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.base,
    borderRadius:    Radius.lg,
    padding:         Spacing.base,
    gap:             Spacing.sm,
    ...Shadows.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           Spacing.md,
  },
  priceRightCol:  { gap: 2, paddingBottom: 6 },
  savingsBadge: {
    backgroundColor: Colors.success + '12',
    borderRadius:    Radius.sm,
    padding:         Spacing.sm,
    overflow:        'hidden',
    lineHeight:      18,
  },
  perksCard: {
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.base,
    borderRadius:    Radius.lg,
    padding:         Spacing.base,
    gap:             2,
    ...Shadows.sm,
  },
  perksTitle:  { marginBottom: Spacing.sm },
  cta:         { marginHorizontal: Spacing.base },
  restoreBtn:  { alignItems: 'center', paddingVertical: Spacing.sm },
  legal: {
    marginHorizontal: Spacing.base,
    lineHeight:       17,
    marginBottom:     Spacing['2xl'],
  },
});
