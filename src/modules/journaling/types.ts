export type Mood = 'happy'|'sad'|'calm'|'anxious'|'angry'|'loved'|'neutral'|'excited'|'grateful';
export type JournalTheme = 'default'|'rose'|'mint'|'lavender'|'ocean'|'sunset'|'forest'|'night';
// Journal type/category chosen when the entry is created (drives banner stats).
export type JournalCategory = 'morning'|'night'|'dream'|'vent'|'quotes'|'ideas'|'affirm'|'other';

export interface StickerPlacement {
  id: string;
  emoji?: string;   // legacy emoji sticker (kept for back-compat)
  asset?: string;   // image sticker key from stickers.ts registry
  x: number;      // absolute X saved after drag
  y: number;      // absolute Y saved after drag
  scale: number;  // saved scale
  rotation: number; // saved rotation (degrees)
  zIndex?: number; // layer order — higher draws on top
}

// A photo/video placed freely on the canvas (dragged, resized, rotated) —
// same freeform model as stickers, so the WYSIWYG editor and the read-only
// view render every image at the exact same x/y/size/rotation/layer.
export interface ImagePlacement {
  id: string;
  uri: string;
  isVideo?: boolean;
  x: number;
  y: number;
  width: number;    // base (unscaled) box size
  height: number;
  scale: number;
  rotation: number; // degrees
  zIndex?: number;
}

// Shared base size so stickers render identically in editor + preview
export const STICKER_BASE = 42;
// Shared base size for freely-placed images before the person resizes them.
export const IMAGE_BASE_WIDTH = 160;

// A journal body is an ordered sequence of text/image/scribble blocks —
// inserting a photo, video, or scribble drops it in exactly where the
// cursor was, and whatever's typed next continues in a fresh text block
// right underneath it, like inserting an image in Word/Notion. This
// replaces free-floating x/y image placement: media now lives in the
// natural reading order of the text instead of anywhere on the canvas.
export interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'scribble';
  text?: string;      // for type 'text'
  uri?: string;       // for type 'image'
  isVideo?: boolean;  // for type 'image' — video vs photo
  pageId?: string;    // for type 'scribble' — id into the entry's scribblePages
}

export interface WeatherOption { value: string; label: string; emoji: string; }
export const WEATHER_OPTIONS: WeatherOption[] = [
  { value:'sunny',   label:'Sunny',   emoji:'☀️' },
  { value:'cloudy',  label:'Cloudy',  emoji:'☁️' },
  { value:'rainy',   label:'Rainy',   emoji:'🌧️' },
  { value:'stormy',  label:'Stormy',  emoji:'⛈️' },
  { value:'snowy',   label:'Snowy',   emoji:'❄️' },
  { value:'windy',   label:'Windy',   emoji:'🌬️' },
];

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
  category?: JournalCategory;
  /** Which flow created this entry — drives the Freestyle/Guided pill on
   *  the Recent Journal card. Older entries won't have this set, and simply
   *  show no pill. */
  mode?: 'freestyle' | 'guided';
  textColor: string;
  fontSize: number;
  /** Rich-text styling for the body — applied live in the editor and
   *  rendered identically (WYSIWYG) in Preview/View. */
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  createdAt: string;
  updatedAt: string;
  isDraft?: boolean;
  /** True if this entry was pinned via the Hashtags tool's "Pin to Calendar"
   *  switch — shows a star marker on its day in the Calendar tab. */
  isImportant?: boolean;
  /** Starred/favorited by the user — surfaced via a Favorites filter and the
   *  ⭐ toggle in the entry's ••• options menu. */
  isFavorite?: boolean;
  /** Records the exact order photos/videos/scribbles were added in, as
   *  tokens like `media:<uri>` / `scribble:<pageId>`. Used to render
   *  attachments interleaved in the order they were placed instead of as
   *  two separate, always-media-then-scribbles sections. Entries saved
   *  before this existed simply have no order info and fall back to the
   *  old fixed grouping. */
  attachmentOrder?: string[];
  /** DEPRECATED — photos placed freely by x/y/scale/rotation. Superseded by
   *  `contentBlocks` (inline-at-cursor images). Kept only so entries saved
   *  under the old freeform system still migrate/read correctly. */
  imagePlacements?: ImagePlacement[];
  /** The ordered text+image sequence — the single source of truth for the
   *  body once an entry has any inline images. Entries saved before this
   *  existed have no contentBlocks; they're migrated on read into a single
   *  text block (from `body`) followed by any legacy `imagePlacements`. */
  contentBlocks?: ContentBlock[];
  /** Optional weather + location chips shown next to the mood bubble. */
  weather?: string;
  location?: string;
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
  // Default is intentionally black & white / grayscale — a journal only
  // gets color once the person picks one from the Theme popup for that
  // specific entry, rather than every journal type auto-tinting itself.
  { id:'default',  label:'Default',  bg:'#F7F7F7', card:'#FFFFFF', accent:'#222222' },
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

export const DEFAULT_TAGS = ['Birthday','ImportantDay','Personal','Work','Travel','Gratitude','Family','Health','Dreams','Food'];

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
