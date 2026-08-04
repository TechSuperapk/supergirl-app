/**
 * removeBgService — server-side background removal for wardrobe photos.
 * Supports remove.bg (default) or ClipDrop, selected via REMOVEBG_PROVIDER.
 *
 * Input:  a publicly reachable image URL (the freshly-uploaded original).
 * Output: a transparent PNG as a base64 string, which the RN client then
 *         uploads to Firebase Storage as the item's `transparent` image.
 *
 * Returning base64 (rather than uploading here) keeps storage ownership on the
 * client — the app already owns the Firebase Storage upload path.
 */
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

// Background removal is image processing on the provider's side — slow by
// nature. Downloading the source from S3 should be quick by comparison.
const REMOVE_BG_TIMEOUT_MS = 25_000;
const SOURCE_IMAGE_TIMEOUT_MS = 10_000;

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(SOURCE_IMAGE_TIMEOUT_MS) });
  if (!res.ok) throw new AppError(400, `Could not fetch source image (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function viaRemoveBg(imageUrl: string): Promise<Buffer> {
  if (!env.removeBgApiKey) throw new AppError(503, 'remove.bg is not configured on the server');
  const form = new URLSearchParams();
  form.set('image_url', imageUrl);
  form.set('size', 'auto');
  form.set('format', 'png');
  const res = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': env.removeBgApiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    signal: AbortSignal.timeout(REMOVE_BG_TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new AppError(502, `remove.bg error ${res.status}: ${detail.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function viaClipDrop(imageUrl: string): Promise<Buffer> {
  if (!env.clipdropApiKey) throw new AppError(503, 'ClipDrop is not configured on the server');
  // ClipDrop wants the raw image file in multipart form-data.
  const src = await fetchImageBuffer(imageUrl);
  const form = new FormData();
  form.append('image_file', new Blob([src]), 'image.jpg');
  const res = await fetch('https://clipdrop-api.co/remove-background/v1', {
    method: 'POST',
    headers: { 'x-api-key': env.clipdropApiKey },
    body: form as any,
    signal: AbortSignal.timeout(REMOVE_BG_TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new AppError(502, `ClipDrop error ${res.status}: ${detail.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Removes the background and returns a `data:image/png;base64,...` string. */
export async function removeBackground(imageUrl: string): Promise<string> {
  const png = env.removeBgProvider === 'clipdrop'
    ? await viaClipDrop(imageUrl)
    : await viaRemoveBg(imageUrl);
  return `data:image/png;base64,${png.toString('base64')}`;
}
