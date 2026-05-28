"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, collectionGroup, doc, getCountFromServer, getDoc, query, where } from 'firebase/firestore';

interface UseUserAchievementStatsResult {
  messageCount: number | null;
  feedbackCount: number | null;
  clickMeCount: number | null;
  loading: boolean;
}

export function useUserAchievementStats(userId: string | null | undefined, enabled = true): UseUserAchievementStatsResult {
  const [messageCount, setMessageCount] = useState<number | null>(null);
  const [feedbackCount, setFeedbackCount] = useState<number | null>(null);
  const [clickMeCount, setClickMeCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!enabled || !userId) {
        setMessageCount(null);
        setFeedbackCount(null);
        setClickMeCount(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const feedbackQuery = query(collection(db, 'suggestions'), where('userId', '==', userId));
        const feedbackSnapshot = await getCountFromServer(feedbackQuery);
        if (!cancelled) setFeedbackCount(feedbackSnapshot.data().count);
      } catch (error) {
        if (!cancelled) setFeedbackCount(null);
      }

      try {
        const messagesQuery = query(collectionGroup(db, 'messages'), where('senderId', '==', userId));
        const messagesSnapshot = await getCountFromServer(messagesQuery);
        if (!cancelled) setMessageCount(messagesSnapshot.data().count);
      } catch (error) {
        // Some users may not have permission to aggregate across all chats.
        if (!cancelled) setMessageCount(null);
      }

      try {
        const userSnap = await getDoc(doc(db, 'users', userId));
        if (!cancelled) {
          setClickMeCount((userSnap.data()?.clickMeCount as number | undefined) || 0);
        }
      } catch {
        if (!cancelled) setClickMeCount(null);
      }

      if (!cancelled) setLoading(false);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  return { messageCount, feedbackCount, clickMeCount, loading };
}
