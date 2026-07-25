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
import { ClubNavigator }     from './ClubNavigator';
import { UnderDevelopmentScreen } from '../shared/components/UnderDevelopmentScreen';

import { Colors }     from '../shared/theme/colors';
import { FontFamily, FontSize } from '../shared/theme/typography';
import { MainTabParamList }  from './types';
// Same icon set as the top module switcher (JournalTopTabs).
import HomeIcon     from '../../assets/images/HomeIcon';
import JournalLogos from '../../assets/images/JournalLogos';
import TrackersLogo from '../../assets/images/TrackersLogo';
import OutfitsLogo  from '../../assets/images/OutfitsLogo';
import ClubLogo     from '../../assets/images/ClubLogo';

// Screens that should hide the main tab bar (full-screen editors, write screens etc.)
const HIDE_FOR_ROUTES = new Set([
  'WriteEntry', 'GuidedEntry', 'NoteEditor', 'EntryDetail', 'Scribble', 'Entries',
  'OutfitBuilder', 'BoardEditor', 'AvatarBuilder',
  'GroupChat',
]);

function shouldHideTabBar(route: any): boolean {
  const name = getFocusedRouteNameFromRoute(route);
  return name ? HIDE_FOR_ROUTES.has(name) : false;
}

// ── Tab icons (emoji-based, replace with SVG icons per module as they're built) ──
// Design bottom nav: Me · Journal · Goals · Fits · Club — same icons as the
// top module switcher. (Me = Profile, Goals = Trackers — route names kept.)
type TabIcon = React.FC<{ width?: number; height?: number }>;
const TAB_ICONS: Record<keyof MainTabParamList, { Icon: TabIcon; label: string; color: string }> = {
  Profile:  { Icon: HomeIcon,     label: 'Me',      color: Colors.profile  },
  Journal:  { Icon: JournalLogos, label: 'Journal', color: Colors.journal  },
  Trackers: { Icon: TrackersLogo, label: 'Goals',   color: Colors.trackers },
  Fits:     { Icon: OutfitsLogo,  label: 'Fits',    color: Colors.fits     },
  Club:     { Icon: ClubLogo,     label: 'Club',    color: Colors.club     },
};

// ── Custom tab bar ────────────────────────────────────────────────────────────
function SuperGirlTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // Real per-device safe-area inset instead of a Platform.OS guess — correct
  // on iPhones with/without a home indicator and Android gesture/3-button nav.
  // Called unconditionally (before the early-return below) to satisfy the
  // Rules of Hooks.
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  // Club keeps its own custom bottom bar (Home/Baehive/Groups/Hangouts), so the
  // root bar hides while in Club to avoid stacking two bars. Journal now uses
  // THIS root bar (its old internal tab bar was removed).
  const rootRouteName = state.routes[state.index]?.name;
  if (rootRouteName === 'Club') return null;

  // Hide the WHOLE bar (not just one button) when the focused screen opted out
  // via tabBarStyle:{display:'none'} — e.g. Journal's list/editor/preview
  // screens (Entries, WriteEntry, GuidedEntry, NoteEditor, EntryDetail).
  const focusedKey = state.routes[state.index]?.key;
  const focusedTabStyle = focusedKey ? (descriptors[focusedKey].options as any).tabBarStyle : undefined;
  if (focusedTabStyle?.display === 'none') return null;

  return (
    <View style={[tb.container, { height: TAB_CONTENT_H + bottomPad, paddingBottom: bottomPad }]}>
      {state.routes.map((route, index) => {
        const { options }   = descriptors[route.key];
        const isFocused     = state.index === index;
        const meta          = TAB_ICONS[route.name as keyof MainTabParamList];

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
            {/* Active indicator — a short black line at the top of the tab. */}
            <View style={[tb.topLine, { backgroundColor: isFocused ? '#141414' : 'transparent' }]} />
            <meta.Icon width={44} height={44} />
            <Text
              style={[
                tb.label,
                { color: isFocused ? '#141414' : Colors.textLight },
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
      initialRouteName="Journal"
      tabBar={(props) => <SuperGirlTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* Order matches the design: Me · Journal · Goals · Fits · Club */}
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={({ route }) => ({
          tabBarStyle: shouldHideTabBar(route) ? { display: 'none' } : undefined,
        })}
      />
      <Tab.Screen
        name="Journal"
        component={JournalNavigator}
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
        name="Fits"
        component={FitsPlaceholder}
        options={({ route }) => ({
          tabBarStyle: shouldHideTabBar(route) ? { display: 'none' } : undefined,
        })}
      />
      <Tab.Screen
        name="Club"
        component={ClubNavigator}
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
const TAB_CONTENT_H = 74;

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
  topLine: {
    position: 'absolute',
    top:      -8,
    width:    28,
    height:   3,
    borderRadius: 2,
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
