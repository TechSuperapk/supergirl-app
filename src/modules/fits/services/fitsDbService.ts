/**
 * fitsDbService.ts
 *
 * Now backed by the app's own API (MongoDB) via /api/data/fits_* instead of
 * Firestore. Images upload to S3 (via storageService). Exported names/
 * signatures are unchanged so screens don't need edits.
 *
 * Collections: fits_wardrobe / fits_outfits / fits_planner
 */
import { listDocs, createDoc, patchDoc, removeDoc, upsertDoc } from '../../../services/dataApi';
import { uploadFileToFirebase } from '../../../services/storageService';
import { ClothingItem, Outfit, PlannerEntry } from '../types';

const descByCreated = (a: any, b: any) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''));

// ── Upload clothing image (S3) ────────────────────────────────────────────────
export async function uploadClothingImage(
  userId: string,
  localUri: string,
): Promise<{ remoteUrl: string; s3Key: string }> {
  const ext       = localUri.split('.').pop() ?? 'jpg';
  const s3Key     = `fits/${userId}/wardrobe/${Date.now()}.${ext}`;
  const remoteUrl = await uploadFileToFirebase(localUri, s3Key);
  return { remoteUrl, s3Key };
}

// ── Wardrobe ──────────────────────────────────────────────────────────────────
export async function fetchWardrobe(_userId: string): Promise<ClothingItem[]> {
  const all = await listDocs<ClothingItem>('fits_wardrobe');
  return all.sort(descByCreated);
}

export async function addClothingItem(
  item: Omit<ClothingItem, 'id' | 'createdAt'>,
  localImageUri?: string,
): Promise<ClothingItem> {
  let imageUri = item.imageUri;
  let s3Key    = item.s3Key;
  if (localImageUri && !localImageUri.startsWith('http')) {
    const uploaded = await uploadClothingImage(item.userId, localImageUri);
    imageUri = uploaded.remoteUrl;
    s3Key    = uploaded.s3Key;
  }
  return createDoc<ClothingItem>('fits_wardrobe', { ...item, imageUri, s3Key });
}

export async function updateClothingItem(
  itemId: string,
  updates: Partial<ClothingItem>,
  newLocalUri?: string,
): Promise<Partial<ClothingItem>> {
  const patch = { ...updates };
  if (newLocalUri && !newLocalUri.startsWith('http')) {
    const uploaded = await uploadClothingImage(updates.userId ?? '', newLocalUri);
    patch.imageUri = uploaded.remoteUrl;
    patch.s3Key    = uploaded.s3Key;
  }
  await patchDoc('fits_wardrobe', itemId, patch);
  return patch;
}

export async function deleteClothingItem(itemId: string): Promise<void> {
  await removeDoc('fits_wardrobe', itemId);
}

// ── Outfits ───────────────────────────────────────────────────────────────────
export async function fetchOutfits(_userId: string): Promise<Outfit[]> {
  const all = await listDocs<Outfit>('fits_outfits');
  return all.sort(descByCreated);
}

export async function saveOutfit(outfit: Omit<Outfit, 'id' | 'createdAt'>): Promise<Outfit> {
  return createDoc<Outfit>('fits_outfits', outfit);
}

export async function updateOutfit(outfitId: string, updates: Partial<Outfit>): Promise<void> {
  await patchDoc('fits_outfits', outfitId, updates);
}

export async function deleteOutfit(outfitId: string): Promise<void> {
  await removeDoc('fits_outfits', outfitId);
}

// ── Planner (one entry per date) ──────────────────────────────────────────────
export async function fetchPlannerEntries(_userId: string): Promise<PlannerEntry[]> {
  return listDocs<PlannerEntry>('fits_planner');
}

export async function upsertPlannerEntry(_userId: string, entry: PlannerEntry): Promise<void> {
  await upsertDoc('fits_planner', { date: (entry as any).date }, entry);
}

export async function deletePlannerEntry(_userId: string, date: string): Promise<void> {
  const all = await listDocs<PlannerEntry & { id: string }>('fits_planner');
  const match = all.find(e => (e as any).date === date);
  if (match?.id) await removeDoc('fits_planner', match.id);
}
