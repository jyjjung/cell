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

/** Fresh TTL cache; treats empty arrays as a miss so failed/cold loads retry from the server. */
export function readNonEmptyCollectionCache<T extends unknown[]>(
  key: string,
  maxAgeMs: number,
): T | null {
  const fresh = readLocalCollectionCache<T>(key, maxAgeMs);
  if (!fresh || fresh.length === 0) return null;
  return fresh;
}

const SHARED_DIRECTORY_CACHE_KEYS = [
  'users_directory_v1',
  'users_directory_v2',
  'users_directory_v3',
  'community_progress_v2',
  'community_progress_v3',
  'custom_roster_entries_v1',
] as const;

const SHARED_DIRECTORY_CACHE_PREFIXES = [
  'custom_roster_entries_v2:',
] as const;

export function clearSharedDirectoryCaches(): void {
  if (typeof window === 'undefined') return;
  for (const key of SHARED_DIRECTORY_CACHE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* private mode */
    }
  }
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (SHARED_DIRECTORY_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) localStorage.removeItem(key);
  } catch {
    /* private mode */
  }
}
