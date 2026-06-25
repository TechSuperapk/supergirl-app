/**
 * fitsDbService.ts
 *
 * Wardrobe, outfits, and planner stored in Firestore
 * (same pattern as journaling — cloud-synced, offline-first via Firestore cache).
 *
 * Collections:
 *   fits_wardrobe/{itemId}
 *   fits_outfits/{outfitId}
 *   fits_planner/{userId_date}
 */
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc,
  deleteDoc, query, where, orderBy, setDoc,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { uploadFileToFirebase } from '../../../services/storageService';
import { ClothingItem, Outfit, PlannerEntry } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────
function toIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  return typeof ts === 'string' ? ts : new Date().toISOString();
}

// ── Upload clothing image ─────────────────────────────────────────────────────
export async function uploadClothingImage(
  userId: string,
  localUri: string,
): Promise<{ remoteUrl: string; s3Key: string }> {
  const ext     = localUri.split('.').pop() ?? 'jpg';
  const s3Key   = `fits/${userId}/wardrobe/${Date.now()}.${ext}`;
  const remoteUrl = await uploadFileToFirebase(localUri, s3Key);
  return { remoteUrl, s3Key };
}

// ── Wardrobe ──────────────────────────────────────────────────────────────────
export async function fetchWardrobe(userId: string): Promise<ClothingItem[]> {
  const q    = query(
    collection(db, 'fits_wardrobe'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    ...(d.data() as ClothingItem),
    id: d.id,
    createdAt: toIso((d.data() as any).createdAt),
  }));
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

  const ref  = await addDoc(collection(db, 'fits_wardrobe'), {
    ...item,
    imageUri,
    s3Key,
    createdAt: serverTimestamp(),
  });
  return {
    ...item,
    id:        ref.id,
    imageUri,
    s3Key,
    createdAt: new Date().toISOString(),
  };
}

export async function updateClothingItem(
  itemId: string,
  updates: Partial<ClothingItem>,
  newLocalUri?: string,
): Promise<Partial<ClothingItem>> {
  let patch = { ...updates };
  if (newLocalUri && !newLocalUri.startsWith('http')) {
    const uploaded = await uploadClothingImage(updates.userId ?? '', newLocalUri);
    patch.imageUri = uploaded.remoteUrl;
    patch.s3Key    = uploaded.s3Key;
  }
  await updateDoc(doc(db, 'fits_wardrobe', itemId), patch);
  return patch;
}

export async function deleteClothingItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'fits_wardrobe', itemId));
}

// ── Outfits ───────────────────────────────────────────────────────────────────
export async function fetchOutfits(userId: string): Promise<Outfit[]> {
  const q    = query(
    collection(db, 'fits_outfits'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    ...(d.data() as Outfit),
    id: d.id,
    createdAt: toIso((d.data() as any).createdAt),
  }));
}

export async function saveOutfit(
  outfit: Omit<Outfit, 'id' | 'createdAt'>,
): Promise<Outfit> {
  const ref = await addDoc(collection(db, 'fits_outfits'), {
    ...outfit,
    createdAt: serverTimestamp(),
  });
  return { ...outfit, id: ref.id, createdAt: new Date().toISOString() };
}

export async function updateOutfit(
  outfitId: string,
  updates: Partial<Outfit>,
): Promise<void> {
  await updateDoc(doc(db, 'fits_outfits', outfitId), updates);
}

export async function deleteOutfit(outfitId: string): Promise<void> {
  await deleteDoc(doc(db, 'fits_outfits', outfitId));
}

// ── Planner ───────────────────────────────────────────────────────────────────
/** Document ID = `{userId}_{YYYY-MM-DD}` */
export async function fetchPlannerEntries(userId: string): Promise<PlannerEntry[]> {
  const q    = query(
    collection(db, 'fits_planner'),
    where('userId', '==', userId),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as PlannerEntry);
}

export async function upsertPlannerEntry(
  userId: string,
  entry: PlannerEntry,
): Promise<void> {
  const docId = `${userId}_${entry.date}`;
  await setDoc(
    doc(db, 'fits_planner', docId),
    { ...entry, userId },
    { merge: true },
  );
}

export async function deletePlannerEntry(
  userId: string,
  date: string,
): Promise<void> {
  const docId = `${userId}_${date}`;
  await deleteDoc(doc(db, 'fits_planner', docId));
}
