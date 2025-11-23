
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import StatCard from '@/components/homepage/stat-card';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useEvents } from '@/hooks/use-events';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useAuth } from '@/contexts/auth-context';
import { useMemoryVerses } from '@/hooks/use-memory-verses';
import { CalendarCheck, BookCheck, BrainCircuit, Loader2, Users, Bell } from 'lucide-react';
import { startOfDay, parseISO, isValid, isBefore, isSameDay } from 'date-fns';
import { findTodaysReading } from '@/lib/reading-utils';
import { motion, useInView } from 'framer-motion';
import type { AppEvent } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
          <CardContent className="p-6 text-center text-muted-foreground">
            <Bell className="mx-auto h-8 w-8 mb-2" />
            You have no new notifications.
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
