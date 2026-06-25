/**
 * useTheme.ts
 *
 * Re-exports useTheme from ThemeContext for consistent import path.
 * Components import from shared/hooks/useTheme, not from contexts/.
 */
export { useTheme } from '../../contexts/ThemeContext';
export type { ThemeMode } from '../../contexts/ThemeContext';
