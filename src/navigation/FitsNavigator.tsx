import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator }     from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator }   from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

// Real screens
import { FitsHomeScreen }        from '../modules/fits/screens/FitsHomeScreen';
import { AISuggestionsScreen }   from '../modules/fits/screens/AISuggestionsScreen';
import { WeeklyPlannerScreen }   from '../modules/fits/screens/WeeklyPlannerScreen';
import { OutfitsListScreen,
         OutfitDetailScreen }    from '../modules/fits/screens/OutfitsScreen';
import { OutfitBuilderScreen }   from '../modules/fits/screens/OutfitBuilderScreen';
import { WardrobeHomeScreen }    from '../modules/fits/screens/WardrobeHomeScreen';
import { AddClothingScreen }     from '../modules/fits/screens/AddClothingScreen';
import { ClothingDetailScreen }  from '../modules/fits/screens/ClothingDetailScreen';

import { SubscriptionGate }      from '../shared/components/SubscriptionGate';
import { Colors }                from '../shared/theme/colors';
import { FontFamily, FontSize }  from '../shared/theme/typography';

// Screens that hide the module bottom tab bar
const HIDE_FOR = new Set(['OutfitBuilder', 'AddClothing', 'AISuggestions']);

function hideBar(route: any) {
  const name = getFocusedRouteNameFromRoute(route);
  return name && HIDE_FOR.has(name) ? { display: 'none' as const } : undefined;
}

// ── Stacks ────────────────────────────────────────────────────────────────────
const HomeStack    = createNativeStackNavigator();
const PlannerStack = createNativeStackNavigator();
const OutfitStack  = createNativeStackNavigator();
const WardStack    = createNativeStackNavigator();

function FitsHomeStack() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="FitsHome"      component={FitsHomeScreen} />
      <HomeStack.Screen name="AISuggestions" component={AISuggestionsScreen}
        options={{ animation: 'slide_from_bottom' }} />
    </HomeStack.Navigator>
  );
}

function FitsPlannerStack() {
  return (
    <PlannerStack.Navigator screenOptions={{ headerShown: false }}>
      <PlannerStack.Screen name="WeeklyPlanner" component={WeeklyPlannerScreen} />
    </PlannerStack.Navigator>
  );
}

function FitsOutfitsStack() {
  return (
    <OutfitStack.Navigator screenOptions={{ headerShown: false }}>
      <OutfitStack.Screen name="OutfitsList"   component={OutfitsListScreen} />
      <OutfitStack.Screen name="OutfitDetail"  component={OutfitDetailScreen} />
      <OutfitStack.Screen name="OutfitBuilder" component={OutfitBuilderScreen}
        options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
    </OutfitStack.Navigator>
  );
}

function FitsWardrobeStack() {
  return (
    <WardStack.Navigator screenOptions={{ headerShown: false }}>
      <WardStack.Screen name="WardrobeHome"    component={WardrobeHomeScreen} />
      <WardStack.Screen name="AddClothing"     component={AddClothingScreen}
        options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      <WardStack.Screen name="ClothingDetail"  component={ClothingDetailScreen} />
    </WardStack.Navigator>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
const TABS = [
  { name: 'FitsHomeTab',  emoji: '✨', label: 'Home'     },
  { name: 'PlannerTab',   emoji: '📅', label: 'Planner'  },
  { name: 'OutfitsTab',   emoji: '💃', label: 'Outfits'  },
  { name: 'WardrobeTab',  emoji: '👗', label: 'Wardrobe' },
];

const Tab = createBottomTabNavigator();

function FitsTabs() {
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
              <Text style={[s.label,
                { color: focused ? Colors.fits : Colors.textLight },
                focused && s.labelActive]}>
                {tab.label}
              </Text>
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="FitsHomeTab"  component={FitsHomeStack} />
      <Tab.Screen name="PlannerTab"   component={FitsPlannerStack} />
      <Tab.Screen name="OutfitsTab"   component={FitsOutfitsStack} />
      <Tab.Screen name="WardrobeTab"  component={FitsWardrobeStack} />
    </Tab.Navigator>
  );
}

export function FitsNavigator() {
  return (
    <SubscriptionGate module="fits">
      <FitsTabs />
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
