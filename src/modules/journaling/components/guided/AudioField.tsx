// AudioField — record short voice notes (expo-av), list them with play + delete,
// and an "Add Audio" mic button. Waveform bars are decorative.
import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';

export interface AudioClip { id: string; uri: string; }
interface Props { clips: AudioClip[]; onChange: (c: AudioClip[]) => void; }

const BARS = [8, 16, 11, 20, 14, 9, 18, 12, 22, 10, 15, 8, 19, 13];

function Waveform({ color }: { color: string }) {
  return (
    <View style={s.wave}>
      {BARS.map((h, i) => <View key={i} style={[s.bar, { height: h, backgroundColor: color }]} />)}
    </View>
  );
}

export function AudioField({ clips, onChange }: Props) {
  const { colors } = useTheme();
  const recRef = useRef<Audio.Recording | null>(null);
  const [recording, setRecording] = useState(false);

  const toggleRecord = async () => {
    try {
      if (recording) {
        const rec = recRef.current;
        recRef.current = null;
        setRecording(false);
        if (!rec) return;
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        if (uri) onChange([...clips, { id: `${Date.now()}`, uri }]);
        return;
      }
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('Microphone needed', 'Allow microphone access to record audio.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recRef.current = rec;
      setRecording(true);
    } catch (e: any) {
      setRecording(false);
      Alert.alert('Recording failed', e?.message ?? 'Could not record audio.');
    }
  };

  const play = async (uri: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(st => { if ((st as any).didJustFinish) sound.unloadAsync().catch(() => {}); });
    } catch { /* ignore */ }
  };

  const remove = (id: string) => onChange(clips.filter(c => c.id !== id));

  return (
    <View style={s.row}>
      <View style={{ flex: 1, gap: Spacing.sm }}>
        {clips.map(c => (
          <View key={c.id} style={[s.clip, { borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => play(c.uri)} activeOpacity={0.7} style={[s.play, { backgroundColor: colors.textPrimary }]}>
              <Text style={{ color: colors.bgCard, fontSize: 12 }}>▶</Text>
            </TouchableOpacity>
            <Waveform color={colors.textLight} />
            <TouchableOpacity onPress={() => remove(c.id)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 16, color: colors.textMuted }}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <TouchableOpacity style={[s.mic, { borderColor: recording ? colors.error : colors.border }]} activeOpacity={0.8} onPress={toggleRecord}>
        <Text style={s.micEmoji}>🎙️</Text>
        <AppText variant="caption" color={recording ? colors.error : colors.textSecondary}>{recording ? 'Stop' : 'Add Audio'}</AppText>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, alignItems: 'flex-start' },
  clip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm },
  play: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, height: 24 },
  bar: { width: 3, borderRadius: 2 },
  mic: { width: 84, borderWidth: 1, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.base, gap: 4 },
  micEmoji: { fontSize: 20 },
});
