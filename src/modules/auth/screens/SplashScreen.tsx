import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import SplashLogo from '../components/SplashLogo';

const FB = 'DMSans-Bold';

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
      <Animated.View style={{ opacity: fade, transform: [{ scale }], alignItems: 'center' }}>
        <SplashLogo width={150} height={143} />
        <Text style={[s.title, { fontFamily: FB }]}>Super Bae</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, color: '#2979FF', letterSpacing: 0.5, marginTop: 18 },
});
