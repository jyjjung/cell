"use client";

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { UserProfileData } from '@/types';
import { useAllUsersSubscription } from '@/hooks/use-all-users-subscription';

type UsersContextValue = {
  allUsers: UserProfileData[];
  usersById: Map<string, UserProfileData>;
  loading: boolean;
  error: Error | null;
};

const UsersContext = createContext<UsersContextValue | null>(null);

export function UsersProvider({ children }: { children: ReactNode }) {
  const { allUsers, loading, error } = useAllUsersSubscription();

  const usersById = useMemo(
    () => new Map(allUsers.map((u) => [u.uid, u])),
    [allUsers],
  );

  const value = useMemo(
    () => ({ allUsers, usersById, loading, error }),
    [allUsers, usersById, loading, error],
  );

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsers() {
  return useContext(UsersContext);
}

/** Prefer shared provider; falls back to a local subscription outside the provider tree. */
export function useAllUsers() {
  const ctx = useUsers();
  const fallback = useAllUsersSubscription(!ctx);
  if (ctx) {
    return {
      allUsers: ctx.allUsers,
      loading: ctx.loading,
      error: ctx.error,
    };
  }
  return fallback;
}

export function useUsersById() {
  const ctx = useUsers();
  const fallback = useAllUsersSubscription(!ctx);
  const usersById = useMemo(
    () => new Map(fallback.allUsers.map((u) => [u.uid, u])),
    [fallback.allUsers],
  );
  return ctx?.usersById ?? usersById;
}
