/**
 * imageUtils.ts
 *
 * Utilities for image compression, caching, and optimized display.
 * Uses expo-image-manipulator for resizing/compression.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem        from 'expo-file-system/legacy';

// ── Compression presets ───────────────────────────────────────────────────────
export type CompressionPreset = 'avatar' | 'post' | 'clothing' | 'board' | 'thumbnail';

const PRESETS: Record<CompressionPreset, { width: number; quality: number }> = {
  avatar:    { width: 400,  quality: 0.85 },
  post:      { width: 1080, quality: 0.80 },
  clothing:  { width: 800,  quality: 0.85 },
  board:     { width: 1200, quality: 0.80 },
  thumbnail: { width: 400,  quality: 0.75 },
};

/**
 * Compress and resize a local image URI.
 * Returns a new local URI with the compressed image.
 */
export async function compressImage(
  uri:    string,
  preset: CompressionPreset = 'post',
): Promise<string> {
  const { width, quality } = PRESETS[preset];

  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width } }],
      {
        compress: quality,
        format:   ImageManipulator.SaveFormat.JPEG,
        base64:   false,
      },
    );
    return result.uri;
  } catch (err) {
    console.warn('[imageUtils] Compression failed, using original:', err);
    return uri;
  }
}

/**
 * Generate a thumbnail from a local image.
 */
export async function generateThumbnail(uri: string): Promise<string> {
  return compressImage(uri, 'thumbnail');
}

// ── Cache management ──────────────────────────────────────────────────────────
const CACHE_DIR = `${FileSystem.cacheDirectory}supergirl_images/`;

async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

/**
 * Download and cache a remote image URL.
 * Returns the local cached URI (fast on subsequent calls).
 */
export async function getCachedImage(url: string): Promise<string> {
  if (!url || url.startsWith('file://') || url.startsWith('ph://')) return url;

  await ensureCacheDir();

  // Use a hash of the URL as filename
  const fileName = url
    .replace(/[^a-zA-Z0-9]/g, '_')
    .slice(-60) + '.jpg';
  const localPath = `${CACHE_DIR}${fileName}`;

  const info = await FileSystem.getInfoAsync(localPath);
  if (info.exists) return localPath;

  try {
    const download = await FileSystem.downloadAsync(url, localPath);
    return download.uri;
  } catch {
    return url; // Fall back to remote URL
  }
}

/**
 * Clear the image cache directory.
 */
export async function clearImageCache(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }
  } catch (err) {
    console.warn('[imageUtils] Could not clear cache:', err);
  }
}

/**
 * Get cache size in MB.
 */
export async function getImageCacheSize(): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (info.exists) {
      const size = (info as any).size ?? 0;
      return Math.round((size / (1024 * 1024)) * 100) / 100;
    }
  } catch {}
  return 0;
}

// ── URL helpers ───────────────────────────────────────────────────────────────
/**
 * Build a Firebase Storage download URL with a size suffix
 * if your storage rules allow direct URL construction.
 * (Use with Cloud Functions or imgix for production transforms.)
 */
export function getResizedImageUrl(
  originalUrl: string,
  width:       number,
): string {
  // If using Firebase Extensions (Resize Images), the URLs follow this pattern:
  // original: .../avatar.jpg
  // resized:  .../avatar_400x400.jpg
  // This is a simple approximation — adjust based on your storage setup.
  if (!originalUrl || !originalUrl.includes('firebasestorage')) return originalUrl;
  const ext  = originalUrl.split('.').pop()?.split('?')[0] ?? 'jpg';
  const base = originalUrl.replace(`.${ext}`, '');
  return `${base}_${width}x${width}.${ext}`;
}

// ── Blurhash placeholder ──────────────────────────────────────────────────────
/**
 * A set of generic blurhash placeholders by dominant color.
 * Used as placeholder while images load.
 */
export const BLURHASH_PLACEHOLDERS = {
  warm:    'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
  cool:    'L8F5?xYk^6#M@-5c,1J5@[or[Q6.',
  neutral: 'LFE{pLj[~p%g?wIUWBt6t7ofM{%M',
} as const;
