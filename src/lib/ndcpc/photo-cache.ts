'use client';

const CACHE_NAME = 'ndcpc-photo-cache-v1';

export async function getCachedPhotoBlob(url: string): Promise<Blob> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    const response = await fetch(url);
    return response.blob();
  }

  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(url);
  if (cached) {
    return cached.blob();
  }

  const response = await fetch(url);
  await cache.put(url, response.clone());
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
