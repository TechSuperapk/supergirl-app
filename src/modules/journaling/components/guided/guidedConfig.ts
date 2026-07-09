// Chip catalogues + emotion→mood mapping for the guided entry screens.
export interface ChipDef { key: string; label: string; emoji: string; }

export const EMOTIONS: ChipDef[] = [
  { key: 'angry',    label: 'Angry',    emoji: '😠' },
  { key: 'happy',    label: 'Happy',    emoji: '😊' },
  { key: 'confused', label: 'Confused', emoji: '❓' },
  { key: 'sad',      label: 'Sad',      emoji: '😢' },
  { key: 'anxious',  label: 'Anxious',  emoji: '😰' },
  { key: 'excited',  label: 'Excited',  emoji: '🥳' },
  { key: 'scared',   label: 'Scared',   emoji: '😨' },
  { key: 'romantic', label: 'Romantic', emoji: '💖' },
  { key: 'peaceful', label: 'Peaceful', emoji: '🌿' },
];

export const SYMBOLS: ChipDef[] = [
  { key: 'snake',  label: 'Snake',  emoji: '🐍' },
  { key: 'water',  label: 'Water',  emoji: '💧' },
  { key: 'baby',   label: 'Baby',   emoji: '🍼' },
  { key: 'flying', label: 'Flying', emoji: '🛫' },
  { key: 'house',  label: 'House',  emoji: '🏠' },
  { key: 'moon',   label: 'Moon',   emoji: '🌙' },
  { key: 'door',   label: 'Door',   emoji: '🚪' },
  { key: 'fire',   label: 'Fire',   emoji: '🔥' },
  { key: 'tree',   label: 'Tree',   emoji: '🌳' },
];

export const PEOPLE: ChipDef[] = [
  { key: 'me',        label: 'Me',        emoji: '🙂' },
  { key: 'family',    label: 'Family',    emoji: '👨‍👩‍👧' },
  { key: 'friends',   label: 'Friends',   emoji: '🧑‍🤝‍🧑' },
  { key: 'sibling',   label: 'Sibling',   emoji: '🧒' },
  { key: 'partner',   label: 'Partner',   emoji: '💑' },
  { key: 'kumar',     label: 'Kumar',     emoji: '🧑' },
  { key: 'stranger',  label: 'Stranger',  emoji: '👤' },
  { key: 'celebrity', label: 'Celebrity', emoji: '⭐' },
];

// Dream variant uses a slightly different feeling set than Morning/Vent
// (no Angry/Confused/Excited, adds Nightmare) — matches the reference design.
export const DREAM_EMOTIONS: ChipDef[] = [
  { key: 'anxious',   label: 'Anxious',   emoji: '😰' },
  { key: 'sad',       label: 'Sad',       emoji: '😢' },
  { key: 'scared',    label: 'Scared',    emoji: '😨' },
  { key: 'peaceful',  label: 'Peaceful',  emoji: '🌿' },
  { key: 'happy',     label: 'Happy',     emoji: '😊' },
  { key: 'romantic',  label: 'Romantic',  emoji: '💖' },
  { key: 'nightmare', label: 'Nightmare', emoji: '😱' },
];

// Night Journal's own mood set (distinct from the Morning/Vent Emotions list).
export const NIGHT_MOODS: ChipDef[] = [
  { key: 'amazing',  label: 'Amazing',  emoji: '😊' },
  { key: 'good',     label: 'Good',     emoji: '😀' },
  { key: 'okay',     label: 'Okay',     emoji: '😐' },
  { key: 'tough',    label: 'Tough',    emoji: '😖' },
  { key: 'hard',     label: 'Hard',     emoji: '😩' },
  { key: 'peaceful', label: 'Peaceful', emoji: '💖' },
];

// Vent Journal — what triggered the feeling.
export const TRIGGERS: ChipDef[] = [
  { key: 'people',       label: 'People',            emoji: '🧑‍🤝‍🧑' },
  { key: 'work',         label: 'Work/School',       emoji: '🏫' },
  { key: 'relationship', label: 'Relationship',      emoji: '💕' },
  { key: 'family',       label: 'Family',            emoji: '🏠' },
  { key: 'health',       label: 'Health',            emoji: '🏥' },
  { key: 'finances',     label: 'Finances',          emoji: '💰' },
  { key: 'future',       label: 'Future/Uncertainty', emoji: '🔮' },
];

// Vent Journal — "What do you need right now?" checkbox cards.
export const NEEDS: ChipDef[] = [
  { key: 'talk',  label: 'Talk to someone', emoji: '💬' },
  { key: 'alone', label: 'Time Alone',      emoji: '🧍' },
  { key: 'sleep', label: 'Good Sleep',      emoji: '🌙' },
];

// Dream Journal — where the dream took place.
export const PLACES: ChipDef[] = [
  { key: 'home',     label: 'Home',         emoji: '🏠' },
  { key: 'school',   label: 'School',       emoji: '🏫' },
  { key: 'office',   label: 'Office',       emoji: '🏢' },
  { key: 'forest',   label: 'Forest',       emoji: '🌲' },
  { key: 'beach',    label: 'Beach',        emoji: '🏖️' },
  { key: 'road',     label: 'Road',         emoji: '🛣️' },
  { key: 'airport',  label: 'Airport',      emoji: '✈️' },
  { key: 'hospital', label: 'Hospital',     emoji: '🏥' },
  { key: 'temple',   label: 'Temple',       emoji: '⛩️' },
  { key: 'unknown',  label: 'Unknown Place', emoji: '❓' },
];

// Dream Journal — "Dream details" checkbox grid.
export interface CardChoiceDef { key: string; label: string; sub: string; emoji: string; }
export const DREAM_DETAILS: CardChoiceDef[] = [
  { key: 'night',     label: 'Night Dream',     sub: 'Happened while I was sleeping', emoji: '🌙' },
  { key: 'day',       label: 'Day Dream',       sub: 'Happened while I was awake',    emoji: '🌤️' },
  { key: 'lucid',     label: 'Lucid Dream',     sub: 'I knew I was dreaming.',        emoji: '☁️' },
  { key: 'recurring', label: 'Recurring Dream', sub: "I've had this dream before.",   emoji: '🔄' },
];

// Morning Journal — affirmation chips.
export const AFFIRMATIONS: ChipDef[] = [
  { key: 'enough',     label: 'I am enough',              emoji: '♡' },
  { key: 'peace',      label: 'I choose peace',           emoji: '♡' },
  { key: 'positivity', label: 'I attract positivity',     emoji: '♡' },
  { key: 'best',       label: "I'm the best",             emoji: '♡' },
  { key: 'amazing',    label: 'I am capable of amazing things', emoji: '♡' },
];

export const EMOTION_TO_MOOD: Record<string, string> = {
  angry: 'angry', happy: 'happy', confused: 'neutral', sad: 'sad',
  anxious: 'anxious', excited: 'excited', scared: 'anxious',
  romantic: 'loved', peaceful: 'calm',
  amazing: 'excited', good: 'happy', okay: 'neutral', tough: 'sad', hard: 'sad',
  nightmare: 'anxious',
};
