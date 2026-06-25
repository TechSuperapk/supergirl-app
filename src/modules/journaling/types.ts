export type Mood = 'happy'|'sad'|'calm'|'anxious'|'angry'|'loved'|'neutral'|'excited'|'grateful';
export type JournalTheme = 'default'|'rose'|'mint'|'lavender'|'ocean'|'sunset'|'forest'|'night';

export interface StickerPlacement {
  id: string;
  emoji?: string;   // legacy emoji sticker (kept for back-compat)
  asset?: string;   // image sticker key from stickers.ts registry
  x: number;      // absolute X saved after drag
  y: number;      // absolute Y saved after drag
  scale: number;  // saved scale
  rotation: number; // saved rotation (degrees)
}

// Shared base size so stickers render identically in editor + preview
export const STICKER_BASE = 42;

export interface ScribblePath {
  d: string;       // SVG path data
  color: string;
  width: number;
}

export interface ScribblePage {
  id: string;
  paths: ScribblePath[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  body: string;          // raw body text (may contain #hashtag)
  detectedHashtags: string[]; // auto-detected from body
  mood: Mood;
  tags: string[];        // manually added chips
  mediaUrls: string[];
  voiceNoteUrl?: string;
  stickers: string[];
  stickerPlacements: StickerPlacement[];
  scribblePages: ScribblePage[];
  isPrivate: boolean;
  theme: JournalTheme;
  textColor: string;
  fontSize: number;
  createdAt: string;
  updatedAt: string;
  isDraft?: boolean;
}

export interface MoodOption { value:Mood; label:string; emoji:string; color:string; }

export const MOOD_OPTIONS: MoodOption[] = [
  { value:'happy',    label:'Happy',    emoji:'😊', color:'#FFA726' },
  { value:'sad',      label:'Sad',      emoji:'😢', color:'#90A4AE' },
  { value:'angry',    label:'Angry',    emoji:'😡', color:'#EF5350' },
  { value:'anxious',  label:'Anxious',  emoji:'😰', color:'#FFCA28' },
  { value:'loved',    label:'Loved',    emoji:'🥰', color:'#EC407A' },
  { value:'calm',     label:'Calm',     emoji:'😌', color:'#66BB6A' },
  { value:'neutral',  label:'Neutral',  emoji:'😐', color:'#78909C' },
  { value:'excited',  label:'Excited',  emoji:'🤩', color:'#FF7043' },
  { value:'grateful', label:'Grateful', emoji:'🙏', color:'#AB47BC' },
];

export const MOOD_BG = (mood: Mood): string =>
  ['happy','loved','calm','excited','grateful'].includes(mood) ? '#FFA726' : '#EF5350';

export const JOURNAL_THEMES = [
  { id:'default',  label:'Default',  bg:'#F7F7F7', card:'#FFFFFF', accent:'#2979FF' },
  { id:'rose',     label:'Rose',     bg:'#FFF0F3', card:'#FFF5F7', accent:'#E91E63' },
  { id:'mint',     label:'Mint',     bg:'#F0FFF4', card:'#F5FFFB', accent:'#00897B' },
  { id:'lavender', label:'Lavender', bg:'#F3F0FF', card:'#F8F5FF', accent:'#7B1FA2' },
  { id:'ocean',    label:'Ocean',    bg:'#E3F2FD', card:'#EBF5FF', accent:'#0277BD' },
  { id:'sunset',   label:'Sunset',   bg:'#FFF3E0', card:'#FFF8F0', accent:'#E65100' },
  { id:'forest',   label:'Forest',   bg:'#F1F8E9', card:'#F5FBF0', accent:'#2E7D32' },
  { id:'night',    label:'Night',    bg:'#1A1A2E', card:'#16213E', accent:'#E94560' },
] as const;

export const FONT_SIZES = [12,14,16,18,20,24];

export const TEXT_COLORS = [
  '#111111','#2979FF','#E91E63','#00897B',
  '#E65100','#7B1FA2','#FFFFFF','#888888',
];

export const SAMPLE_STICKERS = [
  '🌸','✨','🌿','☁️','🌙','⭐','🦋','🌺',
  '💫','🍀','🌈','❤️','💕','🎀','🌻','🍓',
  '🎵','🌊','🔥','💎','🏆','🎉','🍭','🦄',
  '🌷','🌼','🍁','❄️','☀️','🌟','💖','🎶',
];

export const DEFAULT_TAGS = ['Personal','Work','Travel','Gratitude','Family','Health','Dreams','Food'];

export const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What city were you born in?",
  "What was the name of your first school?",
  "What is your favourite book?",
  "What was the make of your first car?",
  "What is your childhood nickname?",
  "What street did you grow up on?",
];

// Detect hashtags from body text
export function detectHashtags(text: string): string[] {
  const matches = text.match(/#(\w+)/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
}
