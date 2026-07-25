import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { JournalEntry, Mood, ScribblePage } from '../types';

interface JournalState {
  entries: JournalEntry[];
  drafts: JournalEntry[];
  selectedMood: Mood | null;
  // Hashes only (see utils/vaultCrypto.ts) — never the raw PIN/answers.
  // An empty hash means "not set up yet"; there's no more '1234' sentinel
  // default, since a default that hashes wouldn't be guessable but would
  // still unlock the vault for anyone who read the code.
  vaultPinHash: string;
  vaultUnlocked: boolean;
  securityQuestion1: string;
  securityAnswer1Hash: string;
  securityQuestion2: string;
  securityAnswer2Hash: string;
}

const initialState: JournalState = {
  entries: [], drafts: [], selectedMood: null,
  vaultPinHash: '', vaultUnlocked: false,
  securityQuestion1: '', securityAnswer1Hash: '',
  securityQuestion2: '', securityAnswer2Hash: '',
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
    // Payloads here are already-hashed values (see utils/vaultCrypto.ts) —
    // hashing happens at the call site, before dispatch, since it's async
    // and reducers must stay synchronous.
    setVaultPinHash(state, a: PayloadAction<string>) { state.vaultPinHash = a.payload; },
    setSecurityQuestionHashes(state, a: PayloadAction<{q1:string;a1Hash:string;q2:string;a2Hash:string}>) {
      state.securityQuestion1 = a.payload.q1; state.securityAnswer1Hash = a.payload.a1Hash;
      state.securityQuestion2 = a.payload.q2; state.securityAnswer2Hash = a.payload.a2Hash;
    },
    loadVault(state, a: PayloadAction<{pinHash?:string;q1?:string;a1Hash?:string;q2?:string;a2Hash?:string}>) {
      if (a.payload.pinHash) state.vaultPinHash = a.payload.pinHash;
      if (a.payload.q1 !== undefined) state.securityQuestion1 = a.payload.q1;
      if (a.payload.a1Hash !== undefined) state.securityAnswer1Hash = a.payload.a1Hash;
      if (a.payload.q2 !== undefined) state.securityQuestion2 = a.payload.q2;
      if (a.payload.a2Hash !== undefined) state.securityAnswer2Hash = a.payload.a2Hash;
    },
  },
});

export const {
  addEntry, updateEntry, deleteEntry, saveDraft, deleteDraft,
  moveToPrivate, moveToPublic, setFavorite, saveScribblePage,
  setSelectedMood, loadEntries, loadDrafts,
  unlockVault, lockVault, setVaultPinHash, setSecurityQuestionHashes, loadVault,
} = journalSlice.actions;
export default journalSlice.reducer;
