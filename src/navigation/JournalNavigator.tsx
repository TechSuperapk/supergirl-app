import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { JournalTabNavigator } from './JournalTabNavigator';
import { WriteEntryScreen }  from '../modules/journaling/screens/WriteEntryScreen';
import { EntryDetailScreen } from '../modules/journaling/screens/EntryDetailScreen';
import { StatsScreen }       from '../modules/journaling/screens/StatsScreen';
import { ScribbleScreen }    from '../modules/journaling/screens/ScribbleScreen';
import { ProfileNavigator }  from './ProfileNavigator';

export type JournalStackParamList = {
  Journal:     undefined;
  WriteEntry:  { entryId?: string; private?: boolean };
  EntryDetail: { entryId: string };
  Calendar:    undefined;
  Stats:       undefined;
  Scribble:    { entryId: string; pageId: string };
  Profile:     undefined;
};

const Stack = createNativeStackNavigator<JournalStackParamList>();

export function JournalNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Journal"
      screenOptions={{ headerShown:false, contentStyle:{backgroundColor:'#F5F5F5'}, gestureEnabled:false }}
    >
      <Stack.Screen name="Journal"     component={JournalTabNavigator} options={{ headerShown:false }}/>
      <Stack.Screen name="WriteEntry"  component={WriteEntryScreen}
        options={{ headerShown:false, animation:'slide_from_bottom', gestureEnabled:true, contentStyle:{backgroundColor:'#FFFFFF'} }}/>
      <Stack.Screen name="EntryDetail" component={EntryDetailScreen}
        options={{ headerShown:false, animation:'slide_from_right', contentStyle:{backgroundColor:'#FFFFFF'} }}/>
      <Stack.Screen name="Stats"       component={StatsScreen} options={{ headerShown:false }}/>
      <Stack.Screen name="Profile"     component={ProfileNavigator} options={{ headerShown:false, animation:'slide_from_right' }}/>
      <Stack.Screen name="Scribble"    component={ScribbleScreen}
        options={{ headerShown:false, animation:'slide_from_right', contentStyle:{backgroundColor:'#FFFFFF'} }}/>
    </Stack.Navigator>
  );
}
