import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { JournalNavigator }  from './JournalNavigator';   // existing
import { ProfileNavigator }  from './ProfileNavigator';
import { UnderDevelopmentScreen } from '../shared/components/UnderDevelopmentScreen';

import { Colors }     from '../shared/theme/colors';
import { FontFamily, FontSize } from '../shared/theme/typography';
import { MainTabParamList }  from './types';

// Screens that should hide the main tab bar (full-screen editors, write screens etc.)
const HIDE_FOR_ROUTES = new Set([
  'WriteEntry', 'GuidedEntry', 'NoteEditor', 'EntryDetail', 'Scribble',
  'OutfitBuilder', 'BoardEditor', 'AvatarBuilder',
  'GroupChat',
]);

function shouldHideTabBar(route: any): boolean {
  const name = getFocusedRouteNameFromRoute(route);
  return name ? HIDE_FOR_ROUTES.has(name) : false;
}

// ── Tab icons (emoji-based, replace with SVG icons per module as they're built) ──
const TAB_ICONS: Record<keyof MainTabParamList, { emoji: string; label: string; color: string }> = {
  Journal:  { emoji: '📓', label: 'Journal',  color: Colors.journal  },
  Fits:     { emoji: '👗', label: 'Fits',     color: Colors.fits     },
  Trackers: { emoji: '📊', label: 'Trackers', color: Colors.trackers },
  Profile:  { emoji: '👤', label: 'Profile',  color: Colors.profile  },
};

// ── Custom tab bar ────────────────────────────────────────────────────────────
function SuperGirlTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // Real per-device safe-area inset instead of a Platform.OS guess — correct
  // on iPhones with/without a home indicator and Android gesture/3-button nav.
  // Called unconditionally (before the early-return below) to satisfy the
  // Rules of Hooks.
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  // Journal owns its own bottom bar (Home/Calendar/Search/Private); modules
  // switch from the top row, so hide the parent module bar while in Journal.
  if (state.routes[state.index]?.name === 'Journal') return null;

  return (
    <View style={[tb.container, { height: TAB_CONTENT_H + bottomPad, paddingBottom: bottomPad }]}>
      {state.routes.map((route, index) => {
        const { options }   = descriptors[route.key];
        const isFocused     = state.index === index;
        const meta          = TAB_ICONS[route.name as keyof MainTabParamList];
        const tabStyle      = (options as any).tabBarStyle;

        if (tabStyle?.display === 'none') return null;

        const onPress = () => {
          const event = navigation.emit({
            type:     'tabPress',
            target:   route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={tb.tab}
            activeOpacity={0.75}
          >
            {/* active indicator pill */}
            {isFocused && (
              <View style={[tb.pill, { backgroundColor: meta.color + '18' }]} />
            )}
            <Text style={[tb.emoji, isFocused && tb.emojiActive]}>{meta.emoji}</Text>
            <Text
              style={[
                tb.label,
                { color: isFocused ? meta.color : Colors.textLight },
                isFocused && tb.labelActive,
              ]}
            >
              {meta.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Navigator ─────────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<MainTabParamList>();

// Fits and Trackers aren't built out yet — development is focused on Journal
// first, so both tabs mount the shared placeholder instead of their real
// navigators. Swap these back to <FitsNavigator />/<TrackersNavigator />
// (re-add the imports above) once each module is ready to ship.
function FitsPlaceholder() { return <UnderDevelopmentScreen module="fits" />; }
function TrackersPlaceholder() { return <UnderDevelopmentScreen module="trackers" />; }

export function MainAppNavigator() {
  return (
    <Tab.Navigator
      id="RootTabs"
      tabBar={(props) => <SuperGirlTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Journal"
        component={JournalNavigator}
        options={({ route }) => ({
          tabBarStyle: shouldHideTabBar(route) ? { display: 'none' } : undefined,
        })}
      />
      <Tab.Screen
        name="Fits"
        component={FitsPlaceholder}
        options={({ route }) => ({
          tabBarStyle: shouldHideTabBar(route) ? { display: 'none' } : undefined,
        })}
      />
      <Tab.Screen
        name="Trackers"
        component={TrackersPlaceholder}
        options={({ route }) => ({
          tabBarStyle: shouldHideTabBar(route) ? { display: 'none' } : undefined,
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={({ route }) => ({
          tabBarStyle: shouldHideTabBar(route) ? { display: 'none' } : undefined,
        })}
      />
    </Tab.Navigator>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
// Fixed part of the bar (icon + label + top padding); the safe-area bottom
// inset is added per-device at render time above.
const TAB_CONTENT_H = 58;

const tb = StyleSheet.create({
  container: {
    flexDirection:   'row',
    backgroundColor: Colors.white,
    borderTopWidth:  0.5,
    borderTopColor:  Colors.divider,
    paddingTop:      8,
    paddingHorizontal: 4,
    // subtle shadow upward
    shadowColor:   Colors.shadow,
    shadowOffset:  { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius:  8,
    elevation:     12,
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            2,
    position:       'relative',
  },
  pill: {
    position:     'absolute',
    top:          -4,
    width:        44,
    height:       44,
    borderRadius: 22,
  },
  emoji:       { fontSize: 22 },
  emojiActive: { transform: [{ scale: 1.1 }] },
  label: {
    fontFamily: FontFamily.regular,
    fontSize:   FontSize.xs,
  },
  labelActive: {
    fontFamily: FontFamily.bold,
  },
});
