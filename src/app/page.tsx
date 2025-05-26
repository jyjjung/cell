
"use client";

import { useState, useMemo, useEffect } from 'react';
import EventList from '@/components/events/event-list';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useEvents } from '@/hooks/use-events';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist'; // Added
import { useAuth } from '@/contexts/auth-context'; // Added
import type { AppEvent, DailyReading } from '@/types';
import { Separator } from '@/components/ui/separator';
import { CalendarCheck, BookHeart, Loader2, ListFilter, Minimize2, Maximize2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { startOfDay, parseISO, addMonths, endOfDay, isToday } from 'date-fns';

type SortOption = "date-asc" | "date-desc" | "category" | "title";

export default function HomePage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const { events: allEvents, loading: eventsLoading } = useEvents();
  const [sortOption, setSortOption] = useState<SortOption>("date-asc");
  const [isMounted, setIsMounted] = useState(false);
  const { currentUser } = useAuth(); // Added
  const { completedPassages, togglePassageCompletion, markMultiplePassages } = useUserBibleChecklist(); // Added

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
    if (!plan?.dailyReadings) return null;
    return plan.dailyReadings.find(reading => {
      try {
        return isToday(parseISO(reading.date + 'T00:00:00Z'));
      } catch {
        return false;
      }
    });
  }, [plan]);

  const allTodaysPassageTexts = useMemo(() => {
    return todaysReadingForDisplay?.passages.map(p => p.displayText).filter(Boolean) as string[] || [];
  }, [todaysReadingForDisplay]);

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
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <div className="flex items-center space-x-3">
            <CalendarCheck className="h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Upcoming Dates</h2>
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
        <div className="flex items-center space-x-3 mb-4">
          <BookHeart className="h-7 w-7 text-accent" />
          <h2 className="text-2xl font-bold tracking-tight">Today's Bible Reading</h2>
        </div>
        {planLoading ? (
           <div className="p-6 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
              <p className="text-muted-foreground">Loading Bible reading plan...</p>
            </div>
        ) : (
          <BiblePlanDisplay
            plan={plan}
            showPlanDetails={false}
            isCompact={true}
            hideTitle={true}
            currentUser={currentUser} // Pass current user
            completedPassages={completedPassages} // Pass completed passages
            togglePassageCompletion={togglePassageCompletion} // Pass toggle function
            onToggleAllToday={markMultiplePassages} // Pass batch update function
            allTodaysPassageTexts={allTodaysPassageTexts} // Pass today's passage texts
          />
        )}
      </section>
    </div>
  );
}
