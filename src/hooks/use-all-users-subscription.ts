"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { UserProfileData } from '@/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import {
  fetchUserProfilesByIds,
  getCachedUsersDirectory,
  loadUsersDirectory,
  patchUsersDirectoryCache,
  type UserDirectoryPatch,
} from '@/lib/users-directory';
import { COLLECTION_CACHE_TTL_MS, readLocalCollectionCache } from '@/lib/collection-cache';

const USERS_COLLECTION = 'users';

type UseAllUsersOptions = {
  /** When false, return cached directory only (for components inside UsersProvider). */
  enabled?: boolean;
  /** Live listener for admin screens only — default derives from route. */
  realtime?: boolean;
};

export function useAllUsersSubscription(options: UseAllUsersOptions = {}) {
  const { enabled = true } = options;
  const { currentUser, loadingAuth } = useAuth();
  const pathname = usePathname();
  const realtime = enabled && (options.realtime ?? pathname.startsWith('/admin/users'));
  const [allUsers, setAllUsers] = useState<UserProfileData[]>(() => getCachedUsersDirectory());
  const [loading, setLoading] = useState(allUsers.length === 0);
  const [error, setError] = useState<Error | null>(null);
  const usersRef = useRef(allUsers);

  useEffect(() => {
    usersRef.current = allUsers;
  }, [allUsers]);

  useEffect(() => {
    if (!enabled || loadingAuth) return;

    if (!currentUser) {
      setAllUsers([]);
      setLoading(false);
      return;
    }

    if (realtime) {
      setLoading(true);
      const usersQuery = query(collection(db, USERS_COLLECTION));
      const unsubscribe = onSnapshot(
        usersQuery,
        (querySnapshot) => {
          const usersData = querySnapshot.docs.map(
            (docSnap) => ({ uid: docSnap.id, ...docSnap.data() } as UserProfileData),
          );
          setAllUsers(usersData);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching all users:', err);
          setError(err);
          setLoading(false);
        },
      );
      return () => unsubscribe();
    }

    let cancelled = false;
    setLoading(usersRef.current.length === 0);

    const applyUsers = (users: UserProfileData[]) => {
      if (cancelled) return;
      setAllUsers(users);
      setLoading(false);
    };

    const cachedFresh = readLocalCollectionCache<UserProfileData[]>('users_directory_v2', COLLECTION_CACHE_TTL_MS);
    if (cachedFresh?.length) {
      applyUsers(cachedFresh);
    } else {
      const stale = getCachedUsersDirectory();
      if (stale.length > 0) {
        applyUsers(stale);
      }
      void loadUsersDirectory({ forceRefresh: true }).then(applyUsers).catch((err: Error) => {
        if (cancelled) return;
        setError(err);
        setLoading(false);
      });
    }

    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !currentUser) return;
      const fresh = readLocalCollectionCache<UserProfileData[]>('users_directory_v2', COLLECTION_CACHE_TTL_MS);
      if (fresh?.length) return;
      void loadUsersDirectory({ forceRefresh: true }).then((users) => {
        if (!cancelled) setAllUsers(users);
      }).catch(() => {});
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, realtime, loadingAuth, currentUser?.uid]);

  const ensureUsers = useCallback(async (userIds: string[]) => {
    const merged = await fetchUserProfilesByIds(userIds, usersRef.current);
    setAllUsers(merged);
    return merged;
  }, []);

  const refreshUsers = useCallback(async () => {
    if (!currentUser) return usersRef.current;
    const users = await loadUsersDirectory({ forceRefresh: true });
    setAllUsers(users);
    return users;
  }, [currentUser]);

  const patchUsers = useCallback((patches: UserDirectoryPatch[]) => {
    setAllUsers(patchUsersDirectoryCache(patches));
  }, []);

  return { allUsers, loading, error, ensureUsers, refreshUsers, patchUsers };
}
