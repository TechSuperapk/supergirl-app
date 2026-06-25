import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';

interface Props {
  title:          string;
  subtitle?:      string;
  leftIcon?:      React.ReactNode;
  rightIcon?:     React.ReactNode;
  onLeftPress?:   () => void;
  onRightPress?:  () => void;
  accentColor?:   string;
  transparent?:   boolean;
}

export function AppHeader({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  accentColor = Colors.primary,
  transparent = false,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top + 8 },
        transparent ? s.transparent : s.solid,
      ]}
    >
      <View style={s.content}>
        {/* Left slot */}
        <TouchableOpacity
          style={s.side}
          onPress={onLeftPress}
          disabled={!onLeftPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {leftIcon}
        </TouchableOpacity>

        {/* Centre */}
        <View style={s.centre}>
          <AppText
            variant="headingSmall"
            color={Colors.textPrimary}
            align="center"
            numberOfLines={1}
          >
            {title}
          </AppText>
          {!!subtitle && (
            <AppText
              variant="caption"
              color={Colors.textMuted}
              align="center"
            >
              {subtitle}
            </AppText>
          )}
        </View>

        {/* Right slot */}
        <TouchableOpacity
          style={[s.side, s.right]}
          onPress={onRightPress}
          disabled={!onRightPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {rightIcon}
        </TouchableOpacity>
      </View>

      {/* Accent underline */}
      <View style={[s.accent, { backgroundColor: accentColor }]} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingBottom: 0,
  },
  solid: {
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  transparent: {
    backgroundColor: Colors.transparent,
  },
  content: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: 10,
  },
  side:   { width: 40, alignItems: 'flex-start' },
  right:  { alignItems: 'flex-end' },
  centre: { flex: 1, alignItems: 'center', gap: 2 },
  accent: { height: 2.5, marginHorizontal: Spacing.base, borderRadius: 2, opacity: 0.6 },
});
