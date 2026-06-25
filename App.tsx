import React, { useCallback, useRef, useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/backup/queryClient';
import { hydrateStorage } from './src/backup/storage/mmkv';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { store } from './src/store';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { ErrorBoundary } from './src/shared/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => { });

function InnerApp() {
  const { isDark, colors } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.bgApp }}>
        <RootNavigator />
      </View>
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'DMSans-Regular': require('./assets/fonts/DMSans-VariableFont_opsz,wght.ttf'),
    'DMSans-Bold': require('./assets/fonts/DMSans-VariableFont_opsz,wght.ttf'),
    'DMSans-Medium': require('./assets/fonts/DMSans-VariableFont_opsz,wght.ttf'),
    'DMSans-Italic': require('./assets/fonts/DMSans-Italic-VariableFont_opsz,wght.ttf'),
  });

  // Load the offline cache before rendering so journals are available instantly.
  const [storageReady, setStorageReady] = useState(false);
  useEffect(() => { hydrateStorage().finally(() => setStorageReady(true)); }, []);

  const onLayout = useCallback(async () => {
    if (fontsLoaded && storageReady) await SplashScreen.hideAsync().catch(() => { });
  }, [fontsLoaded, storageReady]);

  if (!fontsLoaded || !storageReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <SafeAreaProvider>
              <NavigationContainer>
                <ErrorBoundary>
                  <View style={{ flex: 1 }} onLayout={onLayout}>
                    <InnerApp />
                  </View>
                </ErrorBoundary>
              </NavigationContainer>
            </SafeAreaProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
