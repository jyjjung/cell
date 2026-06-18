import type { UserProfileData } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  getDocsFromCache,
  query,
} from 'firebase/firestore';
import {
  COLLECTION_CACHE_TTL_MS,
  readLocalCollectionCache,
  readLocalCollectionCacheStale,
  writeLocalCollectionCache,
} from '@/lib/collection-cache';

const USERS_COLLECTION = 'users';
const CACHE_KEY = 'users_directory_v1';

function docToUser(docSnap: { id: string; data: () => Record<string, unknown> }): UserProfileData {
  return { uid: docSnap.id, ...docSnap.data() } as UserProfileData;
}

export function getCachedUsersDirectory(): UserProfileData[] {
  return readLocalCollectionCacheStale<UserProfileData[]>(CACHE_KEY) ?? [];
}

export async function loadUsersDirectory(options?: { forceRefresh?: boolean }): Promise<UserProfileData[]> {
  if (!options?.forceRefresh) {
    const fresh = readLocalCollectionCache<UserProfileData[]>(CACHE_KEY, COLLECTION_CACHE_TTL_MS);
    if (fresh) return fresh;

    try {
      const cachedSnap = await getDocsFromCache(query(collection(db, USERS_COLLECTION)));
      if (!cachedSnap.empty) {
        const users = cachedSnap.docs.map(docToUser);
        writeLocalCollectionCache(CACHE_KEY, users);
        return users;
      }
    } catch {
      /* persistent cache not warm yet */
    }
  }

  const serverSnap = await getDocs(query(collection(db, USERS_COLLECTION)));
  const users = serverSnap.docs.map(docToUser);
  writeLocalCollectionCache(CACHE_KEY, users);
  return users;
}

export async function fetchUserProfilesByIds(
  userIds: string[],
  existing: UserProfileData[] = [],
): Promise<UserProfileData[]> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return existing;

  const byId = new Map(existing.map((u) => [u.uid, u]));
  const missing = uniqueIds.filter((id) => !byId.has(id));
  if (missing.length === 0) return existing;

  const fetched: UserProfileData[] = [];
  await Promise.all(
    missing.map(async (uid) => {
      const ref = doc(db, USERS_COLLECTION, uid);
      try {
        let snap;
        try {
          snap = await getDocFromCache(ref);
        } catch {
          snap = await getDoc(ref);
        }
        if (snap.exists()) fetched.push(docToUser(snap));
      } catch {
        /* skip missing profile */
      }
    }),
  );

  if (fetched.length === 0) return existing;

  const merged = [...existing];
  for (const user of fetched) {
    const idx = merged.findIndex((u) => u.uid === user.uid);
    if (idx >= 0) merged[idx] = user;
    else merged.push(user);
  }

  writeLocalCollectionCache(CACHE_KEY, merged);
  return merged;
}
