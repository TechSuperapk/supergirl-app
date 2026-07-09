import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { JournalTabNavigator } from './JournalTabNavigator';
import { WriteEntryScreen }  from '../modules/journaling/screens/WriteEntryScreen';
import { GuidedEntryScreen } from '../modules/journaling/screens/GuidedEntryScreen';
import { NoteEditorScreen }  from '../modules/journaling/screens/NoteEditorScreen';
import { EntryDetailScreen } from '../modules/journaling/screens/EntryDetailScreen';
import { StatsScreen }       from '../modules/journaling/screens/StatsScreen';
import { ScribbleScreen }    from '../modules/journaling/screens/ScribbleScreen';
import { ProfileNavigator }  from './ProfileNavigator';
import type { ScribblePath } from '../modules/journaling/types';

export type JournalStackParamList = {
  Journal:     undefined;
  WriteEntry:  { entryId?: string; private?: boolean; title?: string; theme?: string; category?: string; skipMood?: boolean };
  GuidedEntry: { category?: string; title?: string; theme?: string; entryId?: string };
  NoteEditor:  { noteId?: string; tag?: string };
  EntryDetail: { entryId: string };
  Calendar:    undefined;
  Stats:       undefined;
  // Note mode: pass only `onDone` (no entryId/pageId) — same screen, same
  // canvas/toolbar/behavior, but the result is handed back via callback
  // instead of being saved to a journal entry's scribblePages.
  Scribble:    { entryId: string; pageId: string } | { onDone: (paths: ScribblePath[]) => void };
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
      <Stack.Screen name="GuidedEntry" component={GuidedEntryScreen}
        options={{ headerShown:false, animation:'slide_from_bottom', gestureEnabled:true, contentStyle:{backgroundColor:'#FFFFFF'} }}/>
      <Stack.Screen name="NoteEditor"  component={NoteEditorScreen}
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
