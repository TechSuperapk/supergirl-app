import { getStorage, ref, putFile, getDownloadURL } from '@react-native-firebase/storage';

/**
 * Uploads a local file URI to Firebase Storage and returns its download URL.
 * Uses react-native-firebase's putFile (native upload of a local file path).
 * @param uri Local file URI (e.g., file://…)
 * @param path Storage destination path (e.g., 'profiles/userId/avatar.jpg')
 */
export async function uploadFileToFirebase(uri: string, path: string): Promise<string> {
  const fileRef = ref(getStorage(), path);
  await putFile(fileRef, uri);
  return await getDownloadURL(fileRef);
}
