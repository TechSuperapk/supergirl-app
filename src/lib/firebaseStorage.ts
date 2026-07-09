/**
 * firebaseStorage — small helper to upload a local file URI to Firebase Storage
 * using the JS SDK (Expo Go compatible).
 *
 * react-native-firebase's native `putFile(ref, localPath)` has no JS-SDK
 * equivalent, so we fetch the local URI into a Blob and use `uploadBytes`.
 */
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/** Upload a local file URI to `path` in Storage; returns the download URL. */
export async function uploadLocalFile(path: string, uri: string): Promise<string> {
  const fileRef = ref(storage, path);
  const res = await fetch(uri);
  const blob = await res.blob();
  await uploadBytes(fileRef, blob);
  return getDownloadURL(fileRef);
}
