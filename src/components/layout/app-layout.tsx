
"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Header from './header';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/hooks/use-notifications';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { startOfDay, endOfDay, addDays, isBefore, isSameDay, isValid, parseISO, getDay, subDays, isAfter } from 'date-fns';
import type { AppEvent } from '@/types';

const EVENTS_COLLECTION = 'events';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setIsPageLoading } = usePageLoading();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const { currentUser, loadingAuth } = useAuth();
  const { notifications, createNotification, markAsRead } = useNotifications();
  const { plan: currentGlobalPlan, loading: planLoading } = useBiblePlan();
  const { completedPassages, loadingChecklist } = useUserBibleChecklist();


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
  
  // Effect for auto-marking past event notifications as read
  useEffect(() => {
    if (!currentUser || notifications.length === 0) return;

    const unreadReminders = notifications.filter(n =>
      (n.type === 'reminder' || n.type === 'event') &&
      !n.readBy.includes(currentUser.uid) &&
      n.relatedUrl?.includes('/events#')
    );

    if (unreadReminders.length === 0) return;

    const checkAndMarkPastEventNotifs = async () => {
      const eventIdsToFetch = unreadReminders.map(n => n.relatedUrl!.split('#')[1]).filter(Boolean);
      if (eventIdsToFetch.length === 0) return;

      try {
        const eventsQuery = query(collection(db, EVENTS_COLLECTION), where(documentId(), 'in', eventIdsToFetch));
        const eventSnapshots = await getDocs(eventsQuery);
        const fetchedEvents = new Map<string, AppEvent>();
        eventSnapshots.forEach(doc => {
          fetchedEvents.set(doc.id, { id: doc.id, ...doc.data() } as AppEvent);
        });

        const today = startOfDay(new Date());
        const notificationsToMarkRead: string[] = [];

        unreadReminders.forEach(notification => {
          const eventId = notification.relatedUrl!.split('#')[1];
          const event = fetchedEvents.get(eventId);
          if (event) {
            try {
              const eventDate = parseISO(event.date);
              if (isValid(eventDate) && isBefore(eventDate, today)) {
                notificationsToMarkRead.push(notification.id);
              }
            } catch (e) {
              console.error(`Error parsing date for event ${event.id}:`, event.date, e);
            }
          }
        });

        if (notificationsToMarkRead.length > 0) {
          const markPromises = notificationsToMarkRead.map(id => markAsRead(id));
          await Promise.all(markPromises);
        }
      } catch (error) {
        console.error("Error auto-marking past event notifications:", error);
      }
    };

    checkAndMarkPastEventNotifs();
  }, [notifications, currentUser, markAsRead]);


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
  
    // Effect for creating reading progress notifications
    useEffect(() => {
        if (loadingAuth || planLoading || loadingChecklist || !currentUser || !currentGlobalPlan?.dailyReadings) {
            return;
        }

        const today = startOfDay(new Date());
        const isSunday = getDay(today) === 0;

        const passagesToToday = (currentGlobalPlan.dailyReadings || [])
            .filter(r => {
                try {
                    return isValid(parseISO(r.date)) && (isBefore(parseISO(r.date), today) || isSameDay(parseISO(r.date), today));
                } catch { return false; }
            })
            .flatMap(r => r.passages)
            .map(p => p.displayText)
            .filter(Boolean);

        if (passagesToToday.length === 0) return;
        const completedToDateCount = passagesToToday.filter(p => completedPassages.includes(p)).length;
        const isBehind = completedToDateCount < passagesToToday.length;
        const isCaughtUp = !isBehind;
        
        // --- Logic for when the user was previously caught up but now isn't ---
        const yesterday = subDays(today, 1);
        const passagesToYesterday = (currentGlobalPlan.dailyReadings || [])
             .filter(r => {
                try {
                     return isValid(parseISO(r.date)) && (isBefore(parseISO(r.date), yesterday) || isSameDay(parseISO(r.date), yesterday));
                } catch { return false; }
            })
            .flatMap(r => r.passages)
            .map(p => p.displayText)
            .filter(Boolean);
        const completedToYesterdayCount = passagesToYesterday.filter(p => completedPassages.includes(p)).length;
        const wasCaughtUpYesterday = passagesToYesterday.length > 0 && completedToYesterdayCount === passagesToYesterday.length;
        
        // --- Check existing notifications from the last week ---
        const sixDaysAgo = subDays(today, 6);
        const hasRecentBehindNotification = notifications.some(n => 
            n.userId === currentUser.uid &&
            n.type === 'reading_progress' &&
            n.title === "Catch up on your reading" &&
            isAfter(n.createdAt.toDate(), sixDaysAgo)
        );
        const hasRecentCaughtUpNotification = notifications.some(n => 
            n.userId === currentUser.uid &&
            n.type === 'reading_progress' &&
            n.title === "All Caught Up!" &&
            isAfter(n.createdAt.toDate(), sixDaysAgo)
        );

        // --- Notification Logic ---
        if (isBehind) {
            // Scenario 1: Weekly Sunday catch-up reminder
            if (isSunday && !hasRecentBehindNotification) {
                createNotification({
                    title: "Catch up on your reading",
                    message: "You have some past Bible readings that are not yet completed.",
                    type: 'reading_progress', isGlobal: false, userId: currentUser.uid, relatedUrl: '/bible-checklist'
                });
            }
            // Scenario 2: User was caught up yesterday but is behind today
            else if (wasCaughtUpYesterday && !isSunday && !hasRecentBehindNotification) {
                 createNotification({
                    title: "Catch up on your reading",
                    message: "You have some past Bible readings that are not yet completed.",
                    type: 'reading_progress', isGlobal: false, userId: currentUser.uid, relatedUrl: '/bible-checklist'
                });
            }
        } 
        else if (isCaughtUp && !hasRecentCaughtUpNotification) {
            // Scenario 3: User is all caught up, send a positive notification
            createNotification({
                title: "All Caught Up!",
                message: "Great job! You've completed all your Bible readings to date.",
                type: 'reading_progress', isGlobal: false, userId: currentUser.uid, relatedUrl: '/bible-checklist'
            });
        }

    }, [currentUser, loadingAuth, currentGlobalPlan, planLoading, completedPassages, loadingChecklist, notifications, createNotification]);


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
