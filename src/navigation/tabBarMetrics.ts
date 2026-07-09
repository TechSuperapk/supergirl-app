// ─────────────────────────────────────────────────────────────────────────────
// Shared bottom-tab-bar metrics. Pulled into its own file (rather than living
// inside JournalTabNavigator.tsx) so screens can size their scroll content
// around the real tab bar height without creating a circular import back
// into the navigator file that renders those same screens.
// ─────────────────────────────────────────────────────────────────────────────

// Fixed part of the bar — icon + label + top padding — excluding the
// safe-area bottom inset, which differs per device and is added at render
// time via `useSafeAreaInsets().bottom` wherever the bar is drawn.
export const TAB_CONTENT_H = 58;
