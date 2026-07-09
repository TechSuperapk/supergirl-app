// Shared Quick-Notes store (AsyncStorage). Notes now carry rich HTML bodies,
// an optional tag/label, pin flag and voice-note attachments.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScribblePath } from './types';

export const QUICK_NOTES_KEY = 'quick_notes_v1';

export interface NoteAudio { id: string; uri: string; }
export interface ChecklistItem { id: string; text: string; done: boolean; }
// Same raw path data Journal's scribblePages store — kept as a separate
// attachment (like voice clips) rather than baked into the rich-text body,
// so each sketch can be tapped to view full-screen.
export interface NoteSketch { id: string; paths: ScribblePath[]; }
export interface QuickNoteRecord {
  id: string;
  title: string;
  body: string;            // HTML
  tag?: string;
  pinned?: boolean;
  audio?: NoteAudio[];
  checklist?: ChecklistItem[];
  sketches?: NoteSketch[];
  // Local (file://) or, once notesSync uploads it, remote (https://) photo
  // URIs — same shape/role as Journal's JournalEntry.mediaUrls.
  media?: string[];
  updatedAt: string;
}

// Guards against a corrupted/unexpected AsyncStorage value (e.g. an old
// shape, partial write, or non-array JSON) ever propagating into list code
// that assumes an array — that would otherwise throw on every screen that
// reads notes, effectively crashing the whole Notes feature.
export async function loadNotes(): Promise<QuickNoteRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(QUICK_NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export async function saveNotes(list: QuickNoteRecord[]): Promise<void> {
  try { await AsyncStorage.setItem(QUICK_NOTES_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export async function upsertNote(note: QuickNoteRecord): Promise<QuickNoteRecord[]> {
  const list = await loadNotes();
  const i = list.findIndex(n => n.id === note.id);
  if (i >= 0) list[i] = note; else list.unshift(note);
  await saveNotes(list);
  return list;
}

export async function removeNote(id: string): Promise<QuickNoteRecord[]> {
  const list = (await loadNotes()).filter(n => n.id !== id);
  await saveNotes(list);
  return list;
}

// Convert stored HTML to a short plain-text preview for the note cards.
export const stripHtml = (html: string): string =>
  (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
