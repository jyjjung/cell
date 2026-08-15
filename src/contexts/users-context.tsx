"use client";

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { UserProfileData } from '@/types';
import { useAllUsersSubscription } from '@/hooks/use-all-users-subscription';
import type { UserDirectoryPatch } from '@/lib/users-directory';

type UsersContextValue = {
  allUsers: UserProfileData[];
  usersById: Map<string, UserProfileData>;
  loading: boolean;
  error: Error | null;
  ensureUsers: (userIds: string[]) => Promise<UserProfileData[]>;
  refreshUsers: () => Promise<UserProfileData[]>;
  patchUsers: (patches: UserDirectoryPatch[]) => void;
};

const UsersContext = createContext<UsersContextValue | null>(null);

export { UsersContext };

export function UsersProvider({ children }: { children: ReactNode }) {
  const { allUsers, loading, error, ensureUsers, refreshUsers, patchUsers } = useAllUsersSubscription();

  const usersById = useMemo(
    () => new Map(allUsers.map((u) => [u.uid, u])),
    [allUsers],
  );

  const value = useMemo(
    () => ({ allUsers, usersById, loading, error, ensureUsers, refreshUsers, patchUsers }),
    [allUsers, usersById, loading, error, ensureUsers, refreshUsers, patchUsers],
  );

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

function useUsers() {
  return useContext(UsersContext);
}

export function useAllUsers() {
  const ctx = useUsers();
  // Guest / pre-session SSR (AppDataProviders not mounted yet): local subscription
  // with listeners gated on auth — never throw and crash NavPageHeader.
  const fallback = useAllUsersSubscription({ enabled: !ctx });
  if (ctx) {
    return {
      allUsers: ctx.allUsers,
      loading: ctx.loading,
      error: ctx.error,
      ensureUsers: ctx.ensureUsers,
      refreshUsers: ctx.refreshUsers,
      patchUsers: ctx.patchUsers,
    };
  }
  return fallback;
}

export function useUsersById() {
  const ctx = useUsers();
  const fallback = useAllUsersSubscription({ enabled: !ctx });
  const fallbackById = useMemo(
    () => new Map(fallback.allUsers.map((u) => [u.uid, u])),
    [fallback.allUsers],
  );
  return ctx?.usersById ?? fallbackById;
}
