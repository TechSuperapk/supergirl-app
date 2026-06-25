import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { Colors } from '../theme/colors';

interface Props {
  fullscreen?: boolean;
  message?:   string;
  color?:     string;
  size?:      'small' | 'large';
}

export function AppLoadingSpinner({
  fullscreen = false,
  message,
  color = Colors.primary,
  size  = 'large',
}: Props) {
  return (
    <View style={[s.wrap, fullscreen && s.fullscreen]}>
      <ActivityIndicator color={color} size={size} />
      {!!message && (
        <AppText variant="bodySmall" color={Colors.textMuted} style={s.msg}>
          {message}
        </AppText>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:       { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  fullscreen: { flex: 1 },
  msg:        { marginTop: 4 },
});
