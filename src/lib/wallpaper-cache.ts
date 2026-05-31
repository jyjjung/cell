/**
 * Original lake wallpaper paths (root-level assets in /public/wallpapers/).
 */
export const SCENIC_WALLPAPER_URLS = [
  '/wallpapers/light-dawn.svg',
  '/wallpapers/light-morning.svg',
  '/wallpapers/light-afternoon.svg',
  '/wallpapers/light-sunset.svg',
  '/wallpapers/dark-thunder-clouds.svg',
  '/wallpapers/dark-rain.svg',
  '/wallpapers/dark-thunder.svg',
  '/wallpapers/dark-moon-clear.svg',
] as const;

export const WALLPAPER_CACHE_NAME = 'wallpaper-assets';

const PRIME_CONCURRENCY = 4;
let primeQueue: string[] = [];
let drainActive = false;
const primed = new Set<string>();
const queued = new Set<string>();

export function isWallpaperUrl(url: string): boolean {
  return url.startsWith('/wallpapers/') && url.endsWith('.svg');
}

export async function isWallpaperCached(url: string): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    if (await caches.match(url)) return true;
    const cache = await caches.open(WALLPAPER_CACHE_NAME);
    return !!(await cache.match(url));
  } catch {
    return false;
  }
}

async function primeOne(url: string): Promise<void> {
  try {
    if (!(await isWallpaperCached(url))) {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (res.ok && typeof caches !== 'undefined') {
        const cache = await caches.open(WALLPAPER_CACHE_NAME);
        await cache.put(url, res);
      }
    }
    primed.add(url);
  } catch {
    /* best-effort */
  } finally {
    queued.delete(url);
  }
}

async function drainPrimeQueue(): Promise<void> {
  if (drainActive) return;
  drainActive = true;
  try {
    while (primeQueue.length > 0) {
      const batch = primeQueue.splice(0, PRIME_CONCURRENCY);
      await Promise.all(batch.map((url) => primeOne(url)));
    }
  } finally {
    drainActive = false;
  }
}

export function primeWallpaperUrls(urls: Iterable<string>): void {
  if (typeof window === 'undefined') return;
  for (const url of urls) {
    if (!isWallpaperUrl(url) || primed.has(url) || queued.has(url)) continue;
    queued.add(url);
    primeQueue.push(url);
  }
  void drainPrimeQueue();
}

export function primeAllScenicWallpapers(): void {
  primeWallpaperUrls(SCENIC_WALLPAPER_URLS);
}

export async function cacheScenicWallpapersForOffline(): Promise<void> {
  primeAllScenicWallpapers();
  for (const url of SCENIC_WALLPAPER_URLS) {
    if (primed.has(url)) continue;
    try {
      if (await isWallpaperCached(url)) {
        primed.add(url);
        continue;
      }
      const res = await fetch(url, { credentials: 'same-origin' });
      if (res.ok && typeof caches !== 'undefined') {
        const cache = await caches.open(WALLPAPER_CACHE_NAME);
        await cache.put(url, res);
      }
      primed.add(url);
    } catch {
      /* best-effort */
    }
  }
}
