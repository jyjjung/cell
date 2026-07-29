"use client";

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { UsersProvider } from '@/contexts/users-context';
import { NotificationsProvider } from '@/contexts/notifications-context';
import { EventsProvider } from '@/contexts/events-context';
import { ChatsProvider } from '@/contexts/chats-context';
import { BiblePlanProvider } from '@/contexts/bible-plan-context';
import { ScheduleDataProvider } from '@/contexts/schedule-data-context';
import { PrayerRequestsProvider } from '@/contexts/prayer-requests-context';

/** Shared Firestore directory providers (users, notifications, events, chats, plan, schedule). */
export function AppDataProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Keep the temporary Sentry verify page free of Firestore listeners.
  if (pathname === '/sentry-example-page') {
    return <>{children}</>;
  }

  return (
    <UsersProvider>
      <NotificationsProvider>
        <EventsProvider>
          <BiblePlanProvider>
            <ChatsProvider>
              <ScheduleDataProvider>
                <PrayerRequestsProvider>{children}</PrayerRequestsProvider>
              </ScheduleDataProvider>
            </ChatsProvider>
          </BiblePlanProvider>
        </EventsProvider>
      </NotificationsProvider>
    </UsersProvider>
  );
}
