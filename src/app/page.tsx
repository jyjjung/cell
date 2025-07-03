
"use client";

import { useState, useMemo, useEffect } from 'react';
import EventList from '@/components/events/event-list';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import StatCard from '@/components/homepage/stat-card';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useEvents } from '@/hooks/use-events';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useAuth } from '@/contexts/auth-context';
import { useMemoryVerses } from '@/hooks/use-memory-verses';
import { Separator } from '@/components/ui/separator';
import { CalendarCheck, BookHeart, ListFilter, BarChart2, CalendarDays, CheckCircle2, Brain, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfDay, parseISO, addMonths, endOfDay, isValid as isDateValid, isBefore, isSameDay } from 'date-fns';
import { findTodaysReading } from '@/lib/reading-utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type SortOption = "date-asc" | "date-desc" | "category" | "title";

export default function HomePage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const { events: allEvents, loading: eventsLoading } = useEvents();
  const [sortOption, setSortOption] = useState<SortOption>("date-asc");
  const [isMounted, setIsMounted] = useState(false);
  const { currentUser } = useAuth();
  const { completedPassages, togglePassageCompletion, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();
  const { memoryVerses, loading: memoryVersesLoading } = useMemoryVerses();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const upcomingEvents = useMemo(() => {
    if (!isMounted) return [];
    const today = startOfDay(new Date());
    const oneMonthFromNow = endOfDay(addMonths(today, 1));

    return allEvents.filter(event => {
      try {
        const eventDate = parseISO(event.date);
        return eventDate >= today && eventDate <= oneMonthFromNow;
      } catch (e) {
        console.error("Error parsing event date for filtering:", event.date, e);
        return false;
      }
    });
  }, [allEvents, isMounted]);

  const sortedEvents = useMemo(() => {
    let sorted = [...upcomingEvents];
    switch (sortOption) {
      case "date-asc":
        sorted.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
        break;
      case "date-desc":
        sorted.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        break;
      case "category":
        sorted.sort((a, b) => a.category.localeCompare(b.category) || (parseISO(a.date).getTime() - parseISO(b.date).getTime()));
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title) || (parseISO(a.date).getTime() - parseISO(b.date).getTime()));
        break;
    }
    return sorted;
  }, [upcomingEvents, sortOption]);

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
        return isDateValid(readingDate) && (isBefore(readingDate, today) || isSameDay(readingDate, today));
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
        <h2 className="text-3xl font-bold tracking-tight mb-6 flex items-center">
          <BarChart2 className="mr-3 h-8 w-8 text-primary" />
          App Snapshot
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Events Next 30 Days"
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
              isLoading={loadingChecklist || planLoading}
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

      <section id="upcoming-events-section">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div className="flex items-center space-x-3">
            <CalendarCheck className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold tracking-tight">Upcoming Dates</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
              <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                <SelectTrigger className="w-full sm:w-[180px] text-xs py-1.5 h-auto">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-asc" className="text-xs">Date (Oldest First)</SelectItem>
                  <SelectItem value="date-desc" className="text-xs">Date (Newest First)</SelectItem>
                  <SelectItem value="category" className="text-xs">Category</SelectItem>
                  <SelectItem value="title" className="text-xs">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {eventsLoading ? (
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-36 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <EventList eventsToDisplay={sortedEvents} isCompact={true} />
        )}
      </section>

      <Separator />

      <section>
        <div className="flex items-center space-x-3 mb-6">
          <BookHeart className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Today's Bible Reading</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
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
            <div className="flex flex-col justify-center items-start bg-card p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-2">Track Your Progress</h3>
                <p className="text-muted-foreground mb-4">
                    Log in to mark your daily readings as complete, see your progress over time, and stay motivated on your journey through the Bible.
                </p>
                <Link href="/bible-checklist" passHref legacyBehavior>
                    <Button>
                        Go to My Checklist
                    </Button>
                </Link>
            </div>
        </div>
      </section>
    </div>
  );
}
