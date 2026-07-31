'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { UsersProvider } from '@/contexts/users-context';
import { NotificationsProvider } from '@/contexts/notifications-context';
import { EventsProvider } from '@/contexts/events-context';
import { ChatsProvider } from '@/contexts/chats-context';
import { BiblePlanProvider } from '@/contexts/bible-plan-context';
import { ScheduleDataProvider } from '@/contexts/schedule-data-context';
import { PrayerRequestsProvider } from '@/contexts/prayer-requests-context';
import { InboxProvider } from '@/contexts/inbox-context';

/**
 * Shared Firestore directory providers.
 * Mounted only after a Firebase session exists so guest/marketing routes skip
 * the provider tree and listener setup on the critical path.
 */
export function AppDataProviders({ children }: { children: ReactNode }) {
  const { hasSession } = useAuth();

  if (!hasSession) {
    return children;
  }

  return (
    <UsersProvider>
      <NotificationsProvider>
        <InboxProvider>
          <EventsProvider>
            <BiblePlanProvider>
              <ChatsProvider>
                <ScheduleDataProvider>
                  <PrayerRequestsProvider>{children}</PrayerRequestsProvider>
                </ScheduleDataProvider>
              </ChatsProvider>
            </BiblePlanProvider>
          </EventsProvider>
        </InboxProvider>
      </NotificationsProvider>
    </UsersProvider>
  );
}
