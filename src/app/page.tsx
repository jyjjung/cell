"use client";

import { useState, useMemo, useEffect } from 'react';
import UpcomingEventsDisplay from '@/components/events/upcoming-events-display';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import StatCard from '@/components/homepage/stat-card';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useEvents } from '@/hooks/use-events';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useAuth } from '@/contexts/auth-context';
import { useMemoryVerses } from '@/hooks/use-memory-verses';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, CheckCircle2, Brain, Loader2 } from 'lucide-react';
import { startOfDay, parseISO, isValid, isBefore, isSameDay } from 'date-fns';
import { findTodaysReading } from '@/lib/reading-utils';
import MusicPlayer from '@/components/homepage/music-player';

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

  const upcomingEvents = useMemo(() => {
    if (!isMounted) return [];
    const today = startOfDay(new Date());
    return allEvents
      .filter(event => {
        try {
          const eventDate = parseISO(event.date);
          return isValid(eventDate) && !isBefore(eventDate, today);
        } catch (e) {
          console.error("Error parsing event date for filtering:", event.date, e);
          return false;
        }
      })
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [allEvents, isMounted]);

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

  const readingsLoggedStatValue = useMemo(() => {
    if (loadingChecklist || planLoading || totalPassagesUpToToday === 0) return null; 
    return `${completedPassages.length} of ${totalPassagesUpToToday}`;
  }, [completedPassages.length, totalPassagesUpToToday, loadingChecklist, planLoading]);

  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading page content...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section id="stats-section">
        <h2 className="text-3xl font-bold tracking-tight mb-6">
          App Snapshot
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Upcoming Events"
            value={eventsLoading ? null : upcomingEvents.length}
            isLoading={eventsLoading}
            buttonText="View Details"
            buttonLink="#upcoming-events-section"
            IconComponent={CalendarDays}
          />
          {currentUser && (
            <StatCard
              title="Readings Logged"
              value={readingsLoggedStatValue}
              isLoading={loadingAuth || loadingChecklist || planLoading}
              buttonText="My Checklist"
              buttonLink="/bible-checklist"
              IconComponent={CheckCircle2}
              buttonDisabled={(loadingChecklist || planLoading) ? false : totalPassagesUpToToday === 0}
            />
          )}
          <StatCard
            title="Memory Verses"
            value={memoryVersesLoading ? null : memoryVerses.length}
            isLoading={memoryVersesLoading}
            buttonText="Practice Now"
            buttonLink="/memorize"
            IconComponent={Brain}
          />
        </div>
      </section>

      <Separator />

      <section id="upcoming-events-section" className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Upcoming Dates</h2>
        <UpcomingEventsDisplay events={upcomingEvents} loading={eventsLoading} />
      </section>

      <Separator />

      <section id="music-player-section">
        <MusicPlayer />
      </section>

      <Separator />

      <section>
        <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-6">Today's Bible Reading</h2>
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
            />
        </div>
      </section>
    </div>
  );
}
