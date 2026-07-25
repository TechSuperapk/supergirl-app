// VoiceTextArea — a multiline text field with a mic button that does live
// speech-to-text via expo-speech-recognition. Tap the mic to start dictating;
// recognised words stream into the field (sentence-cased) as you speak. Tap
// again (■) to finish.
//
// The native module is loaded LAZILY inside a try/catch: expo-speech-recognition
// resolves a native module at import time, which throws
// "Cannot find native module 'ExpoSpeechRecognition'" — and would red-screen the
// whole app — on any binary that wasn't rebuilt with the module (Expo Go, or a
// stale dev client). Guarding it means the app always boots; voice-to-text just
// stays disabled (with a clear message) until you rebuild:
//   npx expo install expo-speech-recognition
//   npx expo run:ios   (or run:android / an EAS dev build)
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';
import { sentenceCase } from '../../utils/textCase';
import type { AudioClip } from './AudioField';

// Lazy, guarded load — never evaluates the throwing native lookup at import time.
function loadSpeechModule(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-speech-recognition');
    return mod?.ExpoSpeechRecognitionModule ?? null;
  } catch {
    return null;
  }
}
const SpeechModule = loadSpeechModule();

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  // Kept for API compatibility with existing callers; the mic transcribes
  // speech now instead of recording an audio clip.
  clips?: AudioClip[];
  onChangeClips?: (c: AudioClip[]) => void;
  minHeight?: number;
}

export function VoiceTextArea({ value, onChange, placeholder, minHeight = 120 }: Props) {
  const { colors } = useTheme();
  const [listening, setListening] = useState(false);
  const baseRef     = useRef('');    // text already in the field when dictation began
  const onChangeRef = useRef(onChange);  onChangeRef.current = onChange;
  const valueRef    = useRef(value);     valueRef.current    = value;

  const available = !!SpeechModule;

  // Subscribe to recognition events (only if the native module is present).
  useEffect(() => {
    if (!SpeechModule) return;
    const subs = [
      SpeechModule.addListener('start', () => setListening(true)),
      SpeechModule.addListener('end',   () => setListening(false)),
      SpeechModule.addListener('result', (e: any) => {
        const transcript = e?.results?.[0]?.transcript ?? '';
        if (!transcript) return;
        const base = baseRef.current;
        onChangeRef.current(sentenceCase(base ? `${base} ${transcript}` : transcript));
      }),
      SpeechModule.addListener('error', (e: any) => {
        setListening(false);
        if (e?.error && e.error !== 'no-speech') {
          Alert.alert('Voice-to-text', e?.message ?? 'Speech recognition failed.');
        }
      }),
    ];
    return () => subs.forEach((sub: any) => sub?.remove?.());
  }, []);

  const toggleListen = async () => {
    if (!SpeechModule) {
      Alert.alert(
        'Voice-to-text needs a rebuild',
        'Speech recognition isn’t in this build yet. Run "npx expo run:ios" (or run:android) to enable it.',
      );
      return;
    }
    try {
      if (listening) { SpeechModule.stop(); return; }
      const perm = await SpeechModule.requestPermissionsAsync();
      if (!perm?.granted) {
        Alert.alert('Permission needed', 'Allow microphone and speech recognition to use voice-to-text.');
        return;
      }
      baseRef.current = valueRef.current.trim();
      SpeechModule.start({ lang: 'en-US', interimResults: true, continuous: true, addsPunctuation: true });
    } catch (err: any) {
      setListening(false);
      Alert.alert('Voice-to-text', err?.message ?? 'Could not start speech recognition.');
    }
  };

  return (
    <View style={[s.wrap, { borderColor: colors.border, minHeight: minHeight + 24 }]}>
      <TextInput
        style={[s.input, { color: colors.textPrimary, fontFamily: 'DMSans-Regular', minHeight }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={(t) => onChange(sentenceCase(t))}
        autoCapitalize="sentences"
        multiline
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={[s.mic, { backgroundColor: listening ? colors.error : colors.bgInput, opacity: available ? 1 : 0.5 }]}
        activeOpacity={0.75}
        onPress={toggleListen}
      >
        <Text style={[s.micIcon, listening && { color: '#FFFFFF' }]}>{listening ? '■' : '🎙️'}</Text>
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
