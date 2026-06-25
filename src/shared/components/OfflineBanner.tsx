import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useNetworkState }            from '../hooks/useNetworkState';
import { AppText }                    from './AppText';

export function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetworkState();
  const isOffline  = !isConnected || !isInternetReachable;
  const translateY = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue:         isOffline ? 0 : -50,
      duration:        280,
      useNativeDriver: true,
    }).start();
  }, [isOffline]);

  return (
    <Animated.View style={[s.banner, { transform: [{ translateY }] }]}>
      <AppText variant="caption" color="#FFFFFF" align="center">
        📡 No internet connection — some features may be unavailable
      </AppText>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  banner: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    zIndex:          9999,
    backgroundColor: '#333333',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
