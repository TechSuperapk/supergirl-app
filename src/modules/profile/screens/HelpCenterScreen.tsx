import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity,
  StyleSheet, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';

import { AppHeader }   from '../../../shared/components/AppHeader';
import { AppText }     from '../../../shared/components/AppText';
import { SettingsRow } from '../components/SettingsRow';
import { Colors }      from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { FontFamily }  from '../../../shared/theme/typography';
import { ProfileStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'HelpCenter'>;

interface FAQ { q: string; a: string }

const FAQS: FAQ[] = [
  {
    q: 'What is included in Premium?',
    a: 'Premium unlocks Journal, Fits (AI wardrobe), all 6 Trackers, and Boards. Club access is free for everyone.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'On Android, go to Google Play → Subscriptions. On iOS, go to Settings → Apple ID → Subscriptions. Cancellation takes effect at the end of the billing period.',
  },
  {
    q: 'Is my journal data private?',
    a: 'Yes. Your journal entries are synced end-to-end via Firestore with your personal account. Private vault entries are additionally PIN-protected with biometric lock on your device.',
  },
  {
    q: 'Can I use the app offline?',
    a: 'Journal and Trackers store data locally on your device and sync to the cloud when you reconnect. The Club feed requires an internet connection.',
  },
  {
    q: 'How does the AI outfit stylist work?',
    a: 'The AI reads the items in your wardrobe (category, colour, tags) and suggests outfit combinations using only your own clothes — it never recommends purchases.',
  },
  {
    q: 'How do I restore my subscription on a new device?',
    a: 'Go to Profile → Subscription and tap "Restore Purchases". Your subscription is linked to your account, so logging in automatically restores access.',
  },
  {
    q: 'How do I export my journal?',
    a: 'From the Journal home screen, tap the Stats tab to see your entries summary. Export as PDF is available from the entry detail screen.',
  },
];

function FAQItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  const toggle = () => {
    setOpen(!open);
    height.value  = withTiming(open ? 0 : 1, { duration: 240 });
    opacity.value = withTiming(open ? 0 : 1, { duration: 200 });
  };

  const animStyle = useAnimatedStyle(() => ({
    maxHeight: height.value * 300,
    opacity:   opacity.value,
  }));

  return (
    <View style={faq_s.item}>
      <TouchableOpacity style={faq_s.question} onPress={toggle} activeOpacity={0.75}>
        <AppText variant="bodySmall" color={Colors.textPrimary} style={{ flex: 1 }}>
          {faq.q}
        </AppText>
        <AppText variant="headingSmall" color={Colors.textMuted}>
          {open ? '−' : '+'}
        </AppText>
      </TouchableOpacity>
      <Animated.View style={[faq_s.answer, animStyle]}>
        <AppText variant="bodySmall" color={Colors.textSecondary} style={{ lineHeight: 20 }}>
          {faq.a}
        </AppText>
      </Animated.View>
    </View>
  );
}

const faq_s = StyleSheet.create({
  item:     { borderBottomWidth: 0.5, borderBottomColor: Colors.divider },
  question: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  answer: {
    overflow:        'hidden',
    paddingHorizontal: Spacing.base,
    paddingBottom:   Spacing.md,
  },
});

export function HelpCenterScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader
        title="Help Center"
        leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()}
        accentColor={Colors.profile}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Contact options */}
        <View style={s.section}>
          <AppText variant="label" color={Colors.textMuted} style={s.sectionTitle}>
            CONTACT US
          </AppText>
          <View style={s.card}>
            <SettingsRow
              type="press"
              icon="✉️"
              label="Email support"
              subtitle="support@supergirl.app"
              onPress={() => Linking.openURL('mailto:support@supergirl.app')}
            />
            <SettingsRow
              type="press"
              icon="🌐"
              label="Visit help docs"
              subtitle="supergirl.app/help"
              onPress={() => Linking.openURL('https://supergirl.app/help')}
            />
            <SettingsRow
              type="press"
              icon="📋"
              label="Privacy Policy"
              onPress={() => Linking.openURL('https://supergirl.app/privacy')}
            />
            <SettingsRow
              type="press"
              icon="📜"
              label="Terms of Service"
              onPress={() => Linking.openURL('https://supergirl.app/terms')}
            />
          </View>
        </View>

        {/* FAQ */}
        <View style={s.section}>
          <AppText variant="label" color={Colors.textMuted} style={s.sectionTitle}>
            FREQUENTLY ASKED
          </AppText>
          <View style={s.card}>
            {FAQS.map((faq, i) => <FAQItem key={i} faq={faq} />)}
          </View>
        </View>

        <AppText variant="caption" color={Colors.textMuted} align="center" style={s.version}>
          SuperGirl v1.0.0{'\n'}Made with ❤️
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: Colors.bgApp },
  scroll:       { padding: Spacing.base, gap: Spacing.sm },
  section:      { gap: 6 },
  sectionTitle: { paddingHorizontal: 4 },
  card:         { backgroundColor: Colors.bgCard, borderRadius: 12, overflow: 'hidden' },
  version:      { marginTop: Spacing.lg, lineHeight: 20 },
});
