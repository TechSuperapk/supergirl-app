// ─────────────────────────────────────────────────────────────────────────────
// Real 3D icon GIFs, keyed by journal type `key`. Single source of truth used
// everywhere a journal type's icon is shown: the "+" type picker
// (AllTypesSheet), the home-screen grid (JournalTypeCard), and the streak
// banner. Falls back to the plain emoji (JournalTypeDef.emoji) wherever a key
// has no entry here yet.
// ─────────────────────────────────────────────────────────────────────────────
export const JOURNAL_TYPE_ICONS: Partial<Record<string, any>> = {
  morning: require('../../assets/Sun light.gif'),
  night:   require('../../assets/Moon Light.gif'),
  quotes:  require('../../assets/Message 2.gif'),
  vent:    require('../../assets/Volcano.gif'),
  dream:   require('../../assets/Feather 2.gif'),
  ideas:   require('../../assets/15.gif'),
  affirm:  require('../../assets/Notebook (2).gif'),
};
