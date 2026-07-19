"use client";

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const inflight = new Map<string, Promise<Record<string, unknown> | null>>();

async function fetchDocData(collectionName: string, docId: string) {
  const key = `${collectionName}/${docId}`;
  if (!inflight.has(key)) {
    inflight.set(
      key,
      getDoc(doc(db, collectionName, docId)).then((snap) =>
        snap.exists() ? { id: snap.id, ...snap.data() } : null,
      ),
    );
  }
  return inflight.get(key)!;
}

export function useFirestoreDoc<T extends { id: string }>(
  collectionName: string,
  docId: string | null | undefined,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!docId);

  useEffect(() => {
    if (!docId) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchDocData(collectionName, docId).then((result) => {
      if (cancelled) return;
      setData(result as T | null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [collectionName, docId]);

  return { data, loading };
}
