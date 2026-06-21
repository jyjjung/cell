"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { isPrayerShepherd, PRAYER_REQUESTS_COLLECTION } from '@/lib/prayer-requests';
import { toDateSafe } from '@/lib/firestore-timestamp';
import type { PrayerRequest } from '@/types';

/** Shepherd-only unread badge for the sidebar. */
export function usePrayerRequestBadge() {
  const { currentUser } = useAuth();
  const isShepherd = isPrayerShepherd(currentUser?.email);
  const [requests, setRequests] = useState<PrayerRequest[]>([]);

  useEffect(() => {
    if (!currentUser || !isShepherd) {
      setRequests([]);
      return;
    }

    const q = query(
      collection(db, PRAYER_REQUESTS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(100),
    );

    return onSnapshot(q, (snap) => {
      setRequests(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        } as PrayerRequest)),
      );
    });
  }, [currentUser?.uid, isShepherd]);

  const unreadCount = useMemo(() => {
    if (!isShepherd || !currentUser) return 0;
    const lastSeen = toDateSafe(currentUser.prayerRequestsLastSeenAt);
    const lastSeenMs = lastSeen?.getTime() ?? 0;

    return requests.filter((item) => {
      const createdAt = toDateSafe(item.createdAt);
      return createdAt ? createdAt.getTime() > lastSeenMs : false;
    }).length;
  }, [isShepherd, currentUser, requests]);

  return { unreadCount, isShepherd };
}

export async function markPrayerRequestsSeen(userId: string) {
  await updateDoc(doc(db, 'users', userId), {
    prayerRequestsLastSeenAt: serverTimestamp(),
  });
}
