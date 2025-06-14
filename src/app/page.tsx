
"use client";

import { useState, useMemo, useEffect } from 'react';
import EventList from '@/components/events/event-list';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import StatCard from '@/components/homepage/stat-card'; // Added
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useEvents } from '@/hooks/use-events';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import { useAuth } from '@/contexts/auth-context';
import { useMemoryVerses } from '@/hooks/use-memory-verses'; // Added
import type { AppEvent, DailyReading } from '@/types';
import { Separator } from '@/components/ui/separator';
import { CalendarCheck, BookHeart, Loader2, ListFilter, BarChart2, CalendarDays, CheckCircle2, Brain, Info, BookOpenCheck } from 'lucide-react'; // Added icons
import { Card, CardContent, CardHeader } from '@/components/ui/card'; // Added CardHeader
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfDay, parseISO, addMonths, endOfDay, isToday, getDay, isSameDay } from 'date-fns';
import { findTodaysReading, findNextUnreadReading } from '@/lib/reading-utils';

type SortOption = "date-asc" | "date-desc" | "category" | "title";

export default function HomePage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const { events: allEvents, loading: eventsLoading } = useEvents();
  const [sortOption, setSortOption] = useState<SortOption>("date-asc");
  const [isMounted, setIsMounted] = useState(false);
  const { currentUser } = useAuth();
  const { completedPassages, togglePassageCompletion, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();
  const { memoryVerses, loading: memoryVersesLoading } = useMemoryVerses(); // Added

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
    return todaysReadingForDisplay?.passages.map(p => p.displayText).filter(Boolean) as string[] || [];
  }, [todaysReadingForDisplay]);


  const nextUnreadReadingForDisplay = useMemo(() => {
    if (!isMounted || !currentUser || !plan?.dailyReadings || completedPassages.length === undefined || planLoading || loadingChecklist) {
      return null; 
    }
    return findNextUnreadReading(plan.dailyReadings, completedPassages);
  }, [plan, completedPassages, currentUser, isMounted, planLoading, loadingChecklist]);


  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading page content...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section id="stats-section">
        <h2 className="text-2xl font-bold tracking-tight mb-4 flex items-center">
          <BarChart2 className="mr-3 h-7 w-7 text-primary" />
          App Snapshot
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              value={loadingChecklist ? null : completedPassages.length}
              isLoading={loadingChecklist}
              buttonText="My Checklist"
              buttonLink="/bible-checklist"
              IconComponent={CheckCircle2}
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <div className="flex items-center space-x-3">
            <CalendarCheck className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Upcoming Dates (Next 30 Days)</h2>
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
           <Card><CardContent className="p-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary mr-2" /><p className="text-muted-foreground">Loading events...</p></CardContent></Card>
        ) : (
          <EventList eventsToDisplay={sortedEvents} isCompact={true} />
        )}
      </section>

      <Separator className="my-8" />

      <section>
        <BiblePlanDisplay
          readingToDisplay={todaysReadingForDisplay}
          displayTitle="Today's Bible Reading"
          currentUser={currentUser}
          completedPassages={completedPassages}
          togglePassageCompletion={togglePassageCompletion}
          onToggleAllToday={markMultiplePassages}
          allPassageTextsForDay={allTodaysPassageTexts}
          loading={planLoading || loadingChecklist}
          planAvailable={!!plan && !!plan.dailyReadings && plan.dailyReadings.length > 0}
          planDescription={plan?.planDescription}
          generatedDate={plan?.generatedDate}
        />
      </section>
      
      <Separator className="my-8" />

      {currentUser && (planLoading || loadingChecklist || (plan && plan.dailyReadings && plan.dailyReadings.length > 0)) && (
        <section>
          {planLoading || loadingChecklist ? (
             <Card className="mt-0 shadow-lg bg-card/80">
                <CardHeader className="p-2">
                  <div className="flex items-center space-x-3">
                    <BookHeart className="h-7 w-7 text-accent" />
                    <h2 className="text-xl font-bold tracking-tight">Your Next Reading</h2>
                  </div>
                </CardHeader>
                <CardContent className="p-6 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                  <p className="text-muted-foreground">Loading next reading...</p>
                </CardContent>
              </Card>
          ) : nextUnreadReadingForDisplay ? (
            <BiblePlanDisplay
              readingToDisplay={nextUnreadReadingForDisplay}
              displayTitle="Your Next Reading"
              currentUser={currentUser}
              completedPassages={completedPassages}
              togglePassageCompletion={togglePassageCompletion}
              onToggleAllToday={markMultiplePassages}
              allPassageTextsForDay={nextUnreadReadingForDisplay.passages.map(p => p.displayText).filter(Boolean) as string[]}
              loading={false} // Data is already determined
              planAvailable={true} // If we have a next unread, plan is available
              planDescription={plan?.planDescription}
              generatedDate={plan?.generatedDate}
            />
          ) : plan && plan.dailyReadings && plan.dailyReadings.length > 0 ? (
            <Card className="mt-0 shadow-lg bg-card/80">
              <CardHeader className="p-2">
                <div className="flex items-center space-x-3">
                  <BookOpenCheck className="h-7 w-7 text-green-500" />
                  <h2 className="text-xl font-bold tracking-tight">Your Next Reading</h2>
                </div>
              </CardHeader>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">You're all caught up with the current plan!</p>
              </CardContent>
            </Card>
          ) : (
             <Card className="mt-0 shadow-lg bg-card/80">
              <CardHeader className="p-2">
                <div className="flex items-center space-x-3">
                  <Info className="h-7 w-7 text-muted-foreground" />
                  <h2 className="text-xl font-bold tracking-tight">Your Next Reading</h2>
                </div>
              </CardHeader>
              <CardContent className="p-6 text-center">
                 <p className="text-muted-foreground">No Bible reading plan is currently active.</p>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
