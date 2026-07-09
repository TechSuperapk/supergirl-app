import { uploadLocalFile } from '../lib/firebaseStorage';

/**
 * Uploads a local file URI to Firebase Storage and returns its download URL.
 * Uses the Firebase JS SDK (Expo Go compatible).
 * @param uri  Local file URI (e.g., file://…)
 * @param path Storage destination path (e.g., 'profiles/userId/avatar.jpg')
 */
export async function uploadFileToFirebase(uri: string, path: string): Promise<string> {
  return uploadLocalFile(path, uri);
}
