/**
 * storageUploadService — uploads local media to Firebase Storage (react-native-
 * firebase) and returns download URLs. Only URLs are stored in Firestore.
 *
 * Folder layout:
 *   journal-images/{uid}/...
 *   journal-videos/{uid}/...
 *   journal-audio/{uid}/...
 *   profile-images/{uid}/...
 */
import { getStorage, ref, putFile, getDownloadURL } from '@react-native-firebase/storage';

type MediaKind = 'images' | 'videos' | 'audio';

const FOLDER: Record<MediaKind, string> = {
  images: 'journal-images',
  videos: 'journal-videos',
  audio:  'journal-audio',
};

const isRemote = (uri: string) => /^https?:\/\//i.test(uri);

function extOf(uri: string, fallback: string): string {
  const clean = uri.split('?')[0];
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot + 1) : fallback;
}

/** Upload a single local file URI; pass-through if already a remote URL. */
export async function uploadMedia(
  uid: string, kind: MediaKind, entryId: string, localUri: string,
): Promise<string> {
  if (isRemote(localUri)) return localUri; // already uploaded
  const fallbackExt = kind === 'images' ? 'jpg' : kind === 'videos' ? 'mp4' : 'm4a';
  const name = `${entryId}_${Date.now()}.${extOf(localUri, fallbackExt)}`;
  const path = `${FOLDER[kind]}/${uid}/${name}`;
  const r = ref(getStorage(), path);
  await putFile(r, localUri);
  return getDownloadURL(r);
}

/** Upload an array of media URIs, preserving order; remote URLs pass through. */
export async function uploadMany(
  uid: string, kind: MediaKind, entryId: string, uris: string[],
): Promise<string[]> {
  const out: string[] = [];
  for (const uri of uris ?? []) {
    try {
      out.push(await uploadMedia(uid, kind, entryId, uri));
    } catch {
      out.push(uri); // keep original so we can retry later
    }
  }
  return out;
}

export async function uploadProfileImage(uid: string, localUri: string): Promise<string> {
  if (isRemote(localUri)) return localUri;
  const path = `profile-images/${uid}/avatar_${Date.now()}.${extOf(localUri, 'jpg')}`;
  const r = ref(getStorage(), path);
  await putFile(r, localUri);
  return getDownloadURL(r);
}
