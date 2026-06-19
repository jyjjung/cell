import type { Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  getDocsFromCache,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  COLLECTION_CACHE_TTL_MS,
  readLocalCollectionCache,
  readLocalCollectionCacheStale,
  writeLocalCollectionCache,
} from '@/lib/collection-cache';

export const COMMUNITY_PROGRESS_COLLECTION = 'communityProgress';

export type CommunityProgressDoc = {
  userId: string;
  completedCount: number;
  completedPassages: string[];
  updatedAt: Timestamp;
};

const CACHE_KEY = 'community_progress_v2';

export function getCachedCommunityProgress(): CommunityProgressDoc[] {
  const cached = readLocalCollectionCacheStale<CommunityProgressDoc[]>(CACHE_KEY) ?? [];
  return cached.length > 0 ? cached : [];
}

export async function loadCommunityProgress(options?: { forceRefresh?: boolean }): Promise<CommunityProgressDoc[]> {
  if (!options?.forceRefresh) {
    const fresh = readLocalCollectionCache<CommunityProgressDoc[]>(CACHE_KEY, COLLECTION_CACHE_TTL_MS);
    if (fresh && fresh.length > 0) return fresh;

    try {
      const cachedSnap = await getDocsFromCache(query(collection(db, COMMUNITY_PROGRESS_COLLECTION)));
      if (!cachedSnap.empty) {
        const rows = cachedSnap.docs.map((d) => ({ userId: d.id, ...d.data() } as CommunityProgressDoc));
        writeLocalCollectionCache(CACHE_KEY, rows);
        return rows;
      }
    } catch {
      /* persistent cache not warm yet */
    }
  }

  const serverSnap = await getDocs(query(collection(db, COMMUNITY_PROGRESS_COLLECTION)));
  const rows = serverSnap.docs.map((d) => ({ userId: d.id, ...d.data() } as CommunityProgressDoc));
  writeLocalCollectionCache(CACHE_KEY, rows);
  return rows;
}

export async function fetchCommunityProgressForUser(userId: string): Promise<CommunityProgressDoc | null> {
  const ref = doc(db, COMMUNITY_PROGRESS_COLLECTION, userId);
  try {
    let snap;
    try {
      snap = await getDocFromCache(ref);
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
