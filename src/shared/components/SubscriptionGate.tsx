import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import { Colors } from '../theme/colors';
import { Spacing, Radius, Shadows } from '../theme/spacing';
import { FontFamily } from '../theme/typography';

interface Props {
  children:     React.ReactNode;
  module:       'journal' | 'fits' | 'trackers' | 'boards';
  onSubscribe?: () => void;
}

const MODULE_META: Record<Props['module'], { emoji: string; label: string; color: string }> = {
  journal:  { emoji: '📓', label: 'Journal',  color: Colors.journal  },
  fits:     { emoji: '👗', label: 'Fits',     color: Colors.fits     },
  trackers: { emoji: '📊', label: 'Trackers', color: Colors.trackers },
  boards:   { emoji: '🎨', label: 'Boards',   color: Colors.boards   },
};

const PERKS = [
  'Unlimited journal entries with media',
  'AI-powered outfit suggestions',
  '6 wellness & lifestyle trackers',
  'Vision boards & mood boards',
  'Private vault with PIN & biometrics',
  'Offline access — always available',
];

export function SubscriptionGate({ children, module, onSubscribe }: Props) {
  const tier = useSelector((s: RootState) => s.auth.subscriptionTier);

  if (tier === 'premium') {
    return <>{children}</>;
  }

  const meta = MODULE_META[module];

  return (
    <View style={s.screen}>
      {/* Top gradient band */}
      <View style={[s.band, { backgroundColor: meta.color }]}>
        <AppText style={s.emoji}>{meta.emoji}</AppText>
        <AppText variant="displayMedium" color={Colors.white} align="center">
          Unlock {meta.label}
        </AppText>
        <AppText variant="body" color="rgba(255,255,255,0.82)" align="center" style={s.bandSub}>
          Part of SuperGirl Premium — everything in one subscription.
        </AppText>
      </View>

      {/* Perks card */}
      <View style={s.card}>
        <AppText variant="headingSmall" color={Colors.textPrimary} style={s.perksTitle}>
          What's included
        </AppText>
        {PERKS.map((p, i) => (
          <View key={i} style={s.perkRow}>
            <AppText color={Colors.premium} style={s.checkmark}>✓</AppText>
            <AppText variant="body" color={Colors.textSecondary}>{p}</AppText>
          </View>
        ))}

        {/* Price */}
        <View style={s.priceRow}>
          <AppText variant="displayMedium" color={Colors.premium}>₹999</AppText>
          <AppText variant="bodySmall" color={Colors.textMuted}>/year · auto-renews</AppText>
        </View>

        <AppButton
          label="Start Premium — ₹999/year"
          onPress={onSubscribe ?? (() => {})}
          variant="premium"
          size="lg"
          fullWidth
          style={s.cta}
        />

        <AppText variant="caption" color={Colors.textMuted} align="center" style={s.legalNote}>
          Cancel anytime. Billed annually.{'\n'}
          {Platform.OS === 'ios'
            ? 'Payment through Apple In-App Purchase.'
            : 'Payment through Google Play Billing or Razorpay.'}
        </AppText>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: Colors.bgApp },
  band: {
    paddingTop:    60,
    paddingBottom: 40,
    paddingHorizontal: Spacing['2xl'],
    alignItems:    'center',
    gap:           10,
  },
  emoji:      { fontSize: 52, marginBottom: 4 },
  bandSub:    { lineHeight: 22, marginTop: 4 },
  card: {
    flex:             1,
    backgroundColor:  Colors.bgCard,
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding:          Spacing.xl,
    gap:              Spacing.sm,
    ...Shadows.lg,
  },
  perksTitle: { marginBottom: 4 },
  perkRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  checkmark:  { fontSize: 16, fontFamily: FontFamily.bold, width: 20 },
  priceRow: {
    flexDirection:  'row',
    alignItems:     'baseline',
    gap:            8,
    marginTop:      Spacing.base,
    marginBottom:   4,
  },
  cta:        { marginTop: 4 },
  legalNote:  { marginTop: Spacing.sm, lineHeight: 18 },
});
