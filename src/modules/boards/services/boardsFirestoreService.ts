/**
 * boardsFirestoreService.ts
 *
 * Collection: boards/{boardId}
 * Elements are stored as a JSON array inside the board document.
 * Thumbnails are stored in Firebase Storage.
 */
import {
  collection, doc, addDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, orderBy,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { uploadFileToFirebase } from '../../../services/storageService';
import { Board, BoardElement, BoardType } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────
const toIso = (ts: any): string => {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  return typeof ts === 'string' ? ts : new Date().toISOString();
};

function snapToBoard(d: any): Board {
  const data = d.data();
  return {
    id:        d.id,
    userId:    data.userId,
    title:     data.title ?? 'Untitled',
    type:      data.type  ?? 'personal',
    thumbnail: data.thumbnail ?? undefined,
    elements:  data.elements  ?? [],
    isPublic:  data.isPublic  ?? false,
    bgColor:   data.bgColor   ?? '#FFFFFF',
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

// ── Boards CRUD ───────────────────────────────────────────────────────────────
export async function fetchBoards(userId: string): Promise<Board[]> {
  const q    = query(
    collection(db, 'boards'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(snapToBoard);
}

export async function fetchBoard(boardId: string): Promise<Board | null> {
  const snap = await getDoc(doc(db, 'boards', boardId));
  return snap.exists() ? snapToBoard(snap) : null;
}

export async function createBoard(payload: {
  userId:   string;
  title:    string;
  type:     BoardType;
  bgColor:  string;
  isPublic: boolean;
}): Promise<Board> {
  const now = serverTimestamp();
  const ref = await addDoc(collection(db, 'boards'), {
    ...payload,
    elements:  [],
    thumbnail: null,
    createdAt: now,
    updatedAt: now,
  });
  return {
    id:        ref.id,
    elements:  [],
    thumbnail: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...payload,
  };
}

export async function updateBoardElements(
  boardId:  string,
  elements: BoardElement[],
): Promise<void> {
  await updateDoc(doc(db, 'boards', boardId), {
    elements,
    updatedAt: serverTimestamp(),
  });
}

export async function updateBoardMeta(
  boardId: string,
  meta: Partial<Pick<Board, 'title' | 'bgColor' | 'isPublic' | 'thumbnail'>>,
): Promise<void> {
  await updateDoc(doc(db, 'boards', boardId), {
    ...meta,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBoard(boardId: string): Promise<void> {
  await deleteDoc(doc(db, 'boards', boardId));
}

// ── Thumbnail upload ──────────────────────────────────────────────────────────
export async function uploadBoardThumbnail(
  userId:   string,
  boardId:  string,
  localUri: string,
): Promise<string> {
  const ext  = localUri.split('.').pop() ?? 'jpg';
  const path = `boards/${userId}/${boardId}_thumb.${ext}`;
  return uploadFileToFirebase(localUri, path);
}

// ── Board image element upload ────────────────────────────────────────────────
export async function uploadBoardImage(
  userId:   string,
  boardId:  string,
  localUri: string,
): Promise<string> {
  const ext  = localUri.split('.').pop() ?? 'jpg';
  const path = `boards/${userId}/${boardId}_${Date.now()}.${ext}`;
  return uploadFileToFirebase(localUri, path);
}
