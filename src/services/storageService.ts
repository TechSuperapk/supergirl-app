import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * Uploads a local file URI to Firebase Storage and returns its download URL.
 * @param uri Local file URI (e.g., file:// or ph://)
 * @param path Storage destination path (e.g., 'profiles/userId/avatar.jpg')
 */
export async function uploadFileToFirebase(uri: string, path: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, blob);
  return await getDownloadURL(fileRef);
}
