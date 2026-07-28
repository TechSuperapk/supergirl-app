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
import { initCrashReporting } from './src/lib/crashReporting';
import * as Sentry from '@sentry/react-native';

// Crash & error monitoring (replaces Firebase Crashlytics). The DSN comes from
// the EXPO_PUBLIC_SENTRY_DSN env (set in eas.json). If it's absent, Sentry is
// simply disabled — nothing breaks.
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
});

SplashScreen.preventAutoHideAsync().catch(() => { });
initCrashReporting();

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

function App() {
  // Register the real STATIC weight files (not the variable font) so the weight
  // comes from the font face itself. A variable font registered under several
  // names + a numeric `fontWeight` renders differently on iOS vs Android
  // (iOS largely ignores fontWeight for custom fonts), which made headings
  // look heavier on Android than iOS. Static faces render identically on both.
  const [fontsLoaded] = useFonts({
    'DMSans-Regular':  require('./assets/fonts/static/DMSans-Regular.ttf'),
    'DMSans-Medium':   require('./assets/fonts/static/DMSans-Medium.ttf'),
    'DMSans-SemiBold': require('./assets/fonts/static/DMSans-SemiBold.ttf'),
    'DMSans-Bold':     require('./assets/fonts/static/DMSans-Bold.ttf'),
    'DMSans-Italic':   require('./assets/fonts/static/DMSans-Italic.ttf'),
    // Variable face under ONE family — used where a precise weight between the
    // static faces is needed (e.g. headings at 680). Because the weight comes
    // from the wght axis of a single registered family, iOS and Android select
    // the same instance, so it renders identically on both.
    'DMSansFlex':      require('./assets/fonts/DMSans-VariableFont_opsz,wght.ttf'),
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

// Sentry.wrap enables automatic crash + performance monitoring around the app.
export default Sentry.wrap(App);
