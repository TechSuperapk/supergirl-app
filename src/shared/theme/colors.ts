// ─────────────────────────────────────────────
// SuperGirl — Design Token: Colors
// Primary brand: #2979FF  |  Background: #FDFAF7
// ─────────────────────────────────────────────

export const Colors = {
  // ── Brand ──────────────────────────────────
  primary:       '#2979FF',
  primaryLight:  '#E8F0FF',
  primaryDark:   '#1565C0',

  // ── Backgrounds ────────────────────────────
  bgApp:         '#F5F5F5',   // main app bg
  bgCard:        '#FFFFFF',
  bgSplash:      '#FDFAF7',
  bgInput:       '#F7F8FA',
  bgOverlay:     'rgba(0,0,0,0.45)',

  // ── Text ───────────────────────────────────
  textPrimary:   '#111111',
  textSecondary: '#555555',
  textMuted:     '#888888',
  textLight:     '#BBBBBB',
  textWhite:     '#FFFFFF',

  // ── Module accent colours ──────────────────
  club:          '#7B1FA2',   // purple
  journal:       '#2979FF',   // brand blue
  fits:          '#BF360C',   // deep orange
  trackers:      '#2E7D32',   // green
  boards:        '#0277BD',   // steel blue
  profile:       '#37474F',   // blue-grey

  // ── Semantic ───────────────────────────────
  success:       '#43A047',
  warning:       '#FFA726',
  error:         '#E53935',
  info:          '#039BE5',

  // ── UI ─────────────────────────────────────
  border:        '#EEEEEE',
  borderStrong:  '#CCCCCC',
  divider:       '#F0F0F0',
  shadow:        '#000000',
  white:         '#FFFFFF',
  black:         '#000000',
  transparent:   'transparent',

  // ── Subscription ───────────────────────────
  premium:       '#F9A825',   // gold
  premiumLight:  '#FFF8E1',
  premiumDark:   '#F57F17',
} as const;

export type ColorKey = keyof typeof Colors;
