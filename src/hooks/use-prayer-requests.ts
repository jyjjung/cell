"use client";

import { useCallback, useEffect, useState } from 'react';
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
import { notifyPrayerRequestSubmitted } from '@/lib/prayer-request-notify';
import {
  isPrayerShepherd,
  PRAYER_REQUESTS_COLLECTION,
} from '@/lib/prayer-requests';
import { markPrayerRequestsSeen } from '@/hooks/use-prayer-request-badge';
import type { PrayerRequest } from '@/types';

export function usePrayerRequests() {
  const { currentUser } = useAuth();
  const isShepherd = isPrayerShepherd(currentUser?.email);
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const base = collection(db, PRAYER_REQUESTS_COLLECTION);
    const q = isShepherd
      ? query(base, orderBy('createdAt', 'desc'), limit(100))
      : query(
          base,
          where('submitterId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          limit(50),
        );

    const unsubscribe = onSnapshot(
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
      (error) => {
        console.error('[usePrayerRequests]', error);
        setRequests([]);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.uid, currentUser?.email, isShepherd]);

  const markShepherdSeen = useCallback(async () => {
    if (!isShepherd || !currentUser) return;
    await markPrayerRequestsSeen(currentUser.uid);
  }, [isShepherd, currentUser]);

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

  return {
    requests,
    loading,
    isShepherd,
    markShepherdSeen,
    submitRequest,
    updateRequest,
    deleteRequest,
  };
}
