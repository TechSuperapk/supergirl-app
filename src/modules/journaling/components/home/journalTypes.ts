// ─────────────────────────────────────────────────────────────────────────────
// Journal Home — journal-type catalogue (single source of truth)
//
// Used by StreakHero chips and the JournalTypeCard grid so labels, colours and
// emoji stay in sync. `theme` maps to a JournalTheme understood by WriteEntry.
// ─────────────────────────────────────────────────────────────────────────────
import type { JournalTheme } from '../../types';

export interface JournalTypeDef {
  key:      string;
  label:    string;        // full label, e.g. "Morning Journal"
  short:    string;        // chip label, e.g. "Morning"
  emoji:    string;        // 3D-style emoji glyph
  subtitle?: string;       // one-line description shown in the "+" type picker
  theme:    JournalTheme;  // WriteEntry theme
  tint:     string;        // soft icon background
  dot:      string;        // accent dot used on hero chips
}

export const PRIMARY_TYPES: JournalTypeDef[] = [
  { key: 'morning', label: 'Morning Journal', short: 'Morning', emoji: '☀️', subtitle: "Let's start your day with intention", theme: 'sunset',   tint: '#FFF3E0', dot: '#FFB74D' },
  { key: 'night',   label: 'Night Journal',   short: 'Night',   emoji: '🌙', subtitle: "Let's Reflect and release.",         theme: 'lavender', tint: '#F0EBFB', dot: '#7E57C2' },
  { key: 'dream',   label: 'Dream Journal',   short: 'Dream',   emoji: '💭', subtitle: "Let's Reflect and release.",         theme: 'ocean',    tint: '#E6F1FB', dot: '#4FC3F7' },
  { key: 'vent',    label: 'Vent Journal',    short: 'Vent',    emoji: '🌋', subtitle: "Let's Reflect and release.",         theme: 'rose',     tint: '#FBEAEF', dot: '#FF7043' },
];

export const SECONDARY_TYPES: JournalTypeDef[] = [
  { key: 'quotes', label: 'Quotes',      short: 'Quotes',      emoji: '💬', theme: 'mint',   tint: '#E7F7F1', dot: '#26A69A' },
  { key: 'ideas',  label: 'Ideas',       short: 'Ideas',       emoji: '💡', theme: 'sunset', tint: '#FFF6E0', dot: '#FFCA28' },
  { key: 'affirm', label: 'Affirmation', short: 'Affirmation', emoji: '✨', theme: 'forest', tint: '#EEF7E6', dot: '#66BB6A' },
];

export const ALL_TYPES: JournalTypeDef[] = [...PRIMARY_TYPES, ...SECONDARY_TYPES];
