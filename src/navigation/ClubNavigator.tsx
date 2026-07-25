import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Real screens
import { ClubFeedScreen }    from '../modules/club/screens/ClubFeedScreen';
import { PostDetailScreen }  from '../modules/club/screens/PostDetailScreen';
import { CreatePostScreen }  from '../modules/club/screens/CreatePostScreen';
import { EventsListScreen, EventDetailScreen, SavedEventsScreen } from '../modules/club/screens/EventsScreen';
import { MyTicketsScreen, TicketDetailScreen } from '../modules/club/screens/TicketsScreen';
import { ReviewBookingScreen, BookingCompletedScreen } from '../modules/club/screens/BookingScreens';
import { RazorpayCheckoutScreen } from '../modules/club/screens/RazorpayCheckoutScreen';
import { GroupsListScreen, GroupDetailScreen } from '../modules/club/screens/GroupsScreen';
import { CommunityDetailScreen } from '../modules/club/screens/CommunityScreen';
import { GroupChatScreen }   from '../modules/club/screens/GroupChatScreen';
import { BAEHIVE_COMMUNITY_ID } from '../modules/club/services/clubFirestoreService';
import HeartIcon    from '../modules/club/components/HeartIcon';
import GroupIcon    from '../modules/club/components/GroupIcon';
import HangoutsIcon from '../modules/club/components/HangoutsIcon';
import HomeBottomLogo     from '../modules/journaling/components/HomeBottomLogo';
import HomeBottomInactive from '../modules/journaling/components/HomeBottomInactive';

import { Colors }            from '../shared/theme/colors';
import { FontFamily, FontSize } from '../shared/theme/typography';

// Screens that hide this module's bottom tab bar
const HIDE_FOR = new Set(['CreatePost', 'GroupChat', 'ReviewBooking', 'RazorpayCheckout', 'BookingCompleted']);


// ── Stacks ────────────────────────────────────────────────────────────────────
const FeedStack    = createNativeStackNavigator();
const BaehiveStack = createNativeStackNavigator();
const EventsStack  = createNativeStackNavigator();
const GroupsStack  = createNativeStackNavigator();

function ClubFeedStack() {
  return (
    <FeedStack.Navigator screenOptions={{ headerShown: false }}>
      <FeedStack.Screen name="ClubFeed"    component={ClubFeedScreen} />
      <FeedStack.Screen name="PostDetail"  component={PostDetailScreen} />
      <FeedStack.Screen name="CreatePost"  component={CreatePostScreen}
        options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
    </FeedStack.Navigator>
  );
}

// Baehive tab — opens the default Baehive community's own feed.
function ClubBaehiveStack() {
  return (
    <BaehiveStack.Navigator screenOptions={{ headerShown: false }}>
      <BaehiveStack.Screen
        name="BaehiveHome"
        component={CommunityDetailScreen}
        initialParams={{ communityId: BAEHIVE_COMMUNITY_ID, name: 'Baehive' }}
      />
      <BaehiveStack.Screen name="PostDetail"  component={PostDetailScreen} />
      <BaehiveStack.Screen name="CreatePost"  component={CreatePostScreen}
        options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
    </BaehiveStack.Navigator>
  );
}

// Hangouts tab — events + booking. Tickets now live inside this stack (no
// separate Tickets tab), reached from the events "My Tickets" action.
function ClubEventsStack() {
  return (
    <EventsStack.Navigator screenOptions={{ headerShown: false }}>
      <EventsStack.Screen name="EventsList"      component={EventsListScreen} />
      <EventsStack.Screen name="SavedEvents"     component={SavedEventsScreen} />
      <EventsStack.Screen name="EventDetail"     component={EventDetailScreen} />
      <EventsStack.Screen name="ReviewBooking"   component={ReviewBookingScreen} />
      <EventsStack.Screen name="RazorpayCheckout" component={RazorpayCheckoutScreen}
        options={{ animation: 'slide_from_bottom' }} />
      <EventsStack.Screen name="BookingCompleted" component={BookingCompletedScreen}
        options={{ gestureEnabled: false }} />
      <EventsStack.Screen name="MyTickets"       component={MyTicketsScreen} />
      <EventsStack.Screen name="TicketDetail"    component={TicketDetailScreen} />
    </EventsStack.Navigator>
  );
}

function ClubGroupsStack() {
  return (
    <GroupsStack.Navigator screenOptions={{ headerShown: false }}>
      <GroupsStack.Screen name="GroupsList"       component={GroupsListScreen} />
      <GroupsStack.Screen name="GroupDetail"      component={GroupDetailScreen} />
      <GroupsStack.Screen name="CommunityDetail"  component={CommunityDetailScreen} />
      {/* Registered here too (also lives in ClubFeedStack) so a post opened
          from a community's own feed can push PostDetail within this same
          tab instead of needing a cross-stack/cross-tab jump. */}
      <GroupsStack.Screen name="PostDetail"       component={PostDetailScreen} />
      <GroupsStack.Screen name="GroupChat"        component={GroupChatScreen}
        options={{ animation: 'slide_from_right', gestureEnabled: true }} />
    </GroupsStack.Navigator>
  );
}

// ── Tab icons (line-style, matching the design; swap in real assets later) ──────
const PlusIcon = () => (
  <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" />
  </Svg>
);

// ── Tab config — order around the centre + button: Home, Baehive, [+], Groups, Hangouts
const TABS: { name: string; label: string; render: (active: boolean, color: string) => JSX.Element }[] = [
  { name: 'Feed',     label: 'Home',     render: a       => (a ? <HomeBottomLogo width={24} height={24} /> : <HomeBottomInactive width={24} height={24} />) },
  { name: 'Baehive',  label: 'Baehive',  render: (_, c)  => <HeartIcon    color={c} width={24} height={24} /> },
  { name: 'Groups',   label: 'Groups',   render: (_, c)  => <GroupIcon    color={c} width={24} height={24} /> },
  { name: 'Hangouts', label: 'Hangouts', render: (_, c)  => <HangoutsIcon color={c} width={24} height={24} /> },
];

// Custom bottom bar: 2 tabs · centre + FAB · 2 tabs, with an active indicator
// bar above the selected tab (as in the design).
function ClubTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index];
  const focused = getFocusedRouteNameFromRoute(activeRoute);
  if (focused && HIDE_FOR.has(focused)) return null;

  const bottomPad = Math.max(insets.bottom, 10);

  const renderTab = (t: (typeof TABS)[number]) => {
    const isActive = activeRoute.name === t.name;
    const color = isActive ? '#141414' : '#9AA0A6';
    return (
      <TouchableOpacity
        key={t.name}
        style={s.tab}
        activeOpacity={0.7}
        onPress={() => navigation.navigate(t.name)}
      >
        <View style={[s.indicator, { backgroundColor: isActive ? '#141414' : 'transparent' }]} />
        {t.render(isActive, color)}
        <Text style={[s.label, { color }, isActive && s.labelActive]}>{t.label}</Text>
      </TouchableOpacity>
    );
  };

  // The + opens Create Thread within the Home (Feed) stack.
  const onPlus = () => navigation.navigate('Feed', { screen: 'CreatePost' });

  return (
    <View style={[s.bar, { height: TAB_CONTENT_H + bottomPad, paddingBottom: bottomPad }]}>
      {renderTab(TABS[0])}
      {renderTab(TABS[1])}
      <View style={s.centerSlot}>
        <TouchableOpacity style={s.fab} activeOpacity={0.85} onPress={onPlus}>
          <PlusIcon />
        </TouchableOpacity>
      </View>
      {renderTab(TABS[2])}
      {renderTab(TABS[3])}
    </View>
  );
}

const Tab = createBottomTabNavigator();

export function ClubNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={props => <ClubTabBar {...props} />}
    >
      <Tab.Screen name="Feed"     component={ClubFeedStack} />
      <Tab.Screen name="Baehive"  component={ClubBaehiveStack} />
      <Tab.Screen name="Groups"   component={ClubGroupsStack} />
      <Tab.Screen name="Hangouts" component={ClubEventsStack} />
    </Tab.Navigator>
  );
}

const TAB_CONTENT_H = 62;
const FAB_SIZE = 64;

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderTopColor: Colors.divider, borderTopWidth: 0.5,
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  centerSlot: { width: 78, alignItems: 'center' },
  // Raised black + button straddling the top edge of the bar.
  fab: {
    position: 'absolute', top: -22,
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2,
    backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 10,
  },
  // Short indicator bar above the active tab's icon.
  indicator: { position: 'absolute', top: -10, width: 26, height: 2.5, borderRadius: 2 },
  label: { fontFamily: FontFamily.regular, fontSize: FontSize.sm },
  labelActive: { fontFamily: FontFamily.bold, color: '#141414' },
});
