
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
import { startOfDay, endOfDay } from 'date-fns';
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

  // Effect for creating timed notifications for today's events
  useEffect(() => {
    if (!currentUser || loadingAuth) {
      return;
    }

    const checkTodaysEvents = async () => {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      
      const eventsQuery = query(
        collection(db, EVENTS_COLLECTION),
        where('date', '>=', todayStart.toISOString().split('T')[0]),
        where('date', '<=', todayEnd.toISOString())
      );

      try {
        const eventsSnapshot = await getDocs(eventsQuery);
        const todaysEvents = eventsSnapshot.docs.map(d => ({id: d.id, ...d.data()})) as AppEvent[];

        for (const event of todaysEvents) {
          // Unique identifier for this user and this event reminder
          const notificationTitle = `Reminder: ${event.title} is today!`;

          // Check if a reminder for this event has already been sent to this user
          const notificationQuery = query(
              collection(db, 'notifications'),
              where('userId', '==', currentUser.uid),
              where('type', '==', 'reminder'),
              where('title', '==', notificationTitle)
          );

          const existingNotifications = await getDocs(notificationQuery);

          if (existingNotifications.empty) {
            // No reminder found, so create one
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
    };

    checkTodaysEvents();
    
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
