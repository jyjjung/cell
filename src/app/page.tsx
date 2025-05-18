
"use client";

import { useState, useMemo, useEffect } from 'react';
import EventList from '@/components/events/event-list';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useEvents } from '@/hooks/use-events';
import type { AppEvent } from '@/types';
import { Separator } from '@/components/ui/separator';
import { CalendarCheck, BookHeart, Loader2, ListFilter, Minimize2, Maximize2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { startOfDay, parseISO } from 'date-fns';

type SortOption = "date-asc" | "date-desc" | "category" | "title";

export default function HomePage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const { events: allEvents, loading: eventsLoading } = useEvents();
  const [sortOption, setSortOption] = useState<SortOption>("date-asc");
  const [isCompactView, setIsCompactView] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const upcomingEvents = useMemo(() => {
    if (!isMounted) return []; // Prevent server/client mismatch for date comparisons
    const today = startOfDay(new Date());
    return allEvents.filter(event => {
      try {
        return parseISO(event.date) >= today;
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

  if (!isMounted) {
    // Render a simplified loading state or null during server render and initial client mount
    return (
      <div className="space-y-12">
        <section>
          <div className="flex items-center space-x-3 mb-6">
            <CalendarCheck className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold tracking-tight">Upcoming Dates</h2>
          </div>
           <Card><CardContent className="p-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary mr-2" /><p className="text-muted-foreground">Loading events...</p></CardContent></Card>
        </section>
        <Separator className="my-12" />
        <section>
          <div className="flex items-center space-x-3 mb-6">
            <BookHeart className="h-8 w-8 text-accent" />
            <h2 className="text-3xl font-bold tracking-tight">Today's Bible Reading</h2>
          </div>
          <Card><CardContent className="p-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary mr-2" /><p className="text-muted-foreground">Loading Bible reading plan...</p></CardContent></Card>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div className="flex items-center space-x-3">
            <CalendarCheck className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold tracking-tight">Upcoming Dates</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <ListFilter className="h-5 w-5 text-muted-foreground" />
              <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                  <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Switch
                id="compact-view"
                checked={isCompactView}
                onCheckedChange={setIsCompactView}
              />
              <Label htmlFor="compact-view" className="flex items-center">
                {isCompactView ? <Minimize2 className="h-5 w-5 mr-2" /> : <Maximize2 className="h-5 w-5 mr-2" />}
                Compact View
              </Label>
            </div>
          </div>
        </div>
        {eventsLoading ? (
           <Card><CardContent className="p-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary mr-2" /><p className="text-muted-foreground">Loading events...</p></CardContent></Card>
        ) : (
          <EventList eventsToDisplay={sortedEvents} isCompact={isCompactView} />
        )}
      </section>

      <Separator className="my-12" />

      <section>
        <div className="flex items-center space-x-3 mb-6">
          <BookHeart className="h-8 w-8 text-accent" />
          <h2 className="text-3xl font-bold tracking-tight">Today's Bible Reading</h2>
        </div>
        {planLoading ? (
          // No Card wrapper here, loading state is inline
           <div className="p-6 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
              <p className="text-muted-foreground">Loading Bible reading plan...</p>
            </div>
        ) : (
          <BiblePlanDisplay plan={plan} />
        )}
      </section>
    </div>
  );
}

