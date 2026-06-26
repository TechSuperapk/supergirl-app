import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import SplashLogo from '../components/SplashLogo';

interface Props { onDone: () => void; }

export function SplashScreen({ onDone }: Props) {
  const fade  = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={s.wrap}>
      <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
        <SplashLogo width={200} height={191} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
