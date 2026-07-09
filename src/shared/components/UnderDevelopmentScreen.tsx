// UnderDevelopmentScreen — shared placeholder for any feature that isn't
// built out yet. Development is focused on Journal first; every other tab/
// feature (Fits, Trackers, Boards, ...) mounts this instead of its real
// screens until it's ready, so the app never shows a half-built module.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import { Colors } from '../theme/colors';
import { Spacing, Radius } from '../theme/spacing';

export type UnderDevelopmentModule = 'fits' | 'trackers' | 'boards' | 'club';

const META: Record<UnderDevelopmentModule, { emoji: string; label: string; color: string }> = {
  fits:     { emoji: '👗', label: 'Fits',     color: Colors.fits },
  trackers: { emoji: '📊', label: 'Trackers', color: Colors.trackers },
  boards:   { emoji: '🎨', label: 'Boards',   color: Colors.boards },
  club:     { emoji: '💬', label: 'Club',     color: Colors.club },
};

interface Props {
  module: UnderDevelopmentModule;
}

export function UnderDevelopmentScreen({ module }: Props) {
  const meta = META[module];
  const navigation = useNavigation<any>();

  const goToJournal = () => {
    try { navigation.getParent('RootTabs')?.navigate('Journal'); }
    catch { try { navigation.navigate('Journal'); } catch {} }
  };

  return (
    <View style={s.screen}>
      <View style={[s.iconWrap, { backgroundColor: meta.color + '18' }]}>
        <AppText style={s.emoji}>{meta.emoji}</AppText>
      </View>
      <AppText variant="displayMedium" color={Colors.textPrimary} align="center" style={s.title}>
        {meta.label} is coming soon
      </AppText>
      <AppText variant="body" color={Colors.textMuted} align="center" style={s.body}>
        We're focused on making Journal great first. {meta.label} is under active
        development and will open up in a future update.
      </AppText>
      <AppButton
        label="Back to Journal"
        onPress={goToJournal}
        variant="primary"
        size="lg"
        style={s.cta}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emoji: { fontSize: 44 },
  title: { marginBottom: 2 },
  body: { lineHeight: 22, maxWidth: 300 },
  cta: { marginTop: Spacing.lg, minWidth: 200 },
});
