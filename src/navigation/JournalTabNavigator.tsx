import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_CONTENT_H } from './tabBarMetrics';

import { HomeScreen }        from '../modules/journaling/screens/HomeScreen';
import { JournalListScreen } from '../modules/journaling/screens/JournalListScreen';
import { QuickNotesScreen }  from '../modules/journaling/screens/QuickNotesScreen';
import { CalendarScreen }    from '../modules/journaling/screens/CalendarScreen';
import { AllTypesSheet }     from '../modules/journaling/components/AllTypesSheet';
import { JournalTypeDef }    from '../modules/journaling/components/home';
import type { JournalStackParamList } from './JournalNavigator';
import HomeBottomLogo      from '../modules/journaling/components/HomeBottomLogo';
import HomeBottomInactive  from '../modules/journaling/components/HomeBottomInactive';
import JournalBottomLogo   from '../modules/journaling/components/JournalBottomLogo';
import JournalBottomActive from '../modules/journaling/components/JournalBottomActive';
import NotesBottomLogo     from '../modules/journaling/components/NotesBottomLogo';
import NotesBottomActive   from '../modules/journaling/components/NotesBottomActive';
import CalenderBottomLogo   from '../modules/journaling/components/CalenderBottomLogo';
import CalenderbottomActive from '../modules/journaling/components/CalenderbottomActive';
import FabIcon from '../../assets/images/FabIcon';

export type JournalTabParamList = {
  Home:     undefined;
  Entries:  undefined;
  Notes:    undefined;
  Calendar: undefined;
};

// Icons are always shown in their own normal (near-black) colour — no blue
// active-highlight tint on the icon itself. Only the label + top indicator
// bar mark which tab is active.
const ACCENT = '#000000';
const GREY   = '#9AA0A6';
const F  = 'DMSans-Regular';
const FB = 'DMSans-Bold';
const GUIDED = new Set(['morning', 'night', 'dream', 'vent']);

const TABS = [
  { name: 'Home',     label: 'Home',     IconActive: HomeBottomLogo,      IconInactive: HomeBottomInactive },
  { name: 'Entries',  label: 'Journal',  IconActive: JournalBottomActive, IconInactive: JournalBottomLogo },
  { name: 'Notes',    label: 'Notes',    IconActive: NotesBottomActive,   IconInactive: NotesBottomLogo },
  { name: 'Calendar', label: 'Calendar', IconActive: CalenderbottomActive, IconInactive: CalenderBottomLogo },
] as const;

function JournalTabBar({ state, navigation, onAdd }: BottomTabBarProps & { onAdd: () => void }) {
  // Respect each device's real safe-area inset instead of guessing a fixed
  // padding — this is what actually differs between an iPhone with a home
  // indicator (~34pt), an iPhone/Android with a physical/3-button nav (0pt),
  // and an Android device with a gesture bar (varies by OEM/skin).
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);
  const barHeight = TAB_CONTENT_H + bottomPad;

  // Bubble-button press feel: scales down + a soft dark overlay fades in on
  // press, then springs back with a little overshoot on release.
  const press = useRef(new Animated.Value(0)).current;
  const fabScale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] });
  const fabOverlayOpacity = press.interpolate({ inputRange: [0, 1], outputRange: [0, 0.28] });
  const onFabPressIn = () => {
    Animated.timing(press, { toValue: 1, duration: 90, useNativeDriver: true }).start();
  };
  const onFabPressOut = () => {
    Animated.spring(press, { toValue: 0, useNativeDriver: true, friction: 3.5, tension: 140 }).start();
  };

  const renderTab = (t: typeof TABS[number]) => {
    const index   = TABS.findIndex(x => x.name === t.name);
    const focused = state.index === index;
    const labelColor = focused ? ACCENT : GREY;
    const Icon = focused ? t.IconActive : t.IconInactive;
    return (
      <TouchableOpacity
        key={t.name}
        style={tb.tab}
        activeOpacity={0.75}
        onPress={() => {
          const ev = navigation.emit({ type: 'tabPress', target: state.routes[index].key, canPreventDefault: true });
          if (!focused && !ev.defaultPrevented) navigation.navigate(t.name as never);
        }}
      >
        {focused && <View style={tb.indicator} />}
        <Icon width={24} height={24} />
        <Text style={[tb.label, { color: labelColor, fontFamily: focused ? FB : F }]}>{t.label}</Text>
      </TouchableOpacity>
    );
  };

  const left  = TABS.slice(0, 2);
  const right = TABS.slice(2);

  return (
    <View style={[tb.container, { height: barHeight, paddingBottom: bottomPad }]}>
      {left.map(renderTab)}
      <View style={tb.fabSlot}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={onFabPressIn}
          onPressOut={onFabPressOut}
          onPress={onAdd}
        >
          {/* Content view is separate from the shadow wrapper: overflow:'hidden'
              (needed to clip the SVG shine/inner-shadow to the circle) would
              otherwise also clip the outer drop shadow on iOS. Scaling the
              shadow wrapper (not just the content) makes the shadow shrink
              along with the bubble as it's pressed in, for a real 3D feel. */}
          <Animated.View style={[tb.fabShadowWrap, { transform: [{ scale: fabScale }] }]}>
          <View style={tb.fab}>
            {/* FabIcon already bakes in the dark circle, the "+" glyph, and a
                glossy shine highlight, so it replaces the whole hand-drawn
                circle+shine+plus SVG stack above. The press-dim overlay is
                layered on top of it (not before) so pressing still visibly
                darkens the icon instead of being hidden underneath it. */}
            <FabIcon width={56} height={56} style={StyleSheet.absoluteFill} />
            <Animated.View
              pointerEvents="none"
              style={[tb.fabPressOverlay, { opacity: fabOverlayOpacity }]}
            />
          </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
      {right.map(renderTab)}
    </View>
  );
}

const Tab = createBottomTabNavigator<JournalTabParamList>();

export function JournalTabNavigator() {
  const nav = useNavigation<NativeStackNavigationProp<JournalStackParamList>>();
  const [pickerOpen, setPickerOpen] = useState(false);

  // "+" → pick a type. Journals land straight on the guided-style screen's
  // own Freestyle tab (no more up-front manual/guided chooser); notes open
  // the note editor.
  const onPick = (t: JournalTypeDef) => {
    setPickerOpen(false);
    if (GUIDED.has(t.key)) nav.navigate('GuidedEntry', { title: t.label, theme: t.theme, category: t.key });
    else nav.navigate('NoteEditor', { tag: t.key });
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <JournalTabBar {...props} onAdd={() => setPickerOpen(true)} />}
      >
        <Tab.Screen name="Home"     component={HomeScreen} />
        <Tab.Screen name="Entries"  component={JournalListScreen} />
        <Tab.Screen name="Notes"    component={QuickNotesScreen} />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
      </Tab.Navigator>

      <AllTypesSheet visible={pickerOpen} onSelect={onPick} onClose={() => setPickerOpen(false)} />
    </View>
  );
}

const tb = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#EFEFEF',
    paddingTop: 8,
    alignItems: 'flex-start',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 3, paddingTop: 8, position: 'relative' },
  indicator: { position: 'absolute', top: 0, width: 22, height: 3, borderRadius: 2, backgroundColor: ACCENT },
  label: { fontSize: 11 },
  fabSlot: { width: 72, alignItems: 'center' },
  // Shadow-casting wrapper — kept separate from the clipped content view
  // below, since overflow:'hidden' on the same view would suppress iOS's
  // shadow rendering entirely.
  fabShadowWrap: {
    width: 56, height: 56, borderRadius: 28, marginTop: -20,
    backgroundColor: '#141414',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 10, elevation: 10,
  },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  // Dark tint that fades in on press — reads as the bubble sinking in.
  fabPressOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' },
});
