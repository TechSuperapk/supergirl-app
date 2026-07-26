/**
 * Media upload — now goes to Amazon S3 via the app's backend (was Firebase
 * Storage). The function name/signature is unchanged so every caller keeps
 * working: the backend hands back a short-lived presigned PUT URL, we upload
 * the file straight to S3, and return the stable public URL to store.
 */
import { apiClient } from '../services/apiClient';

function guessContentType(uri: string): string {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png':  return 'image/png';
    case 'gif':  return 'image/gif';
    case 'webp': return 'image/webp';
    case 'heic': return 'image/heic';
    case 'mp4':  return 'video/mp4';
    case 'mov':  return 'video/quicktime';
    case 'm4a':  return 'audio/m4a';
    case 'mp3':  return 'audio/mpeg';
    case 'wav':  return 'audio/wav';
    default:     return 'application/octet-stream';
  }
}

/** Upload a local file URI to `path` in S3; returns the public URL. */
export async function uploadLocalFile(path: string, uri: string): Promise<string> {
  const contentType = guessContentType(uri);

  // 1) Ask our backend for a presigned S3 upload URL (JWT-authenticated).
  const { uploadUrl, fileUrl } = await apiClient.post<{ uploadUrl: string; fileUrl: string }>(
    '/media/upload-url',
    { key: path, contentType },
  );

  // 2) Read the local file and PUT it directly to S3.
  const res = await fetch(uri);
  const blob = await res.blob();
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);

  // 3) Return the stable public URL to store on the record.
  return fileUrl;
}
