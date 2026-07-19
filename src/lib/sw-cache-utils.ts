/** Workbox cache names for Firebase / GCS media — preserved on app updates. */
export const MEDIA_CACHE_NAMES = new Set([
  'firebase-storage-media',
  'google-cloud-storage-media',
  'wallpaper-assets',
]);

function isMediaCacheName(name: string): boolean {
  return MEDIA_CACHE_NAMES.has(name);
}

/** Clears Next/Workbox caches but keeps offline worship & chat media. */
export async function clearAppCachesPreservingMedia(): Promise<void> {
  if (typeof caches === 'undefined') return;
  const names = await caches.keys();
  await Promise.all(
    names.filter((name) => !isMediaCacheName(name)).map((name) => caches.delete(name)),
  );
}

export async function activateWaitingServiceWorkers(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const reg of registrations) {
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    await reg.update().catch(() => undefined);
  }
}
