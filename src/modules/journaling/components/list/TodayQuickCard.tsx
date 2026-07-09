// TodayQuickCard — the call-to-action card at the top of the Journal list:
// today's date + weather/mood chips, a placeholder title/body preview, and a
// "Start writing" button. Tapping anywhere on it opens the type picker.
import React from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';

interface Props {
  date: string; // ISO yyyy-mm-dd
  onPress: () => void;
  // The active tab's animated type icon (from JOURNAL_TYPE_ICONS) — shown
  // next to Title when a specific journal type is selected; undefined on "All".
  icon?: any;
}

export function TodayQuickCard({ date, onPress, icon }: Props) {
  const { colors } = useTheme();
  const when = dayjs(date);

  return (
    <TouchableOpacity
      style={[s.card, Shadows.sm, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={s.dateRow}>
        <AppText variant="bodySmall" color={colors.textPrimary} numberOfLines={1} style={s.dateText}>
          {when.format('D MMM, YYYY')}{'  '}
          <AppText variant="caption" color={colors.textMuted}>{when.format('dddd')}</AppText>
        </AppText>
        <View style={s.chips}>
          <View style={[s.chip, { borderColor: colors.border }]}>
            <Text style={s.chipEmoji}>⛅</Text>
            <AppText variant="caption" color={colors.textMuted}>⌄</AppText>
          </View>
          <View style={[s.chip, { borderColor: colors.border }]}>
            <Text style={s.chipEmoji}>🙂</Text>
            <AppText variant="caption" color={colors.textMuted}>⌄</AppText>
          </View>
        </View>
      </View>
      <View style={[s.divider, { backgroundColor: colors.divider }]} />

      <View style={s.titleRow}>
        {!!icon && <Image source={icon} style={s.typeLogo} resizeMode="contain" />}
        <AppText variant="headingMedium" color={colors.textPrimary} style={s.title}>Title</AppText>
      </View>
      <AppText variant="bodySmall" color={colors.textMuted} style={s.body} numberOfLines={1}>Write Anything here……</AppText>

      <View style={[s.startBtn, { backgroundColor: colors.textPrimary }]}>
        <AppText variant="button" color={colors.bgCard}>Start writing</AppText>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  dateText: { flexShrink: 1 },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  chipEmoji: { fontSize: 13 },
  // Full-width line — breaks out of the card's own padding so it touches
  // both edges instead of stopping short at the content inset.
  divider: { height: StyleSheet.hairlineWidth, marginTop: Spacing.xs, marginHorizontal: -Spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm },
  typeLogo: { width: 28, height: 28 },
  title: {},
  body: { marginTop: 2 },
  startBtn: { marginTop: Spacing.sm, borderRadius: Radius.full, paddingVertical: Spacing.sm, alignItems: 'center' },
});
