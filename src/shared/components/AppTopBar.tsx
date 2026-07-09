// ─────────────────────────────────────────────────────────────────────────────
// AppTopBar — the persistent top bar shown on every feature's home screen:
//   SuperBae logo (left) · notification bell + menu icons (right).
// This bar stays identical across Journal, Fits, Trackers, Club, and Profile —
// only the bottom tab bar changes per feature. Pair with <JournalTopTabs/>
// underneath for the Me/Journal/Goals/Fits/Club module switcher.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing } from '../theme/spacing';
import SuperBaeLogo from '../../../assets/images/SuperBaeLogo';
import NotificationLogo from '../../../assets/NotificationLogo';

const MenuIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Line x1="4" y1="7" x2="20" y2="7" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="4" y1="17" x2="20" y2="17" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

interface Props {
  onBellPress?: () => void;
  onMenuPress?: () => void;
  showBellDot?: boolean;
}

export function AppTopBar({ onBellPress, onMenuPress, showBellDot = true }: Props) {
  const { colors } = useTheme();
  return (
    <View style={s.appBar}>
      <SuperBaeLogo />
      <View style={s.appBarActions}>
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={onBellPress}>
          {/* NotificationLogo already includes the unread dot baked into the
              asset (the small green circle), so showBellDot no longer adds
              a separate overlay — it's kept in the props for compatibility,
              but every current caller passes the default (true) anyway. */}
          <NotificationLogo width={22} height={22} />
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={onMenuPress}>
          <MenuIcon color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  appBarActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  iconBtn: { padding: 2 },
});
