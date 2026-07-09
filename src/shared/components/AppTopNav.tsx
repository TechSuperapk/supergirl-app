// ─────────────────────────────────────────────────────────────────────────────
// AppTopNav — the single, persistent top navigation block shown on every
// feature's home screen: <AppTopBar/> (logo + bell + menu) plus the
// Me · Journal · Goals · Fits · Club module-switcher row underneath.
//
// This is the one component every home screen should render — it owns the
// cross-module navigation logic internally, so screens just pass which tab
// is currently active:
//
//   <AppTopNav active="fits" />
//
// Only the bottom tab bar differs per feature; this top block stays identical
// everywhere. Bell/menu default to opening Profile — pass onBellPress /
// onMenuPress to override (e.g. Profile itself routes the bell to Notifications).
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { AppTopBar } from './AppTopBar';
import { JournalTopTabs, TopTabKey } from '../../modules/journaling/components/home';

// Root-tab screen name for each module-switcher key. 'club' is intentionally
// left out — Club isn't mounted under the root tab navigator yet.
const ROOT_TARGETS: Partial<Record<TopTabKey, string>> = {
  me:      'Profile',
  journal: 'Journal',
  goals:   'Trackers',
  fits:    'Fits',
};

interface Props {
  /** Which module tab is currently active/highlighted. */
  active: TopTabKey;
  onBellPress?: () => void;
  onMenuPress?: () => void;
}

export function AppTopNav({ active, onBellPress, onMenuPress }: Props) {
  const navigation = useNavigation<any>();

  const goToRoot = (screen: string) => {
    try { navigation.getParent('RootTabs')?.navigate(screen); } catch { /* no-op */ }
  };

  const onSelect = (key: TopTabKey) => {
    if (key === active) return;
    const target = ROOT_TARGETS[key];
    if (!target) return; // e.g. Club — not wired into the root navigator yet
    goToRoot(target);
  };

  const defaultPress = () => goToRoot('Profile');

  return (
    <>
      <AppTopBar
        onBellPress={onBellPress ?? defaultPress}
        onMenuPress={onMenuPress ?? defaultPress}
      />
      <JournalTopTabs active={active} onSelect={onSelect} />
    </>
  );
}
