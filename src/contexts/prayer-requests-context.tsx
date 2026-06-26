"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { isPrayerShepherd, PRAYER_REQUESTS_COLLECTION } from '@/lib/prayer-requests';
import type { PrayerRequest } from '@/types';

type PrayerRequestsContextValue = {
  requests: PrayerRequest[];
  loading: boolean;
  isShepherd: boolean;
};

const PrayerRequestsContext = createContext<PrayerRequestsContextValue | null>(null);

export function PrayerRequestsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const isShepherd = isPrayerShepherd(currentUser?.email);
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser || !isShepherd) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, PRAYER_REQUESTS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(100),
    );

    return onSnapshot(
      q,
      (snap) => {
        setRequests(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          } as PrayerRequest)),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [currentUser?.uid, isShepherd]);

  const value = useMemo(
    () => ({ requests, loading, isShepherd }),
    [requests, loading, isShepherd],
  );

  return <PrayerRequestsContext.Provider value={value}>{children}</PrayerRequestsContext.Provider>;
}

export function usePrayerRequestsContext() {
  return useContext(PrayerRequestsContext);
}

export function usePrayerRequestMutations() {
  const { currentUser } = useAuth();

  const submitRequest = useCallback(
    async (text: string, isAnonymous: boolean) => {
      if (!currentUser) throw new Error('Not signed in');
      const trimmed = text.trim();
      if (!trimmed) throw new Error('Please enter a prayer request');

      const displayName = [currentUser.firstName, currentUser.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();

      const docRef = await addDoc(collection(db, PRAYER_REQUESTS_COLLECTION), {
        text: trimmed,
        isAnonymous,
        submitterId: currentUser.uid,
        submitterDisplayName: isAnonymous ? null : (displayName || null),
        createdAt: serverTimestamp(),
      });

      const { notifyPrayerRequestSubmitted } = await import('@/lib/prayer-request-notify');
      void notifyPrayerRequestSubmitted({
        requestId: docRef.id,
        previewText: trimmed,
      });
    },
    [currentUser],
  );

  const updateRequest = useCallback(
    async (requestId: string, text: string, isAnonymous: boolean) => {
      if (!currentUser) throw new Error('Not signed in');
      const trimmed = text.trim();
      if (!trimmed) throw new Error('Please enter a prayer request');

      const displayName = [currentUser.firstName, currentUser.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();

      await updateDoc(doc(db, PRAYER_REQUESTS_COLLECTION, requestId), {
        text: trimmed,
        isAnonymous,
        submitterDisplayName: isAnonymous ? null : (displayName || null),
        updatedAt: serverTimestamp(),
      });
    },
    [currentUser],
  );

  const deleteRequest = useCallback(
    async (requestId: string) => {
      if (!currentUser) throw new Error('Not signed in');
      await deleteDoc(doc(db, PRAYER_REQUESTS_COLLECTION, requestId));
    },
    [currentUser],
  );

  return { submitRequest, updateRequest, deleteRequest };
}
