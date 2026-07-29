'use client';

import type { ReactNode } from 'react';
import { UsersProvider } from '@/contexts/users-context';
import { NotificationsProvider } from '@/contexts/notifications-context';
import { EventsProvider } from '@/contexts/events-context';
import { ChatsProvider } from '@/contexts/chats-context';
import { BiblePlanProvider } from '@/contexts/bible-plan-context';
import { ScheduleDataProvider } from '@/contexts/schedule-data-context';
import { PrayerRequestsProvider } from '@/contexts/prayer-requests-context';
import { InboxProvider } from '@/contexts/inbox-context';

/** Shared Firestore directory providers (users, notifications, events, chats, plan, schedule). */
export function AppDataProviders({ children }: { children: ReactNode }) {
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
