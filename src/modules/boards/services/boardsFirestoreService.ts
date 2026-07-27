/**
 * boardsFirestoreService.ts
 *
 * Now backed by the app's own API (MongoDB) via /api/data/boards instead of
 * Firestore. The exported function names/signatures are unchanged so callers
 * don't need edits. Thumbnails/images upload to S3 (via storageService).
 */
import { listDocs, fetchDoc, createDoc, patchDoc, removeDoc } from '../../../services/dataApi';
import { uploadFileToFirebase } from '../../../services/storageService';
import { Board, BoardElement, BoardType } from '../types';

const COLLECTION = 'boards';

// ── Boards CRUD ───────────────────────────────────────────────────────────────
// userId params are kept for signature compatibility but ignored — the backend
// scopes everything to the signed-in user via the JWT.
export async function fetchBoards(_userId: string): Promise<Board[]> {
  return listDocs<Board>(COLLECTION);
}

export async function fetchBoard(boardId: string): Promise<Board | null> {
  try {
    return await fetchDoc<Board>(COLLECTION, boardId);
  } catch {
    return null;
  }
}

export async function createBoard(payload: {
  userId:   string;
  title:    string;
  type:     BoardType;
  bgColor:  string;
  isPublic: boolean;
}): Promise<Board> {
  const { userId, ...fields } = payload;
  return createDoc<Board>(COLLECTION, { ...fields, elements: [], thumbnail: null });
}

export async function updateBoardElements(
  boardId:  string,
  elements: BoardElement[],
): Promise<void> {
  await patchDoc(COLLECTION, boardId, { elements });
}

export async function updateBoardMeta(
  boardId: string,
  meta: Partial<Pick<Board, 'title' | 'bgColor' | 'isPublic' | 'thumbnail'>>,
): Promise<void> {
  await patchDoc(COLLECTION, boardId, meta);
}

export async function deleteBoard(boardId: string): Promise<void> {
  await removeDoc(COLLECTION, boardId);
}

// ── Thumbnail / image uploads (S3 via storageService) ─────────────────────────
export async function uploadBoardThumbnail(
  userId:   string,
  boardId:  string,
  localUri: string,
): Promise<string> {
  const ext  = localUri.split('.').pop() ?? 'jpg';
  const path = `boards/${userId}/${boardId}_thumb.${ext}`;
  return uploadFileToFirebase(localUri, path);
}

export async function uploadBoardImage(
  userId:   string,
  boardId:  string,
  localUri: string,
): Promise<string> {
  const ext  = localUri.split('.').pop() ?? 'jpg';
  const path = `boards/${userId}/${boardId}_${Date.now()}.${ext}`;
  return uploadFileToFirebase(localUri, path);
}
