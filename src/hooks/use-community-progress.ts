"use client";

import { useCallback, useEffect, useState } from 'react';
import type { CommunityProgressDoc } from '@/lib/community-progress';
import {
  fetchCommunityProgressForUser,
  getCachedCommunityProgress,
  loadCommunityProgress,
} from '@/lib/community-progress';

export function useCommunityProgress() {
  const [allProgress, setAllProgress] = useState<CommunityProgressDoc[]>(() => getCachedCommunityProgress());
  const [loading, setLoading] = useState(allProgress.length === 0);

  useEffect(() => {
    let cancelled = false;
    setLoading(allProgress.length === 0);

    void loadCommunityProgress().then((rows) => {
      if (!cancelled) {
        setAllProgress(rows);
        setLoading(false);
      }
    });

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void loadCommunityProgress().then((rows) => {
        if (!cancelled) setAllProgress(rows);
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const refresh = useCallback(async () => {
    const rows = await loadCommunityProgress({ forceRefresh: true });
    setAllProgress(rows);
    return rows;
  }, []);

  return { allProgress, loading, refresh };
}

export function useMemberCommunityProgress(userId: string | undefined) {
  const [progress, setProgress] = useState<CommunityProgressDoc | null>(null);
  const [loading, setLoading] = useState(!!userId);

  useEffect(() => {
    if (!userId) {
      setProgress(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchCommunityProgressForUser(userId).then((row) => {
      if (!cancelled) {
        setProgress(row);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { progress, loading };
}
