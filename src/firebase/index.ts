'use client';

import { useMemo, useEffect, useState } from 'react';
import { db, storage } from '@/lib/firebase';
import type { Query, DocumentReference, DocumentData } from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

export function useFirestore() {
  return db;
}

export function useStorage(): FirebaseStorage {
  return storage;
}

export function useMemoFirebase<T>(factory: () => T | null, deps: unknown[]): T | null {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}

export function useCollection<T extends { id: string }>(
  query: Query | null,
  _options?: { cacheKey?: string },
) {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!query) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsub = onSnapshot(
      query,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
        setIsLoading(false);
      },
      () => {
        setData([]);
        setIsLoading(false);
      },
    );
    return unsub;
  }, [query]);

  return { data, isLoading };
}

export function useDoc<T = Record<string, unknown>>(
  docRef: DocumentReference<DocumentData> | null | undefined,
) {
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!docRef) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        setData(snap.exists() ? ({ id: snap.id, ...snap.data() } as T & { id: string }) : null);
        setIsLoading(false);
      },
      () => {
        setData(null);
        setIsLoading(false);
      },
    );
    return unsub;
  }, [docRef]);

  return { data, isLoading, error: null };
}
