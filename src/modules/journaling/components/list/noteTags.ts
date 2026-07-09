// Note tag catalogue for Quick Notes (drives tabs, tag chips, and the picker).
// `bg`/`color` give each tag its own pastel pill look (matches the Figma
// reference) instead of a plain neutral outline.
export interface NoteTagDef { key: string; label: string; emoji: string; bg: string; color: string; }

export const NOTE_TAGS: NoteTagDef[] = [
  { key: 'quotes',    label: 'Quotes',      emoji: '💬', bg: '#F0EBFB', color: '#7E57C2' },
  { key: 'ideas',     label: 'Ideas',       emoji: '💡', bg: '#FFF6E0', color: '#F9A825' },
  { key: 'affirm',    label: 'Affirmation', emoji: '📔', bg: '#EEF7E6', color: '#66BB6A' },
  { key: 'thoughts',  label: 'Thoughts',    emoji: '💬', bg: '#E6F1FB', color: '#2196F3' },
  { key: 'reminders', label: 'Reminders',   emoji: '💡', bg: '#FDEBDD', color: '#FF7043' },
];

export const NOTE_TABS: { key: string; label: string; emoji?: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'quotes', label: 'Quotes',      emoji: '💬' },
  { key: 'ideas',  label: 'Ideas',       emoji: '💡' },
  { key: 'affirm', label: 'Affirmation', emoji: '📔' },
];

export const tagDef = (key?: string): NoteTagDef | undefined =>
  NOTE_TAGS.find(t => t.key === key);
