"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import type { UserProfileData } from '@/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import {
  fetchUserProfilesByIds,
  getCachedUsersDirectory,
  loadUsersDirectory,
} from '@/lib/users-directory';

const USERS_COLLECTION = 'users';

type UseAllUsersOptions = {
  /** When false, return cached directory only (for components inside UsersProvider). */
  enabled?: boolean;
  /** Live listener for admin screens only — default derives from route. */
  realtime?: boolean;
};

export function useAllUsersSubscription(options: UseAllUsersOptions = {}) {
  const { enabled = true } = options;
  const pathname = usePathname();
  const realtime = enabled && (options.realtime ?? pathname.startsWith('/admin'));
  const [allUsers, setAllUsers] = useState<UserProfileData[]>(() => getCachedUsersDirectory());
  const [loading, setLoading] = useState(allUsers.length === 0);
  const [error, setError] = useState<Error | null>(null);
  const usersRef = useRef(allUsers);

  useEffect(() => {
    usersRef.current = allUsers;
  }, [allUsers]);

  useEffect(() => {
    if (!enabled) return;

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

    void loadUsersDirectory().then((users) => {
      if (cancelled) return;
      setAllUsers(users);
      setLoading(false);
    }).catch((err: Error) => {
      if (cancelled) return;
      setError(err);
      setLoading(false);
    });

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void loadUsersDirectory().then((users) => {
        if (!cancelled) setAllUsers(users);
      }).catch(() => {});
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, realtime]);

  const ensureUsers = useCallback(async (userIds: string[]) => {
    const merged = await fetchUserProfilesByIds(userIds, usersRef.current);
    setAllUsers(merged);
    return merged;
  }, []);

  const refreshUsers = useCallback(async () => {
    const users = await loadUsersDirectory({ forceRefresh: true });
    setAllUsers(users);
    return users;
  }, []);

  return { allUsers, loading, error, ensureUsers, refreshUsers };
}
