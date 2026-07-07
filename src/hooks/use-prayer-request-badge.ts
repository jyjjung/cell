"use client";

import { useMemo } from 'react';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { usePrayerRequestsContext } from '@/contexts/prayer-requests-context';
import { toDateSafe } from '@/lib/firestore-timestamp';
import type { PrayerRequest } from '@/types';

/** Shepherd-only unread badge for the sidebar. */
export function usePrayerRequestBadge() {
  const { currentUser } = useAuth();
  const ctx = usePrayerRequestsContext();
  const isShepherd = ctx?.isShepherd ?? false;
  const unreadCount = useMemo(() => {
    if (!isShepherd || !currentUser) return 0;
    const requestList = ctx?.requests ?? [];
    const lastSeen = toDateSafe(currentUser.prayerRequestsLastSeenAt);
    const lastSeenMs = lastSeen?.getTime() ?? 0;

    return requestList.filter((item: PrayerRequest) => {
      const createdAt = toDateSafe(item.createdAt);
      return createdAt ? createdAt.getTime() > lastSeenMs : false;
    }).length;
  }, [isShepherd, currentUser, ctx?.requests]);

  return { unreadCount, isShepherd };
}

export async function markPrayerRequestsSeen(userId: string) {
  await updateDoc(doc(db, 'users', userId), {
    prayerRequestsLastSeenAt: serverTimestamp(),
  });
}
