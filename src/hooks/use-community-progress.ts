"use client";

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { CommunityProgressDoc } from '@/lib/community-progress';
import {
  fetchCommunityProgressForUser,
  getCachedCommunityProgress,
  loadCommunityProgress,
} from '@/lib/community-progress';
import { COLLECTION_CACHE_TTL_MS, readLocalCollectionCache } from '@/lib/collection-cache';

const CACHE_KEY = 'community_progress_v3';

export function useCommunityProgress() {
  const { currentUser, loadingAuth } = useAuth();
  const [allProgress, setAllProgress] = useState<CommunityProgressDoc[]>(() => getCachedCommunityProgress());
  const [loading, setLoading] = useState(allProgress.length === 0);

  useEffect(() => {
    if (loadingAuth) return;

    if (!currentUser) {
      setAllProgress([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const applyRows = (rows: CommunityProgressDoc[]) => {
      if (cancelled) return;
      setAllProgress(rows);
      setLoading(false);
    };

    const cachedFresh = readLocalCollectionCache<CommunityProgressDoc[]>(CACHE_KEY, COLLECTION_CACHE_TTL_MS);
    const hasCached = getCachedCommunityProgress().length > 0;
    setLoading(!hasCached && !cachedFresh?.length);

    if (cachedFresh?.length) {
      applyRows(cachedFresh);
    } else {
      const stale = getCachedCommunityProgress();
      if (stale.length > 0) {
        applyRows(stale);
      }
      void loadCommunityProgress({ forceRefresh: true }).then(applyRows).catch((err) => {
        console.error('[useCommunityProgress] load error:', err);
        if (!cancelled) setLoading(false);
      });
    }

    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !currentUser) return;
      const fresh = readLocalCollectionCache<CommunityProgressDoc[]>(CACHE_KEY, COLLECTION_CACHE_TTL_MS);
      if (fresh?.length) return;
      void loadCommunityProgress({ forceRefresh: true }).then((rows) => {
        if (!cancelled) setAllProgress(rows);
      }).catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadingAuth, currentUser?.uid]);

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
