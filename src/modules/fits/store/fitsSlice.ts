import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LoadingState } from '../../../shared/types/common';
import { ClothingItem, Outfit, PlannerEntry, AISuggestion, AvatarConfig } from '../types';

interface FitsState {
  wardrobe:      ClothingItem[];
  outfits:       Outfit[];
  plannerEntries: PlannerEntry[];
  aiSuggestions: AISuggestion[];
  avatar:        AvatarConfig | null;
  loading:       LoadingState;
  error:         string | null;
}

const initialState: FitsState = {
  wardrobe:      [],
  outfits:       [],
  plannerEntries: [],
  aiSuggestions: [],
  avatar:        null,
  loading:       'idle',
  error:         null,
};

const fitsSlice = createSlice({
  name: 'fits',
  initialState,
  reducers: {
    setLoading(state, a: PayloadAction<LoadingState>) { state.loading = a.payload; },
    setError(state, a: PayloadAction<string | null>)  { state.error = a.payload; },

    setWardrobe(state, a: PayloadAction<ClothingItem[]>) { state.wardrobe = a.payload; },
    addClothing(state, a: PayloadAction<ClothingItem>)   { state.wardrobe.push(a.payload); },
    updateClothing(state, a: PayloadAction<ClothingItem>) {
      const i = state.wardrobe.findIndex(c => c.id === a.payload.id);
      if (i !== -1) state.wardrobe[i] = a.payload;
    },
    removeClothing(state, a: PayloadAction<string>) {
      state.wardrobe = state.wardrobe.filter(c => c.id !== a.payload);
    },

    setOutfits(state, a: PayloadAction<Outfit[]>)  { state.outfits = a.payload; },
    addOutfit(state, a: PayloadAction<Outfit>)      { state.outfits.push(a.payload); },
    updateOutfit(state, a: PayloadAction<Outfit>) {
      const i = state.outfits.findIndex(o => o.id === a.payload.id);
      if (i !== -1) state.outfits[i] = a.payload;
    },
    removeOutfit(state, a: PayloadAction<string>)   {
      state.outfits = state.outfits.filter(o => o.id !== a.payload);
    },

    setPlannerEntries(state, a: PayloadAction<PlannerEntry[]>) { state.plannerEntries = a.payload; },
    upsertPlannerEntry(state, a: PayloadAction<PlannerEntry>) {
      const i = state.plannerEntries.findIndex(p => p.date === a.payload.date);
      if (i !== -1) state.plannerEntries[i] = a.payload;
      else          state.plannerEntries.push(a.payload);
    },

    setAISuggestions(state, a: PayloadAction<AISuggestion[]>) { state.aiSuggestions = a.payload; },
    setAvatar(state, a: PayloadAction<AvatarConfig>)           { state.avatar = a.payload; },
  },
});

export const {
  setLoading, setError,
  setWardrobe, addClothing, updateClothing, removeClothing,
  setOutfits, addOutfit, updateOutfit, removeOutfit,
  setPlannerEntries, upsertPlannerEntry,
  setAISuggestions, setAvatar,
} = fitsSlice.actions;

export default fitsSlice.reducer;
