'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';
import type { Resource } from '@/types/ndcpc-ported';

const IN_QUERY_CHUNK = 10;

/** One-shot fetch for setlist resource docs — no standing listener. */
export function useNdcpcResourcesByIds(ids: string[]) {
  const firestore = useFirestore();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const idsKey = ids.join(',');

  useEffect(() => {
    if (!firestore || ids.length === 0) {
      setResources([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void (async () => {
      const uniqueIds = [...new Set(ids)];
      const chunks: string[][] = [];
      for (let i = 0; i < uniqueIds.length; i += IN_QUERY_CHUNK) {
        chunks.push(uniqueIds.slice(i, i + IN_QUERY_CHUNK));
      }

      const loaded: Resource[] = [];
      try {
        for (const chunk of chunks) {
          const snap = await getDocs(
            query(
              collection(firestore, NDCPc_COLLECTIONS.resources),
              where(documentId(), 'in', chunk),
            ),
          );
          for (const docSnap of snap.docs) {
            loaded.push({ id: docSnap.id, ...docSnap.data() } as Resource);
          }
        }
        if (!cancelled) setResources(loaded);
      } catch (error) {
        console.error('Failed to load NDCPC resources:', error);
        if (!cancelled) setResources([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable key for id list
  }, [firestore, idsKey]);

  const resourceMap = useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource])),
    [resources],
  );

  return { resources, resourceMap, isLoading };
}
