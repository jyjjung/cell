import type { Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  COLLECTION_CACHE_TTL_MS,
  readLocalCollectionCacheStale,
  readNonEmptyCollectionCache,
  writeLocalCollectionCache,
} from '@/lib/collection-cache';

const COMMUNITY_PROGRESS_COLLECTION = 'communityProgress';

/** Cap leaderboard reads — enough for typical community size without unbounded scans. */
export const COMMUNITY_PROGRESS_LEADERBOARD_LIMIT = 100;

export type CommunityProgressDoc = {
  userId: string;
  completedCount: number;
  completedPassages: string[];
  updatedAt: Timestamp;
};

const CACHE_KEY = 'community_progress_v3';

export function getCachedCommunityProgress(): CommunityProgressDoc[] {
  const cached = readLocalCollectionCacheStale<CommunityProgressDoc[]>(CACHE_KEY) ?? [];
  return cached.length > 0 ? cached : [];
}

function mergeProgressRows(
  rows: CommunityProgressDoc[],
  extra: CommunityProgressDoc | null,
): CommunityProgressDoc[] {
  if (!extra) return rows;
  if (rows.some((r) => r.userId === extra.userId)) {
    return rows.map((r) => (r.userId === extra.userId ? extra : r));
  }
  return [...rows, extra];
}

export async function loadCommunityProgress(options?: {
  forceRefresh?: boolean;
  /** Always merge this user's doc so they appear even outside the top-N query. */
  ensureUserId?: string;
}): Promise<CommunityProgressDoc[]> {
  if (!options?.forceRefresh) {
    const fresh = readNonEmptyCollectionCache<CommunityProgressDoc[]>(CACHE_KEY, COLLECTION_CACHE_TTL_MS);
    if (fresh) {
      if (!options?.ensureUserId) return fresh;
      const self = await fetchCommunityProgressForUser(options.ensureUserId);
      return mergeProgressRows(fresh, self);
    }
  }

  const serverSnap = await getDocs(
    query(
      collection(db, COMMUNITY_PROGRESS_COLLECTION),
      orderBy('completedCount', 'desc'),
      limit(COMMUNITY_PROGRESS_LEADERBOARD_LIMIT),
    ),
  );
  let rows = serverSnap.docs.map((d) => ({ userId: d.id, ...d.data() } as CommunityProgressDoc));

  if (options?.ensureUserId) {
    const self = await fetchCommunityProgressForUser(options.ensureUserId);
    rows = mergeProgressRows(rows, self);
  }

  if (rows.length > 0) {
    writeLocalCollectionCache(CACHE_KEY, rows);
  }
  return rows;
}

export async function fetchCommunityProgressForUser(userId: string): Promise<CommunityProgressDoc | null> {
  const ref = doc(db, COMMUNITY_PROGRESS_COLLECTION, userId);
  try {
    let snap;
    try {
      snap = await getDocFromServer(ref);
    } catch {
      snap = await getDoc(ref);
    }
    if (!snap.exists()) return null;
    return { userId: snap.id, ...snap.data() } as CommunityProgressDoc;
  } catch {
    return null;
  }
}

export async function syncCommunityProgress(userId: string, completedPassages: string[]): Promise<void> {
  const ref = doc(db, COMMUNITY_PROGRESS_COLLECTION, userId);
  await setDoc(
    ref,
    {
      userId,
      completedCount: completedPassages.length,
      completedPassages,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
