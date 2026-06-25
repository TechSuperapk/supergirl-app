import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

// Real screens
import { ClubFeedScreen }    from '../modules/club/screens/ClubFeedScreen';
import { PostDetailScreen }  from '../modules/club/screens/PostDetailScreen';
import { CreatePostScreen }  from '../modules/club/screens/CreatePostScreen';
import { EventsListScreen, EventDetailScreen } from '../modules/club/screens/EventsScreen';
import { MyTicketsScreen, TicketDetailScreen } from '../modules/club/screens/TicketsScreen';
import { GroupsListScreen, GroupDetailScreen } from '../modules/club/screens/GroupsScreen';
import { GroupChatScreen }   from '../modules/club/screens/GroupChatScreen';

import { Colors }            from '../shared/theme/colors';
import { FontFamily, FontSize } from '../shared/theme/typography';

// Screens that hide this module's bottom tab bar
const HIDE_FOR = new Set(['CreatePost', 'GroupChat']);

function hideBar(route: any) {
  const name = getFocusedRouteNameFromRoute(route);
  return name && HIDE_FOR.has(name) ? { display: 'none' as const } : undefined;
}

// ── Stacks ────────────────────────────────────────────────────────────────────
const FeedStack    = createNativeStackNavigator();
const EventsStack  = createNativeStackNavigator();
const GroupsStack  = createNativeStackNavigator();
const TicketsStack = createNativeStackNavigator();

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

function ClubEventsStack() {
  return (
    <EventsStack.Navigator screenOptions={{ headerShown: false }}>
      <EventsStack.Screen name="EventsList"  component={EventsListScreen} />
      <EventsStack.Screen name="EventDetail" component={EventDetailScreen} />
    </EventsStack.Navigator>
  );
}

function ClubGroupsStack() {
  return (
    <GroupsStack.Navigator screenOptions={{ headerShown: false }}>
      <GroupsStack.Screen name="GroupsList"  component={GroupsListScreen} />
      <GroupsStack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <GroupsStack.Screen name="GroupChat"   component={GroupChatScreen}
        options={{ animation: 'slide_from_right', gestureEnabled: true }} />
    </GroupsStack.Navigator>
  );
}

function ClubTicketsStack() {
  return (
    <TicketsStack.Navigator screenOptions={{ headerShown: false }}>
      <TicketsStack.Screen name="MyTickets"    component={MyTicketsScreen} />
      <TicketsStack.Screen name="TicketDetail" component={TicketDetailScreen} />
    </TicketsStack.Navigator>
  );
}

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { name: 'Feed',    emoji: '🏠', label: 'Home'    },
  { name: 'Events',  emoji: '🎟️', label: 'Events'  },
  { name: 'Groups',  emoji: '👥', label: 'Groups'  },
  { name: 'Tickets', emoji: '🎫', label: 'Tickets' },
];

const Tab = createBottomTabNavigator();

export function ClubNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown:     false,
        tabBarShowLabel: false,
        tabBarStyle:     hideBar(route) ?? s.tabBar,
        tabBarIcon: ({ focused }) => {
          const tab = TABS.find(t => t.name === route.name)!;
          return (
            <View style={s.iconWrap}>
              <Text style={[s.emoji, focused && s.emojiActive]}>{tab.emoji}</Text>
              <Text style={[s.label, { color: focused ? Colors.club : Colors.textLight },
                focused && s.labelActive]}>
                {tab.label}
              </Text>
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Feed"    component={ClubFeedStack} />
      <Tab.Screen name="Events"  component={ClubEventsStack} />
      <Tab.Screen name="Groups"  component={ClubGroupsStack} />
      <Tab.Screen name="Tickets" component={ClubTicketsStack} />
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopColor:  Colors.divider,
    borderTopWidth:  0.5,
    height:          Platform.OS === 'ios' ? 82 : 66,
    paddingBottom:   Platform.OS === 'ios' ? 22 : 8,
    paddingTop:      8,
  },
  iconWrap:    { alignItems: 'center', gap: 2 },
  emoji:       { fontSize: 22 },
  emojiActive: { transform: [{ scale: 1.1 }] },
  label: {
    fontFamily: FontFamily.regular,
    fontSize:   FontSize.xs,
    marginTop:  1,
  },
  labelActive: { fontFamily: FontFamily.bold },
});
