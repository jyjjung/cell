
"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Header from './header';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/hooks/use-notifications';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import type { AppEvent } from '@/types';

const EVENTS_COLLECTION = 'events';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setIsPageLoading } = usePageLoading();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const { currentUser, loadingAuth } = useAuth();
  const { createNotification } = useNotifications();


  useEffect(() => {
    // Read the initial state from cookies to prevent flash of wrong state
    const getInitialSidebarState = () => {
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('sidebar_state='))
        ?.split('=')[1];
      return cookieValue ? cookieValue === 'true' : true;
    };
    setIsSidebarOpen(getInitialSidebarState());
    setHasMounted(true);
  }, []);


  useEffect(() => {
    // Hide the loader whenever the path changes
    setIsPageLoading(false);
  }, [pathname, setIsPageLoading]);

  // Effect for creating timed notifications for events
  useEffect(() => {
    if (!currentUser || loadingAuth) {
      return;
    }

    const checkEventReminders = async () => {
      // --- Check for Today's Events ---
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();
      
      const todaysEventsQuery = query(
        collection(db, EVENTS_COLLECTION),
        where('date', '>=', todayStart),
        where('date', '<=', todayEnd)
      );

      try {
        const todaysEventsSnapshot = await getDocs(todaysEventsQuery);
        const todaysEvents = todaysEventsSnapshot.docs.map(d => ({id: d.id, ...d.data()})) as AppEvent[];

        for (const event of todaysEvents) {
          const notificationTitle = `Reminder: ${event.category} - ${event.title}`;

          const notificationQuery = query(
              collection(db, 'notifications'),
              where('userId', '==', currentUser.uid),
              where('type', '==', 'reminder'),
              where('title', '==', notificationTitle)
          );
          const existingNotifications = await getDocs(notificationQuery);

          if (existingNotifications.empty) {
            await createNotification({
              title: notificationTitle,
              message: 'This event is scheduled for today.',
              type: 'reminder',
              isGlobal: false,
              userId: currentUser.uid,
              relatedUrl: `/events#${event.id}`
            });
          }
        }
      } catch (error) {
        console.error("Failed to check for today's events:", error);
      }

      // --- Check for Events One Week Away ---
      const oneWeekFromNowStart = startOfDay(addDays(new Date(), 7)).toISOString();
      const oneWeekFromNowEnd = endOfDay(addDays(new Date(), 7)).toISOString();

      const weekAwayEventsQuery = query(
        collection(db, EVENTS_COLLECTION),
        where('date', '>=', oneWeekFromNowStart),
        where('date', '<=', oneWeekFromNowEnd)
      );

      try {
        const weekAwayEventsSnapshot = await getDocs(weekAwayEventsQuery);
        const weekAwayEvents = weekAwayEventsSnapshot.docs.map(d => ({id: d.id, ...d.data()})) as AppEvent[];

        for (const event of weekAwayEvents) {
          const notificationTitle = `Heads up: ${event.category} - ${event.title}`;

          const notificationQuery = query(
              collection(db, 'notifications'),
              where('userId', '==', currentUser.uid),
              where('type', '==', 'reminder'),
              where('title', '==', notificationTitle)
          );
          const existingNotifications = await getDocs(notificationQuery);
          
          if (existingNotifications.empty) {
            await createNotification({
              title: notificationTitle,
              message: `This event is scheduled for next week.`,
              type: 'reminder',
              isGlobal: false,
              userId: currentUser.uid,
              relatedUrl: `/events#${event.id}`
            });
          }
        }
      } catch (error) {
        console.error("Failed to check for week-away events:", error);
      }

    };

    checkEventReminders();
    
  }, [currentUser, loadingAuth, createNotification]);
  
  if (!hasMounted) {
    // Render nothing or a skeleton loader until the client-side state is determined
    // to prevent hydration mismatch.
    return (
        <SidebarProvider defaultOpen={true}>
            <Sidebar />
            <SidebarInset className="min-w-0">
                <Header />
                <main className="flex-1">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        {children}
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <Sidebar />
      <SidebarInset className="min-w-0">
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
