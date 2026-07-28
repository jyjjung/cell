/**
 * Firebase Storage media caching.
 *
 * Upload paths use unique object keys (UUIDs / timestamps), so
 * `immutable` is safe. Do not use `immutable` if reusing the same path for new bytes.
 */
import { MEDIA_CACHE_NAMES } from '@/lib/sw-cache-utils';

export const STORAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** Matches Workbox `maxEntries` in next.config.js. */
const PRIMED_MAX_ENTRIES = 2500;

const PRIME_CONCURRENCY = 6;
let primeQueue: string[] = [];
let drainActive = false;

/** LRU of recently primed URLs — bounded like the service worker media cache. */
const primedLru = new Map<string, true>();
const queued = new Set<string>();

function markPrimed(url: string): void {
  if (primedLru.has(url)) {
    primedLru.delete(url);
  } else if (primedLru.size >= PRIMED_MAX_ENTRIES) {
    const oldest = primedLru.keys().next().value;
    if (oldest !== undefined) primedLru.delete(oldest);
  }
  primedLru.set(url, true);
}

function isPrimed(url: string): boolean {
  return primedLru.has(url);
}

function isFirebaseStorageMediaUrl(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url);
    if (hostname === 'firebasestorage.googleapis.com') return true;
    if (hostname === 'storage.googleapis.com') {
      return (
        pathname.includes('firebasestorage') ||
        pathname.includes('worshipChordSheets') ||
        pathname.includes('worship-sheets') ||
        pathname.includes('/avatars/') ||
        pathname.includes('/chats/')
      );
    }
    return false;
  } catch {
    return false;
  }
}

function filterFirebaseMediaUrls(urls: Iterable<string | undefined | null>): string[] {
  return [
    ...new Set(
      [...urls].filter((u): u is string => typeof u === 'string' && isFirebaseStorageMediaUrl(u)),
    ),
  ];
}

function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') return true;
  if (error instanceof Error && /quota/i.test(error.message)) return true;
  return false;
}

/** True when the URL is already in a Cache Storage bucket (e.g. Workbox media cache). */
async function isMediaCached(url: string): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    const request = new Request(url, { mode: 'cors', credentials: 'omit' });
    if (await caches.match(request)) return true;
    if (await caches.match(url)) return true;

    for (const name of MEDIA_CACHE_NAMES) {
      const cache = await caches.open(name);
      if (await cache.match(request) || (await cache.match(url))) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function countCachedMediaUrls(
  urls: Iterable<string | undefined | null>,
): Promise<{ cached: number; total: number }> {
  const unique = filterFirebaseMediaUrls(urls);
  if (unique.length === 0 || typeof caches === 'undefined') {
    return { cached: 0, total: unique.length };
  }

  const results = await Promise.all(unique.map((url) => isMediaCached(url)));
  return { cached: results.filter(Boolean).length, total: unique.length };
}

async function primeOne(url: string): Promise<void> {
  try {
    if (!(await isMediaCached(url))) {
      await fetch(url, { mode: 'cors', credentials: 'omit' });
    }
    markPrimed(url);
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

/** Warms the service worker / HTTP cache for a Firebase Storage URL (fire-and-forget). */
export function primeMediaUrl(url: string | undefined | null): void {
  if (!url || typeof window === 'undefined') return;
  if (!isFirebaseStorageMediaUrl(url)) return;
  if (isPrimed(url) || queued.has(url)) return;
  queued.add(url);
  primeQueue.push(url);
  void drainPrimeQueue();
}

export function primeMediaUrls(urls: Iterable<string | undefined | null>): void {
  for (const url of urls) primeMediaUrl(url);
}

/**
 * Warm the SW cache for chat list/album previews only.
 * Prefers thumbnails so full-resolution originals download when opened, not on scroll.
 */
export function primeChatPreviewMedia(
  items: Iterable<{ imageUrl?: string | null; imageThumbUrl?: string | null }>,
): void {
  for (const item of items) {
    primeMediaUrl(item.imageThumbUrl || item.imageUrl);
  }
}

export type OfflineCacheResult = {
  ok: number;
  failed: number;
  skipped: number;
  total: number;
  aborted: boolean;
  quotaExceeded: boolean;
};

/** Explicit offline download with progress (e.g. worship setlists). */
export async function cacheMediaUrlsForOffline(
  urls: Iterable<string | undefined | null>,
  options?: {
    onProgress?: (done: number, total: number) => void;
    signal?: AbortSignal;
  },
): Promise<OfflineCacheResult> {
  const unique = filterFirebaseMediaUrls(urls);
  const total = unique.length;
  const empty: OfflineCacheResult = {
    ok: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    aborted: false,
    quotaExceeded: false,
  };
  if (total === 0) return empty;

  let ok = 0;
  let failed = 0;
  let skipped = 0;
  let quotaExceeded = false;
  const { onProgress, signal } = options ?? {};

  const report = () => onProgress?.(ok + failed + skipped, total);

  for (let i = 0; i < unique.length; i += PRIME_CONCURRENCY) {
    if (signal?.aborted) {
      return { ok, failed, skipped, total, aborted: true, quotaExceeded };
    }

    const batch = unique.slice(i, i + PRIME_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (url) => {
        if (signal?.aborted) return 'aborted' as const;
        try {
          if (await isMediaCached(url)) {
            markPrimed(url);
            return 'skipped' as const;
          }
          const res = await fetch(url, {
            mode: 'cors',
            credentials: 'omit',
            signal,
          });
          if (res.ok) {
            markPrimed(url);
            return 'ok' as const;
          }
          return 'failed' as const;
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') return 'aborted' as const;
          if (isQuotaExceededError(e)) return 'quota' as const;
          return 'failed' as const;
        }
      }),
    );

    if (results.some((r) => r === 'aborted')) {
      return { ok, failed, skipped, total, aborted: true, quotaExceeded };
    }

    for (const r of results) {
      if (r === 'ok') ok++;
      else if (r === 'skipped') skipped++;
      else if (r === 'quota') {
        quotaExceeded = true;
        failed++;
      } else failed++;
    }
    report();
  }

  return { ok, failed, skipped, total, aborted: false, quotaExceeded };
}
