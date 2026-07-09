/**
 * ThemeContext.tsx
 *
 * Provides light / dark / system theme across the whole app.
 * Theme preference is persisted to AsyncStorage.
 *
 * Usage:
 *   const { theme, colors, isDark, setTheme } = useTheme();
 */
import React, {
  createContext, useContext, useState, useEffect, useCallback,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage       from '@react-native-async-storage/async-storage';

// ── Color tokens ──────────────────────────────────────────────────────────────
export interface ThemeColors {
  // Backgrounds
  bgApp:     string;
  bgCard:    string;
  bgInput:   string;
  bgOverlay: string;

  // Text
  textPrimary:   string;
  textSecondary: string;
  textMuted:     string;
  textLight:     string;

  // Borders
  border:      string;
  borderStrong: string;
  divider:     string;

  // Brand (always same)
  primary:      string;
  primaryLight: string;
  primaryDark:  string;

  // Modules (always same)
  club:     string;
  journal:  string;
  fits:     string;
  trackers: string;
  boards:   string;
  profile:  string;

  // Semantic
  success: string;
  warning: string;
  error:   string;
  info:    string;

  // Subscription
  premium:      string;
  premiumLight: string;
  premiumDark:  string;

  // Misc
  white:       string;
  black:       string;
  shadow:      string;
  transparent: string;
}

const LIGHT_COLORS: ThemeColors = {
  bgApp:         '#FFFFFF',
  bgCard:        '#FFFFFF',
  bgInput:       '#F7F8FA',
  bgOverlay:     'rgba(0,0,0,0.45)',
  textPrimary:   '#111111',
  textSecondary: '#555555',
  textMuted:     '#888888',
  textLight:     '#BBBBBB',
  border:        '#EEEEEE',
  borderStrong:  '#CCCCCC',
  divider:       '#F0F0F0',
  primary:       '#2979FF',
  primaryLight:  '#E8F0FF',
  primaryDark:   '#1565C0',
  club:          '#7B1FA2',
  journal:       '#2979FF',
  fits:          '#BF360C',
  trackers:      '#2E7D32',
  boards:        '#0277BD',
  profile:       '#37474F',
  success:       '#43A047',
  warning:       '#FFA726',
  error:         '#E53935',
  info:          '#039BE5',
  premium:       '#F9A825',
  premiumLight:  '#FFF8E1',
  premiumDark:   '#F57F17',
  white:         '#FFFFFF',
  black:         '#000000',
  shadow:        '#000000',
  transparent:   'transparent',
};

const DARK_COLORS: ThemeColors = {
  bgApp:         '#0F0F0F',
  bgCard:        '#1C1C1E',
  bgInput:       '#2C2C2E',
  bgOverlay:     'rgba(0,0,0,0.65)',
  textPrimary:   '#F2F2F7',
  textSecondary: '#AEAEB2',
  textMuted:     '#636366',
  textLight:     '#48484A',
  border:        '#2C2C2E',
  borderStrong:  '#48484A',
  divider:       '#2C2C2E',
  primary:       '#4F95FF',
  primaryLight:  '#1C2A4A',
  primaryDark:   '#2979FF',
  club:          '#CE93D8',
  journal:       '#4F95FF',
  fits:          '#FF8A65',
  trackers:      '#81C784',
  boards:        '#4FC3F7',
  profile:       '#90A4AE',
  success:       '#66BB6A',
  warning:       '#FFA726',
  error:         '#EF5350',
  info:          '#29B6F6',
  premium:       '#FFD54F',
  premiumLight:  '#3E2F00',
  premiumDark:   '#FFC107',
  white:         '#FFFFFF',
  black:         '#000000',
  shadow:        '#000000',
  transparent:   'transparent',
};

// ── Context ───────────────────────────────────────────────────────────────────
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode:     ThemeMode;
  isDark:   boolean;
  colors:   ThemeColors;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode:     'system',
  isDark:   false,
  colors:   LIGHT_COLORS,
  setTheme: () => {},
});

const STORAGE_KEY = '@supergirl_theme';

// ── Provider ──────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  // Default to light so iOS and Android look identical regardless of the OS
  // dark-mode setting (the app design + several screens are light-only).
  const [mode, setModeState] = useState<ThemeMode>('light');

  // Load persisted preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(stored => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setModeState(stored);
        }
      })
      .catch(() => {});
  }, []);

  const setTheme = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode).catch(() => {});
  }, []);

  const isDark = mode === 'system'
    ? systemScheme === 'dark'
    : mode === 'dark';

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// ── Named exports ─────────────────────────────────────────────────────────────
export { LIGHT_COLORS, DARK_COLORS };
export type { ThemeMode };
