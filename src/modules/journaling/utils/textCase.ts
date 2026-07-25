// Sentence-case normaliser for speech-to-text / dictation, which often returns
// text with only the first letter capitalised (no punctuation-based casing).
//
// Capitalises the first letter of the text, the first letter after a sentence
// ender (. ! ?) or newline, and standalone "I"/contractions — without
// lowercasing anything, so typed proper nouns are left intact. The edit is
// case-only and length-preserving, so the caret position stays put.
export function sentenceCase(text: string): string {
  let r = text.replace(/(^|[.!?]\s+|\n\s*)([a-z])/g, (_m, p1: string, p2: string) => p1 + p2.toUpperCase());
  // Capitalise "i" only once the word is complete (followed by space, newline,
  // or an apostrophe like i'm/i'll) — avoids turning a half-typed "in" into "In".
  r = r.replace(/\bi(?=[ \n]|['’])/g, 'I');
  return r;
}
