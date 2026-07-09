// VoiceWidgets — Telegram-style voice-note playback (VoiceWidget) and the
// in-progress recording indicator (RecordingWidget). Originally defined only
// inside WriteEntryScreen.tsx; extracted here so Journal and Notes share the
// literal same widget instead of two copies that could drift apart.
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';

// ── Telegram-style Voice Widget ───────────────────────────────────────────────
export function VoiceWidget({ uri, accent, onDelete }: { uri: string; accent: string; onDelete: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0); // 0-1
  const soundRef = useRef<Audio.Sound | null>(null);
  const play = async () => {
    try {
      if (soundRef.current) { await soundRef.current.unloadAsync(); soundRef.current = null; }
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound; setPlaying(true);
      sound.setOnPlaybackStatusUpdate(st => {
        if (!st.isLoaded) return;
        if (st.durationMillis) setPos(st.positionMillis / st.durationMillis);
        if (st.didJustFinish) { setPlaying(false); setPos(0); }
      });
      await sound.playAsync();
    } catch (e) {}
  };
  const stop = async () => { if (soundRef.current) { await soundRef.current.stopAsync(); setPlaying(false); } };
  // Fake waveform bars
  const bars = Array.from({ length: 28 }, (_, i) => Math.sin(i * 0.7) * 0.4 + Math.random() * 0.4 + 0.2);
  const filled = Math.round(pos * bars.length);
  return (
    <View style={vw.wrap}>
      <TouchableOpacity onPress={playing ? stop : play} style={[vw.playBtn, { backgroundColor: accent }]}>
        <Text style={vw.playIco}>{playing ? '⏹' : '▶'}</Text>
      </TouchableOpacity>
      <View style={vw.wave}>
        {bars.map((h, i) => (
          <View key={i} style={[vw.bar, { height: Math.max(4, h * 28), backgroundColor: i < filled ? accent : '#DDD' }]} />
        ))}
      </View>
      <TouchableOpacity onPress={onDelete} style={vw.delBtn}><Text style={vw.delT}>×</Text></TouchableOpacity>
    </View>
  );
}

// ── Recording Widget ──────────────────────────────────────────────────────────
export function RecordingWidget({ accent, onStop }: { accent: string; onStop: (uri: string) => void }) {
  const [secs, setSecs] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    timer.current = setInterval(() => setSecs(s => s + 1), 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const bars = Array.from({ length: 28 }, (_, i) => 0.2 + Math.abs(Math.sin(Date.now() / 200 + i)) * 0.6);
  return (
    <View style={vw.wrap}>
      <View style={[vw.playBtn, { backgroundColor: '#EF5350' }]}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF' }} />
      </View>
      <View style={vw.wave}>
        {bars.map((h, i) => (
          <View key={i} style={[vw.bar, { height: Math.max(4, h * 28), backgroundColor: accent }]} />
        ))}
      </View>
      <Text style={[vw.timer, { fontFamily: 'DMSans-Regular' }]}>{mm}:{ss}</Text>
    </View>
  );
}

const vw = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginVertical: 8, padding: 12, backgroundColor: '#F0F4FF', borderRadius: 20 },
  playBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  playIco: { fontSize: 14, color: '#FFF' },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 32 },
  bar: { width: 3, borderRadius: 2 },
  timer: { fontSize: 12, color: '#555', minWidth: 36, textAlign: 'right' },
  delBtn: { paddingHorizontal: 8 }, delT: { fontSize: 18, color: '#888' },
});
