import type { BibleTextVersion } from '@/lib/bible-versions';
import { BIBLE_BOOKS_DATA, CANONICAL_BIBLE_ORDER } from '@/lib/bible-data';

const BIBLE_PASSAGE_CACHE = 'bible-passage-responses';
const memoryCache = new Map<string, string>();

function cacheKey(passage: string, version: BibleTextVersion): string {
  return `${version}::${passage.trim().toLowerCase()}`;
}

function apiUrl(passage: string, version: BibleTextVersion): string {
  return `/api/bible?passage=${encodeURIComponent(passage)}&version=${version}`;
}

export function readCachedPassageHtml(passage: string, version: BibleTextVersion): string | null {
  const key = cacheKey(passage, version);
  return memoryCache.get(key) ?? null;
}

async function readFromCacheStorage(passage: string, version: BibleTextVersion): Promise<string | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(BIBLE_PASSAGE_CACHE);
    const response = await cache.match(apiUrl(passage, version));
    if (!response?.ok) return null;
    const data = (await response.json()) as { html?: string };
    if (!data.html) return null;
    const key = cacheKey(passage, version);
    memoryCache.set(key, data.html);
    return data.html;
  } catch {
    return null;
  }
}

async function writeToCacheStorage(passage: string, version: BibleTextVersion, response: Response): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(BIBLE_PASSAGE_CACHE);
    await cache.put(apiUrl(passage, version), response.clone());
  } catch {
    /* best-effort */
  }
}

export type BiblePassageFetchResult = {
  html: string;
  fromCache: boolean;
};

/** Fetch passage HTML with in-memory + Cache Storage layers for offline re-reads. */
export async function fetchPassageHtml(
  passage: string,
  version: BibleTextVersion,
  signal?: AbortSignal,
): Promise<BiblePassageFetchResult> {
  const key = cacheKey(passage, version);
  const cached = memoryCache.get(key) ?? (await readFromCacheStorage(passage, version));
  if (cached) {
    return { html: cached, fromCache: true };
  }

  const response = await fetch(apiUrl(passage, version), { signal });
  const data = (await response.json()) as { html?: string; error?: string };

  if (!response.ok || !data.html) {
    throw new Error(data.error || 'Failed to load passage');
  }

  memoryCache.set(key, data.html);
  void writeToCacheStorage(
    passage,
    version,
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  return { html: data.html, fromCache: false };
}

function allChapterPassages(): string[] {
  const passages: string[] = [];
  for (const book of CANONICAL_BIBLE_ORDER) {
    const meta = BIBLE_BOOKS_DATA[book];
    if (!meta) continue;
    for (let chapter = 1; chapter <= meta.chapters; chapter += 1) {
      passages.push(`${book} ${chapter}`);
    }
  }
  return passages;
}

/** Prefetch every chapter for a Bible version into memory + Cache Storage. */
export async function prefetchBibleVersion(
  version: BibleTextVersion,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const passages = allChapterPassages();
  const batchSize = 6;

  for (let i = 0; i < passages.length; i += batchSize) {
    if (options?.signal?.aborted) return;
    const batch = passages.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (passage) => {
        if (readCachedPassageHtml(passage, version)) return;
        try {
          await fetchPassageHtml(passage, version, options?.signal);
        } catch {
          /* best-effort background prefetch */
        }
      }),
    );
  }
}
