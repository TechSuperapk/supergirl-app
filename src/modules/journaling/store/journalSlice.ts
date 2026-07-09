import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { JournalEntry, Mood, ScribblePage } from '../types';

interface JournalState {
  entries: JournalEntry[];
  drafts: JournalEntry[];
  selectedMood: Mood | null;
  vaultPin: string;
  vaultUnlocked: boolean;
  securityQuestion1: string;
  securityAnswer1: string;
  securityQuestion2: string;
  securityAnswer2: string;
}

const initialState: JournalState = {
  entries: [], drafts: [], selectedMood: null,
  vaultPin: '1234', vaultUnlocked: false,
  securityQuestion1: '', securityAnswer1: '',
  securityQuestion2: '', securityAnswer2: '',
};

const journalSlice = createSlice({
  name: 'journal',
  initialState,
  reducers: {
    addEntry(state, a: PayloadAction<JournalEntry>) {
      state.entries.unshift(a.payload);
      state.drafts = state.drafts.filter(d => d.id !== a.payload.id);
    },
    updateEntry(state, a: PayloadAction<JournalEntry>) {
      const i = state.entries.findIndex(e => e.id === a.payload.id);
      if (i !== -1) state.entries[i] = a.payload;
      state.drafts = state.drafts.filter(d => d.id !== a.payload.id);
    },
    deleteEntry(state, a: PayloadAction<string>) {
      state.entries = state.entries.filter(e => e.id !== a.payload);
    },
    saveDraft(state, a: PayloadAction<JournalEntry>) {
      const i = state.drafts.findIndex(d => d.id === a.payload.id);
      if (i !== -1) state.drafts[i] = a.payload; else state.drafts.unshift(a.payload);
    },
    deleteDraft(state, a: PayloadAction<string>) {
      state.drafts = state.drafts.filter(d => d.id !== a.payload);
    },
    // Move entry to private (set isPrivate=true)
    moveToPrivate(state, a: PayloadAction<string>) {
      const i = state.entries.findIndex(e => e.id === a.payload);
      if (i !== -1) state.entries[i].isPrivate = true;
    },
    // Move entry to public (set isPrivate=false)
    moveToPublic(state, a: PayloadAction<string>) {
      const i = state.entries.findIndex(e => e.id === a.payload);
      if (i !== -1) state.entries[i].isPrivate = false;
    },
    setFavorite(state, a: PayloadAction<{ id: string; isFavorite: boolean }>) {
      const i = state.entries.findIndex(e => e.id === a.payload.id);
      if (i !== -1) state.entries[i].isFavorite = a.payload.isFavorite;
    },
    saveScribblePage(state, a: PayloadAction<{ entryId: string; page: ScribblePage }>) {
      const { entryId, page } = a.payload;
      for (const arr of [state.entries, state.drafts]) {
        const idx = arr.findIndex(e => e.id === entryId);
        if (idx !== -1) {
          const pages = arr[idx].scribblePages ?? [];
          const pi = pages.findIndex(p => p.id === page.id);
          if (pi !== -1) pages[pi] = page; else pages.push(page);
          arr[idx].scribblePages = pages;
        }
      }
    },
    setSelectedMood(state, a: PayloadAction<Mood | null>) { state.selectedMood = a.payload; },
    loadEntries(state, a: PayloadAction<JournalEntry[]>)   {
      const seen = new Set<string>();
      state.entries = a.payload.filter(e => (seen.has(e.id) ? false : (seen.add(e.id), true)));
    },
    loadDrafts(state, a: PayloadAction<JournalEntry[]>)    { state.drafts = a.payload; },
    unlockVault(state) { state.vaultUnlocked = true; },
    lockVault(state)   { state.vaultUnlocked = false; },
    setVaultPin(state, a: PayloadAction<string>) { state.vaultPin = a.payload; },
    setSecurityQuestions(state, a: PayloadAction<{q1:string;a1:string;q2:string;a2:string}>) {
      state.securityQuestion1 = a.payload.q1; state.securityAnswer1 = a.payload.a1.toLowerCase().trim();
      state.securityQuestion2 = a.payload.q2; state.securityAnswer2 = a.payload.a2.toLowerCase().trim();
    },
    loadVault(state, a: PayloadAction<{pin?:string;q1?:string;a1?:string;q2?:string;a2?:string}>) {
      if (a.payload.pin) state.vaultPin = a.payload.pin;
      if (a.payload.q1 !== undefined) state.securityQuestion1 = a.payload.q1;
      if (a.payload.a1 !== undefined) state.securityAnswer1 = a.payload.a1;
      if (a.payload.q2 !== undefined) state.securityQuestion2 = a.payload.q2;
      if (a.payload.a2 !== undefined) state.securityAnswer2 = a.payload.a2;
    },
  },
});

export const {
  addEntry, updateEntry, deleteEntry, saveDraft, deleteDraft,
  moveToPrivate, moveToPublic, setFavorite, saveScribblePage,
  setSelectedMood, loadEntries, loadDrafts,
  unlockVault, lockVault, setVaultPin, setSecurityQuestions, loadVault,
} = journalSlice.actions;
export default journalSlice.reducer;
