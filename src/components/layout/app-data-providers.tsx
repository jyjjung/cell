"use client";

import type { ReactNode } from 'react';
import { UsersProvider } from '@/contexts/users-context';
import { NotificationsProvider } from '@/contexts/notifications-context';
import { EventsProvider } from '@/contexts/events-context';

/** Shared Firestore directory providers (users, notifications, events). */
export function AppDataProviders({ children }: { children: ReactNode }) {
  return (
    <UsersProvider>
      <NotificationsProvider>
        <EventsProvider>{children}</EventsProvider>
      </NotificationsProvider>
    </UsersProvider>
  );
}
