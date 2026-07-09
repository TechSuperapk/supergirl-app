// GuidedHeader — back arrow + date pill on top; below it, an icon + the
// journal name (tappable — opens the type-switcher popup) with its subtitle.
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';
import CalendarLogo from '../../../../../assets/images/CalenderTopLogo';
import { ALL_TYPES, JOURNAL_TYPE_ICONS } from '../home';

interface Props {
  title:      string;
  subtitle:   string;
  dateLabel:  string;
  /** Journal type key (e.g. 'morning', 'quotes') — resolves to the same
   *  animated GIF icon used in the type-picker grid, falling back to that
   *  type's plain emoji if it has no GIF yet. */
  typeKey?:   string;
  onBack:     () => void;
  onPressDate?:  () => void;
  /** Tapping the journal name + chevron — opens the type-switcher popup. */
  onPressTitle?: () => void;
  /** Extra content docked at the end of the title row (e.g. a Save button
   *  for the Freestyle tab) — rendered outside the tappable title so it
   *  doesn't also trigger the type-switcher popup. */
  rightSlot?: React.ReactNode;
}

export function GuidedHeader({ title, subtitle, dateLabel, typeKey, onBack, onPressDate, onPressTitle, rightSlot }: Props) {
  const { colors } = useTheme();
  const iconSource = typeKey ? JOURNAL_TYPE_ICONS[typeKey] : undefined;
  const iconEmoji  = typeKey ? ALL_TYPES.find(t => t.key === typeKey)?.emoji : undefined;
  return (
    <View style={s.wrap}>
      <View style={s.topRow}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[s.back, { color: colors.textPrimary }]}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.datePill, { borderColor: colors.border, backgroundColor: colors.bgCard }]} activeOpacity={0.8} onPress={onPressDate}>
          <CalendarLogo width={18} height={20} />
          <AppText variant="bodySmall" color={colors.textPrimary} numberOfLines={1}>{dateLabel}</AppText>
          <AppText variant="bodySmall" color={colors.textMuted}> ⌄</AppText>
        </TouchableOpacity>
      </View>

      <View style={s.titleWrapRow}>
        <TouchableOpacity
          style={s.titleRow}
          activeOpacity={onPressTitle ? 0.7 : 1}
          onPress={onPressTitle}
          disabled={!onPressTitle}
          hitSlop={{ top: 6, bottom: 6 }}
        >
          {iconSource ? (
            <Image source={iconSource} style={s.iconGif} contentFit="contain" autoplay />
          ) : (
            !!iconEmoji && <Text style={s.icon}>{iconEmoji}</Text>
          )}
          <AppText variant="headingLarge" color={colors.textPrimary} numberOfLines={1} style={s.title}>{title}</AppText>
          {!!onPressTitle && <AppText variant="headingLarge" color={colors.textMuted}> ⌄</AppText>}
        </TouchableOpacity>
        {!!rightSlot && <View style={s.rightSlot}>{rightSlot}</View>}
      </View>
      <AppText variant="bodySmall" color={colors.textMuted} style={s.subtitle} numberOfLines={2}>{subtitle}</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: Spacing.base },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { fontSize: 32, marginTop: -4 },
  // minWidth:0 + flexShrink lets the pill's label truncate instead of pushing
  // off-screen on narrow phones.
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, flexShrink: 1, minWidth: 0, maxWidth: '70%' },
  titleWrapRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 },
  icon: { fontSize: 24 },
  iconGif: { width: 28, height: 28 },
  title: { flexShrink: 1 },
  rightSlot: { marginLeft: Spacing.sm, flexShrink: 0 },
  subtitle: { marginTop: 2 },
});
