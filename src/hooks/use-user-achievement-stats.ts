"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface UseUserAchievementStatsResult {
  feedbackCount: number | null;
  clickMeCount: number | null;
  loading: boolean;
}

function countsFromProfile(data?: {
  feedbackCount?: number;
  clickMeCount?: number;
}) {
  return {
    feedbackCount: data?.feedbackCount ?? 0,
    clickMeCount: data?.clickMeCount ?? 0,
  };
}

export function useUserAchievementStats(userId: string | null | undefined, enabled = true): UseUserAchievementStatsResult {
  const { currentUser } = useAuth();
  const [feedbackCount, setFeedbackCount] = useState<number | null>(null);
  const [clickMeCount, setClickMeCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const isSelf = !!userId && userId === currentUser?.uid;

  useEffect(() => {
    if (!enabled || !userId) {
      setFeedbackCount(null);
      setClickMeCount(null);
      setLoading(false);
      return;
    }

    if (isSelf && currentUser) {
      setFeedbackCount(currentUser.feedbackCount ?? 0);
      setClickMeCount(currentUser.clickMeCount ?? 0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void getDoc(doc(db, 'users', userId))
      .then((snap) => {
        if (cancelled) return;
        const counts = countsFromProfile(snap.exists() ? snap.data() : undefined);
        setFeedbackCount(counts.feedbackCount);
        setClickMeCount(counts.clickMeCount);
      })
      .catch(() => {
        if (!cancelled) {
          setFeedbackCount(null);
          setClickMeCount(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    userId,
    isSelf,
    currentUser?.feedbackCount,
    currentUser?.clickMeCount,
    currentUser,
  ]);

  return { feedbackCount, clickMeCount, loading };
}
