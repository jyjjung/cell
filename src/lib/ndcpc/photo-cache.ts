'use client';

/**
 * Cache helpers for optional offline download — not used for gallery display.
 * Decoding every photo as a blob on mount OOMs Safari on large albums.
 */
const CACHE_NAME = 'ndcpc-photo-cache-v1';

export async function getCachedPhotoBlob(url: string): Promise<Blob> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Photo download failed');
    return response.blob();
  }

  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(url);
  if (cached) {
    return cached.blob();
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error('Photo download failed');
  // Only cache successful responses; avoid storing error bodies.
  try {
    await cache.put(url, response.clone());
  } catch {
    /* quota / private mode */
  }
  return response.blob();
}

export async function downloadPhoto(url: string, filename: string) {
  const blob = await getCachedPhotoBlob(url);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
