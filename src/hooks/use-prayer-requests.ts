"use client";

import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import {
  isPrayerShepherd,
  PRAYER_REQUESTS_COLLECTION,
} from '@/lib/prayer-requests';
import { markPrayerRequestsSeen } from '@/hooks/use-prayer-request-badge';
import {
  usePrayerRequestMutations,
  usePrayerRequestsContext,
} from '@/contexts/prayer-requests-context';
import type { PrayerRequest } from '@/types';

export function usePrayerRequests() {
  const { currentUser } = useAuth();
  const ctx = usePrayerRequestsContext();
  const isShepherd = isPrayerShepherd(currentUser?.email);
  const [localRequests, setLocalRequests] = useState<PrayerRequest[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const { submitRequest, updateRequest, deleteRequest } = usePrayerRequestMutations();

  useEffect(() => {
    if (isShepherd) {
      if (!ctx) {
        setLocalRequests([]);
        setLocalLoading(false);
      }
      return;
    }

    if (!currentUser?.uid) {
      setLocalRequests([]);
      setLocalLoading(false);
      return;
    }

    setLocalLoading(true);
    const q = query(
      collection(db, PRAYER_REQUESTS_COLLECTION),
      where('submitterId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setLocalRequests(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          } as PrayerRequest)),
        );
        setLocalLoading(false);
      },
      (error) => {
        console.error('[usePrayerRequests]', error);
        setLocalRequests([]);
        setLocalLoading(false);
      },
    );

    return () => unsubscribe();
  }, [ctx, currentUser?.uid, isShepherd]);

  const requests = isShepherd ? (ctx?.requests ?? []) : localRequests;
  const loading = isShepherd ? (ctx?.loading ?? false) : localLoading;

  const markShepherdSeen = useCallback(async () => {
    if (!isShepherd || !currentUser) return;
    await markPrayerRequestsSeen(currentUser.uid);
  }, [isShepherd, currentUser]);

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
