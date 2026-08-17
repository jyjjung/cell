import {
  getDocsFromCache,
  getDocsFromServer,
  onSnapshot,
  type DocumentData,
  type Query,
  type Unsubscribe,
} from 'firebase/firestore';

const CACHE_FALLBACK_MS = 1200;

/**
 * Listen to a query, preferring server documents.
 * Firestore IndexedDB can still contain deleted docs; treating those snapshots
 * as fresh (and writing them to localStorage) leaves one device on old data
 * across refreshes.
 */
export function subscribeQueryPreferServer<T>(
  q: Query<DocumentData>,
  mapDoc: (id: string, data: DocumentData) => T,
  onData: (data: T[], fromServer: boolean) => void,
  onError?: () => void,
): Unsubscribe {
  let cancelled = false;
  let hasServerSnapshot = false;
  let cacheFallback: ReturnType<typeof setTimeout> | undefined;
  let pendingCache: T[] | null = null;

  const publishCacheIfNeeded = () => {
    if (cancelled || hasServerSnapshot || !pendingCache) return;
    onData(pendingCache, false);
    pendingCache = null;
  };

  void getDocsFromServer(q)
    .then((snap) => {
      if (cancelled) return;
      hasServerSnapshot = true;
      if (cacheFallback) {
        clearTimeout(cacheFallback);
        cacheFallback = undefined;
      }
      pendingCache = null;
      onData(
        snap.docs.map((d) => mapDoc(d.id, d.data())),
        true,
      );
    })
    .catch(async () => {
      if (cancelled || hasServerSnapshot) return;
      try {
        const snap = await getDocsFromCache(q);
        if (cancelled || hasServerSnapshot) return;
        onData(
          snap.docs.map((d) => mapDoc(d.id, d.data())),
          false,
        );
      } catch {
        /* listener may still deliver */
      }
    });

  const unsub = onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const data = snapshot.docs.map((d) => mapDoc(d.id, d.data()));
      if (!snapshot.metadata.fromCache) {
        hasServerSnapshot = true;
        if (cacheFallback) {
          clearTimeout(cacheFallback);
          cacheFallback = undefined;
        }
        pendingCache = null;
        onData(data, true);
        return;
      }
      if (hasServerSnapshot) return;
      pendingCache = data;
      if (!cacheFallback) {
        cacheFallback = setTimeout(publishCacheIfNeeded, CACHE_FALLBACK_MS);
      }
    },
    () => onError?.(),
  );

  return () => {
    cancelled = true;
    if (cacheFallback) clearTimeout(cacheFallback);
    unsub();
  };
}
