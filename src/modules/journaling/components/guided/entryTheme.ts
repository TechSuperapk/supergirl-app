// EntryThemeContext — lets the guided entry screen push its selected journal
// theme down to the section cards (and any other surface) without threading a
// prop through every one of the ~20 SectionCard call sites. When null (the
// 'default' theme), everything falls back to the normal app colours.
import React from 'react';

export interface EntryThemeValue {
  /** Card/surface fill (a soft tint of the theme). */
  card:   string;
  /** Card border. */
  border: string;
  /** Bold accent for titles/actions. */
  accent: string;
}

export const EntryThemeContext = React.createContext<EntryThemeValue | null>(null);
export const useEntryTheme = () => React.useContext(EntryThemeContext);
