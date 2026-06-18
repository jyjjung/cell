type CacheEnvelope<T> = {
  savedAt: number;
  data: T;
};

export function readLocalCollectionCache<T>(key: string, maxAgeMs: number): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed?.savedAt || parsed.data === undefined) return null;
    if (Date.now() - parsed.savedAt > maxAgeMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeLocalCollectionCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const envelope: CacheEnvelope<T> = { savedAt: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    /* quota or private mode */
  }
}

export function readLocalCollectionCacheStale<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

/** Default TTL for directory-style collections (users, events, rosters). */
export const COLLECTION_CACHE_TTL_MS = 30 * 60 * 1000;

/** Shorter TTL for notifications and announcements. */
export const NOTIFICATIONS_CACHE_TTL_MS = 5 * 60 * 1000;
