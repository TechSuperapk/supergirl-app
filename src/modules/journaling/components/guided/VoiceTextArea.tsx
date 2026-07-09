// VoiceTextArea — a plain multiline text field with a small circular mic
// button docked in its bottom-right corner (tap to record a voice note),
// matching the "Type here or use voice to text…" fields in the guided
// journal reference design.
import React, { useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';
import type { AudioClip } from './AudioField';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  clips?: AudioClip[];
  onChangeClips?: (c: AudioClip[]) => void;
  minHeight?: number;
}

export function VoiceTextArea({ value, onChange, placeholder, clips, onChangeClips, minHeight = 120 }: Props) {
  const { colors } = useTheme();
  const recRef = useRef<Audio.Recording | null>(null);
  const [recording, setRecording] = useState(false);

  const toggleRecord = async () => {
    if (!onChangeClips) return;
    try {
      if (recording) {
        const rec = recRef.current;
        recRef.current = null;
        setRecording(false);
        if (!rec) return;
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        if (uri) onChangeClips([...(clips ?? []), { id: `${Date.now()}`, uri }]);
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

  return (
    <View style={[s.wrap, { borderColor: colors.border, minHeight: minHeight + 24 }]}>
      <TextInput
        style={[s.input, { color: colors.textPrimary, fontFamily: 'DMSans-Regular', minHeight }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChange}
        multiline
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={[s.mic, { backgroundColor: recording ? colors.error : colors.bgInput }]}
        activeOpacity={0.75}
        onPress={toggleRecord}
      >
        <Text style={s.micIcon}>🎙️</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, position: 'relative' },
  input: { fontSize: 15, lineHeight: 22, paddingRight: 40 },
  mic: { position: 'absolute', bottom: Spacing.sm, right: Spacing.sm, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  micIcon: { fontSize: 15 },
});
