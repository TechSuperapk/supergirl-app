import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ICONS: Record<string, string> = {
  Club: '👑', Fits: '👗', Track: '🎯', Board: '📋',
};

interface Props { route?: { params?: { module?: string } } }

export function ComingSoonScreen({ route }: Props) {
  const module = route?.params?.module ?? 'Feature';
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.inner}>
        <Text style={s.emoji}>{ICONS[module] ?? '🚀'}</Text>
        <Text style={[s.title, {fontFamily:'DMSans-Bold'}]}>{module}</Text>
        <View style={s.badge}><Text style={[s.badgeT, {fontFamily:'DMSans-Bold'}]}>Coming Soon</Text></View>
        <Text style={[s.sub, {fontFamily:'DMSans-Regular'}]}>
          We're working hard to bring you {module}. Stay tuned for updates!
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex:1, backgroundColor:'#F7F7F7' },
  inner:  { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:32, gap:16 },
  emoji:  { fontSize:72 },
  title:  { fontSize:28, color:'#111' },
  badge:  { backgroundColor:'#2979FF', borderRadius:20, paddingHorizontal:20, paddingVertical:8 },
  badgeT: { fontSize:14, color:'#FFF' },
  sub:    { fontSize:15, color:'#888', textAlign:'center', lineHeight:24 },
});
