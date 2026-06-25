import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import {
  setWardrobe, addClothing, updateClothing, removeClothing,
  setOutfits, addOutfit, removeOutfit, updateOutfit as updateOutfitAction,
  setPlannerEntries, upsertPlannerEntry as upsertPlannerAction,
  setAISuggestions,
} from '../store/fitsSlice';
import {
  fetchWardrobe, addClothingItem, updateClothingItem, deleteClothingItem,
  fetchOutfits, saveOutfit, updateOutfit, deleteOutfit,
  fetchPlannerEntries, upsertPlannerEntry, deletePlannerEntry,
} from '../services/fitsDbService';
import { generateOutfitSuggestions, generateWardrobeInsights } from '../services/aiStylistService';
import { ClothingItem, Outfit, PlannerEntry, ClothingCategory } from '../types';

// ── Wardrobe hook ─────────────────────────────────────────────────────────────
export function useWardrobe() {
  const dispatch  = useDispatch();
  const user      = useSelector((s: RootState) => s.auth.user);
  const wardrobe  = useSelector((s: RootState) => s.fits.wardrobe);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'all'>('all');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const items = await fetchWardrobe(user.id);
      dispatch(setWardrobe(items));
    } finally {
      setLoading(false);
    }
  }, [user?.id, dispatch]);

  useEffect(() => { load(); }, [load]);

  const filtered = activeCategory === 'all'
    ? wardrobe
    : wardrobe.filter(i => i.category === activeCategory);

  const addItem = async (
    item: Omit<ClothingItem, 'id' | 'createdAt' | 'userId'>,
    localUri?: string,
  ) => {
    if (!user) return;
    const saved = await addClothingItem({ ...item, userId: user.id }, localUri);
    dispatch(addClothing(saved));
    return saved;
  };

  const editItem = async (itemId: string, updates: Partial<ClothingItem>, newUri?: string) => {
    const patch = await updateClothingItem(itemId, updates, newUri);
    const existing = wardrobe.find(i => i.id === itemId);
    if (existing) dispatch(updateClothing({ ...existing, ...patch }));
  };

  const removeItem = async (itemId: string) => {
    await deleteClothingItem(itemId);
    dispatch(removeClothing(itemId));
  };

  const toggleFavourite = async (itemId: string) => {
    const item = wardrobe.find(i => i.id === itemId);
    if (!item) return;
    await editItem(itemId, { isFavourite: !item.isFavourite });
  };

  return {
    wardrobe,
    filtered,
    loading,
    activeCategory,
    setActiveCategory,
    addItem,
    editItem,
    removeItem,
    toggleFavourite,
    refresh: load,
  };
}

// ── Outfits hook ──────────────────────────────────────────────────────────────
export function useOutfits() {
  const dispatch = useDispatch();
  const user     = useSelector((s: RootState) => s.auth.user);
  const outfits  = useSelector((s: RootState) => s.fits.outfits);
  const wardrobe = useSelector((s: RootState) => s.fits.wardrobe);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchOutfits(user.id)
      .then(os => dispatch(setOutfits(os)))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const createOutfit = async (
    name: string,
    clothingItemIds: string[],
    tags: string[],
    notes?: string,
    season?: Outfit['season'],
    occasion?: string,
  ) => {
    if (!user || clothingItemIds.length < 2) return;
    const outfit = await saveOutfit({
      userId: user.id,
      name,
      clothingItemIds,
      tags,
      notes,
      season,
      occasion,
      isFavourite: false,
    });
    dispatch(addOutfit(outfit));
    return outfit;
  };

  const editOutfit = async (outfitId: string, updates: Partial<Outfit>) => {
    await updateOutfit(outfitId, updates);
    const existing = outfits.find(o => o.id === outfitId);
    if (existing) dispatch(updateOutfitAction({ ...existing, ...updates }));
  };

  const removeOutfitById = async (outfitId: string) => {
    await deleteOutfit(outfitId);
    dispatch(removeOutfit(outfitId));
  };

  // Resolve clothing items for a given outfit
  const resolveItems = (outfit: Outfit): ClothingItem[] =>
    outfit.clothingItemIds
      .map(id => wardrobe.find(w => w.id === id))
      .filter(Boolean) as ClothingItem[];

  return { outfits, loading, createOutfit, editOutfit, removeOutfitById, resolveItems };
}

// ── Planner hook ──────────────────────────────────────────────────────────────
export function usePlanner() {
  const dispatch       = useDispatch();
  const user           = useSelector((s: RootState) => s.auth.user);
  const plannerEntries = useSelector((s: RootState) => s.fits.plannerEntries);

  useEffect(() => {
    if (!user) return;
    fetchPlannerEntries(user.id).then(es => dispatch(setPlannerEntries(es)));
  }, [user?.id]);

  const entryForDate = (date: string) =>
    plannerEntries.find(e => e.date === date) ?? null;

  const planOutfit = async (date: string, outfitId: string | null, notes?: string) => {
    if (!user) return;
    const entry: PlannerEntry = { date, outfitId, notes };
    await upsertPlannerEntry(user.id, entry);
    dispatch(upsertPlannerAction(entry));
  };

  const clearDay = async (date: string) => {
    if (!user) return;
    await deletePlannerEntry(user.id, date);
    dispatch(upsertPlannerAction({ date, outfitId: null }));
  };

  // Build a 7-day window starting from today
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  return { plannerEntries, entryForDate, planOutfit, clearDay, weekDates };
}

// ── AI Stylist hook ───────────────────────────────────────────────────────────
export function useAIStylist() {
  const dispatch     = useDispatch();
  const wardrobe     = useSelector((s: RootState) => s.fits.wardrobe);
  const suggestions  = useSelector((s: RootState) => s.fits.aiSuggestions);
  const [loading,    setLoading]  = useState(false);
  const [insight,    setInsight]  = useState('');
  const [error,      setError]    = useState<string | null>(null);

  const generate = async (occasion?: string, weather?: string) => {
    if (wardrobe.length < 3) {
      setError('Add at least 3 items to your wardrobe to get AI suggestions.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await generateOutfitSuggestions({
        wardrobe,
        occasion,
        weather,
        count: 3,
      });
      dispatch(setAISuggestions(results));

      const ins = await generateWardrobeInsights(wardrobe);
      setInsight(ins);
    } catch (err: any) {
      setError(err?.message ?? 'Could not generate suggestions. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return { suggestions, loading, insight, error, generate };
}

// ── Outfit builder hook ───────────────────────────────────────────────────────
export function useOutfitBuilder(initialItemIds: string[] = []) {
  const wardrobe = useSelector((s: RootState) => s.fits.wardrobe);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialItemIds);

  const toggle = (itemId: string) => {
    setSelectedIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId],
    );
  };

  const clear = () => setSelectedIds([]);

  const selectedItems = selectedIds
    .map(id => wardrobe.find(w => w.id === id))
    .filter(Boolean) as ClothingItem[];

  const isValid = selectedIds.length >= 2;

  return { selectedIds, selectedItems, toggle, clear, isValid };
}
