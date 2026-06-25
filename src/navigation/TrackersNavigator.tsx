import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator }     from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator }   from '@react-navigation/native-stack';

// Real screens
import { TrackersHomeScreen }    from '../modules/trackers/screens/TrackersHomeScreen';
import { MoodTrackerScreen }     from '../modules/trackers/screens/MoodTrackerScreen';
import {
  SleepTrackerScreen,
  HabitTrackerScreen,
  PeriodTrackerScreen,
} from '../modules/trackers/screens/TrackerScreensABC';
import {
  HealthTrackerScreen,
  ExpenseTrackerScreen,
  InsightsDashboardScreen,
  MilestonesScreen,
  ProgressScreen,
} from '../modules/trackers/screens/TrackerScreensDEF';

import { SubscriptionGate }      from '../shared/components/SubscriptionGate';
import { Colors }                from '../shared/theme/colors';
import { FontFamily, FontSize }  from '../shared/theme/typography';

// AI Insights screen (stub — Phase 7)
const AIInsightsScreen = InsightsDashboardScreen as React.ComponentType<any>;

// ── Stacks ────────────────────────────────────────────────────────────────────
const HomeStack       = createNativeStackNavigator();
const InsightsStack   = createNativeStackNavigator();
const ProgressStack   = createNativeStackNavigator();
const MilestonesStack = createNativeStackNavigator();

function TrackersHomeStack() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="TrackersHome"   component={TrackersHomeScreen} />
      <HomeStack.Screen name="MoodTracker"    component={MoodTrackerScreen} />
      <HomeStack.Screen name="SleepTracker"   component={SleepTrackerScreen} />
      <HomeStack.Screen name="HabitTracker"   component={HabitTrackerScreen} />
      <HomeStack.Screen name="PeriodTracker"  component={PeriodTrackerScreen} />
      <HomeStack.Screen name="HealthTracker"  component={HealthTrackerScreen} />
      <HomeStack.Screen name="ExpenseTracker" component={ExpenseTrackerScreen} />
    </HomeStack.Navigator>
  );
}

function TrackersInsightsStack() {
  return (
    <InsightsStack.Navigator screenOptions={{ headerShown: false }}>
      <InsightsStack.Screen name="InsightsDashboard" component={InsightsDashboardScreen} />
      <InsightsStack.Screen name="AIInsights"        component={AIInsightsScreen} />
    </InsightsStack.Navigator>
  );
}

function TrackersProgressStack() {
  return (
    <ProgressStack.Navigator screenOptions={{ headerShown: false }}>
      <ProgressStack.Screen name="Progress" component={ProgressScreen} />
    </ProgressStack.Navigator>
  );
}

function TrackersMilestonesStack() {
  return (
    <MilestonesStack.Navigator screenOptions={{ headerShown: false }}>
      <MilestonesStack.Screen name="Milestones" component={MilestonesScreen} />
    </MilestonesStack.Navigator>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
const TABS = [
  { name: 'TrackersHomeTab',  emoji: '🏠', label: 'Home'       },
  { name: 'InsightsTab',      emoji: '💡', label: 'Insights'   },
  { name: 'ProgressTab',      emoji: '📈', label: 'Progress'   },
  { name: 'MilestonesTab',    emoji: '🏆', label: 'Milestones' },
];

const Tab = createBottomTabNavigator();

function TrackersTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown:     false,
        tabBarShowLabel: false,
        tabBarStyle:     s.tabBar,
        tabBarIcon: ({ focused }) => {
          const tab = TABS.find(t => t.name === route.name)!;
          return (
            <View style={s.iconWrap}>
              <Text style={[s.emoji, focused && s.emojiActive]}>{tab.emoji}</Text>
              <Text style={[s.label,
                { color: focused ? Colors.trackers : Colors.textLight },
                focused && s.labelActive]}>
                {tab.label}
              </Text>
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="TrackersHomeTab" component={TrackersHomeStack} />
      <Tab.Screen name="InsightsTab"     component={TrackersInsightsStack} />
      <Tab.Screen name="ProgressTab"     component={TrackersProgressStack} />
      <Tab.Screen name="MilestonesTab"   component={TrackersMilestonesStack} />
    </Tab.Navigator>
  );
}

export function TrackersNavigator() {
  return (
    <SubscriptionGate module="trackers">
      <TrackersTabs />
    </SubscriptionGate>
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
