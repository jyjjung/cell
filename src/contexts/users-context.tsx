"use client";

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { UserProfileData } from '@/types';
import { useAllUsersSubscription } from '@/hooks/use-all-users-subscription';

type UsersContextValue = {
  allUsers: UserProfileData[];
  usersById: Map<string, UserProfileData>;
  loading: boolean;
  error: Error | null;
  ensureUsers: (userIds: string[]) => Promise<UserProfileData[]>;
  refreshUsers: () => Promise<UserProfileData[]>;
};

const UsersContext = createContext<UsersContextValue | null>(null);

export function UsersProvider({ children }: { children: ReactNode }) {
  const { allUsers, loading, error, ensureUsers, refreshUsers } = useAllUsersSubscription();

  const usersById = useMemo(
    () => new Map(allUsers.map((u) => [u.uid, u])),
    [allUsers],
  );

  const value = useMemo(
    () => ({ allUsers, usersById, loading, error, ensureUsers, refreshUsers }),
    [allUsers, usersById, loading, error, ensureUsers, refreshUsers],
  );

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsers() {
  return useContext(UsersContext);
}

export function useAllUsers() {
  const ctx = useUsers();
  useAllUsersSubscription({ enabled: !ctx });
  if (!ctx) {
    throw new Error('useAllUsers must be used within UsersProvider');
  }
  return {
    allUsers: ctx.allUsers,
    loading: ctx.loading,
    error: ctx.error,
    ensureUsers: ctx.ensureUsers,
    refreshUsers: ctx.refreshUsers,
  };
}

export function useUsersById() {
  const ctx = useUsers();
  if (!ctx) {
    throw new Error('useUsersById must be used within UsersProvider');
  }
  return ctx.usersById;
}
