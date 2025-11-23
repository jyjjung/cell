
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import StatCard from '@/components/homepage/stat-card';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useEvents } from '@/hooks/use-events';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useAuth } from '@/contexts/auth-context';
import { useMemoryVerses } from '@/hooks/use-memory-verses';
import { useNotifications } from '@/hooks/use-notifications';
import { CalendarCheck, BookCheck, BrainCircuit, Loader2, Users, Bell, X, Check } from 'lucide-react';
import { startOfDay, parseISO, isValid, isBefore, isSameDay } from 'date-fns';
import { findTodaysReading } from '@/lib/reading-utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppEvent } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import DashboardCards from '@/components/homepage/dashboard-cards';


const Section = ({ children, title, id }: { children: React.ReactNode, title: string, id: string }) => (
    <section id={id} className="py-8 md:py-12">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6 md:mb-8 text-center md:text-left">
            {title}
        </h2>
        {children}
    </section>
);


export default function HomePage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const { events: allEvents, loading: eventsLoading } = useEvents();
  const [isMounted, setIsMounted] = useState(false);
  const { currentUser, loadingAuth } = useAuth();
  const { completedPassages, togglePassageCompletion, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();
  const { memoryVerses, loading: memoryVersesLoading } = useMemoryVerses();
  const { notifications, loading: notificationsLoading, markAsRead } = useNotifications();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const unreadNotifications = useMemo(() => {
    if (!currentUser || !notifications) return [];
    return notifications.filter(n => !n.readBy.includes(currentUser.uid));
  }, [notifications, currentUser]);

  const todaysReadingForDisplay = useMemo(() => {
    if (!isMounted || !plan?.dailyReadings) return null;
    return findTodaysReading(plan.dailyReadings);
  }, [plan, isMounted]);

  const allTodaysPassageTexts = useMemo(() => {
    return todaysReadingForDisplay?.passages.map(p => p.displayText).filter(Boolean).filter(text => typeof text === 'string' && text.trim() !== '' && !text.startsWith("Error:")) as string[] || [];
  }, [todaysReadingForDisplay]);

  const totalPassagesUpToToday = useMemo(() => {
    if (!isMounted || !plan?.dailyReadings) return 0;
    const today = startOfDay(new Date());
    
    const relevantReadings = plan.dailyReadings.filter(reading => {
      try {
        const readingDate = parseISO(reading.date);
        return isValid(readingDate) && (isBefore(readingDate, today) || isSameDay(readingDate, today));
      } catch (e) {
        console.error("Error parsing reading date for progress calculation:", reading.date, e);
        return false;
      }
    });

    return relevantReadings.reduce((acc, day) => {
        if (!day || !Array.isArray(day.passages)) return acc;
        const validDayPassages = day.passages.filter(p => p && typeof p.displayText === 'string' && p.displayText.trim() !== '' && !p.displayText.startsWith("Error:"));
        return acc + validDayPassages.length;
    }, 0);
  }, [plan, isMounted]);

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 80, damping: 15 } },
  };

  const notificationItemVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, x: -50, transition: { duration: 0.2 } },
  };

  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Section id="notifications-section" title="Notifications">
        <Card>
          <CardContent className="p-4 space-y-2">
            <AnimatePresence>
            {notificationsLoading ? (
              <div className="p-4 text-center text-muted-foreground flex items-center justify-center">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading notifications...
              </div>
            ) : unreadNotifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Bell className="mx-auto h-8 w-8 mb-2" />
                You're all caught up! No new notifications.
              </div>
            ) : (
                unreadNotifications.map(notification => (
                  <motion.div
                    key={notification.id}
                    layout
                    variants={notificationItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="bg-primary/10 border-l-4 border-primary p-3 rounded-r-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm text-primary-foreground">{notification.title}</p>
                        <p className="text-sm text-primary-foreground/80">{notification.message}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary/20"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))
            )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </Section>

      <Section id="dashboard-section" title="Dashboard">
         <DashboardCards
            currentUser={currentUser}
            loadingAuth={loadingAuth}
            eventsLoading={eventsLoading}
            allEvents={allEvents}
            loadingChecklist={loadingChecklist}
            planLoading={planLoading}
            totalPassagesUpToToday={totalPassagesUpToToday}
            completedPassagesCount={completedPassages.length}
            memoryVersesLoading={memoryVersesLoading}
            memoryVersesCount={memoryVerses.length}
        />
      </Section>

      <Section id="todays-reading-section" title="Today's Bible Reading">
        <div className="max-w-2xl mx-auto">
          <motion.div variants={itemVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }}>
              <BiblePlanDisplay 
                readingToDisplay={todaysReadingForDisplay} 
                currentUser={currentUser} 
                completedPassages={completedPassages} 
                togglePassageCompletion={togglePassageCompletion} 
                onToggleAllToday={markMultiplePassages} 
                allPassageTextsForDay={allTodaysPassageTexts} 
                loading={planLoading || loadingChecklist} 
                planAvailable={!!plan && !!plan.dailyReadings && plan.dailyReadings.length > 0} 
                hidePlanMeta={true} 
                defaultOpen={true} 
                isStandalone={true} 
              />
          </motion.div>
        </div>
      </Section>
    </div>
  );
}
