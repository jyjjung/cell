
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
import { CalendarCheck, BookCheck, BrainCircuit, Loader2 } from 'lucide-react';
import { startOfDay, parseISO, isValid, isBefore, isSameDay, addMonths, format } from 'date-fns';
import { findTodaysReading } from '@/lib/reading-utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Accordion } from '@/components/ui/accordion';

import type { AppEvent } from '@/types';
import { Calendar } from '@/components/ui/calendar';
import { EventCategory } from '@/types';
import { cn } from '@/lib/utils';
import type { DayProps } from 'react-day-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const categoryBackgroundColors: { [key in EventCategory]: string } = {
  [EventCategory.Event]: 'bg-purple-100 dark:bg-purple-500/20',
  [EventCategory.Birthday]: 'bg-pink-100 dark:bg-pink-500/20',
  [EventCategory.QT]: 'bg-blue-100 dark:bg-blue-500/20',
  [EventCategory.Snack]: 'bg-orange-100 dark:bg-orange-500/20',
};

const categoryTextColors: { [key in EventCategory]: string } = {
  [EventCategory.Event]: 'text-purple-800 dark:text-purple-200',
  [EventCategory.Birthday]: 'text-pink-800 dark:text-pink-200',
  [EventCategory.QT]: 'text-blue-800 dark:text-blue-200',
  [EventCategory.Snack]: 'text-orange-800 dark:text-orange-200',
};

const categoryBorderColors: { [key in EventCategory]: string } = {
  [EventCategory.Event]: 'border-purple-500',
  [EventCategory.Birthday]: 'border-pink-500',
  [EventCategory.QT]: 'border-blue-500',
  [EventCategory.Snack]: 'border-orange-500',
};

export default function HomePage() {
  const { plan, loading: planLoading } = useBiblePlan();
  const { events: allEvents, loading: eventsLoading } = useEvents();
  const [isMounted, setIsMounted] = useState(false);
  const { currentUser, loadingAuth } = useAuth();
  const { completedPassages, togglePassageCompletion, markMultiplePassages, loadingChecklist } = useUserBibleChecklist();
  const { memoryVerses, loading: memoryVersesLoading } = useMemoryVerses();

  // Calendar State
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

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

  const readingsLoggedStatValue = useMemo(() => {
    if (loadingChecklist || planLoading || totalPassagesUpToToday === 0) return null; 
    return `${completedPassages.length} of ${totalPassagesUpToToday}`;
  }, [completedPassages.length, totalPassagesUpToToday, loadingChecklist, planLoading]);
  
  const upcomingEventsCount = useMemo(() => {
    if (!isMounted) return 0;
    const today = startOfDay(new Date());
    return allEvents.filter(event => {
        try {
          const eventDate = parseISO(event.date);
          return isValid(eventDate) && !isBefore(eventDate, today);
        } catch(e) { return false; }
    }).length;
  }, [allEvents, isMounted]);

  // Calendar memoized data
  const eventsByDate = useMemo(() => {
    const map = new Map<string, AppEvent[]>();
    if (!allEvents) return map;
    allEvents.forEach(event => {
      try {
        const eventDateStr = format(parseISO(event.date), 'yyyy-MM-dd');
        if (!map.has(eventDateStr)) {
          map.set(eventDateStr, []);
        }
        map.get(eventDateStr)!.push(event);
      } catch (e) {
        console.error("Error parsing event date for calendar:", event.date, e);
      }
    });
    map.forEach((dayEvents) => {
        dayEvents.sort((a,b) => a.category.localeCompare(b.category));
    });
    return map;
  }, [allEvents]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate.get(dateStr) || [];
  }, [selectedDate, eventsByDate]);

  // Custom Day for Calendar
  function CustomDay(props: DayProps) {
    const { date, displayMonth } = props;
    const isCurrentMonth = displayMonth.getMonth() === date.getMonth();
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayEvents = eventsByDate.get(dateStr) || [];
    const isToday = isSameDay(date, new Date());

    return (
      <div className={cn("relative flex h-full flex-col p-0.5 border-t border-border/80 text-[10px]",!isCurrentMonth && "bg-muted/30 text-muted-foreground/50",isSameDay(date, selectedDate || new Date(0)) && isCurrentMonth && "bg-accent")}>
        <time dateTime={format(date, 'yyyy-MM-dd')} className={cn("self-start font-semibold p-1 rounded-full", isToday && "flex h-5 w-5 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-xs")}>
          {format(date, 'd')}
        </time>
        {isCurrentMonth && dayEvents.length > 0 && (
          <div className="mt-0.5 flex-grow overflow-y-auto -mx-0.5 px-0.5 space-y-0.5 text-left">
            {dayEvents.slice(0, 2).map((event) => (
              <div key={event.id} className={cn("p-0.5 rounded-sm leading-tight truncate font-medium", categoryBackgroundColors[event.category], categoryTextColors[event.category])}>
                {event.title}
              </div>
            ))}
             {dayEvents.length > 2 && (
              <div className="text-muted-foreground pl-1 pt-0.5">+ {dayEvents.length - 2} more</div>
            )}
          </div>
        )}
      </div>
    );
  }

  const CalendarSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3"><Skeleton className="w-full aspect-video" /></div>
      <div className="lg:col-span-1"><Skeleton className="w-full h-48" /></div>
    </div>
  );


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
        <h2 className="text-3xl font-bold tracking-tight mb-6 text-center">
          Dashboard
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Upcoming Events"
            value={eventsLoading ? null : upcomingEventsCount}
            isLoading={eventsLoading}
            buttonText="View Calendar"
            buttonLink="#event-calendar-section"
            IconComponent={CalendarCheck}
          />
          {currentUser && (
            <StatCard
              title="Reading Progress"
              value={readingsLoggedStatValue}
              isLoading={loadingAuth || loadingChecklist || planLoading}
              buttonText="My Checklist"
              buttonLink="/bible-checklist"
              IconComponent={BookCheck}
              buttonDisabled={(loadingChecklist || planLoading) ? false : totalPassagesUpToToday === 0}
            />
          )}
          <StatCard
            title="Memory Verses"
            value={memoryVersesLoading ? null : memoryVerses.length}
            isLoading={memoryVersesLoading}
            buttonText="Practice Verses"
            buttonLink="/memorize"
            IconComponent={BrainCircuit}
          />
        </div>
      </section>

      <Separator />

      <section id="event-calendar-section">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-6">Event Calendar</h2>
          {eventsLoading ? <CalendarSkeleton /> : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-3">
                      <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          month={month}
                          onMonthChange={setMonth}
                          className="p-0 border rounded-md"
                          classNames={{
                              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 p-3",
                              month: "space-y-4 w-full",
                              table: "w-full border-collapse",
                              head_row: "flex border-b",
                              head_cell: "text-muted-foreground w-[14.28%] text-center font-normal text-[0.8rem] py-2",
                              row: "flex w-full",
                              cell: "h-20 w-[14.28%] p-0 [&:not(:last-child)]:border-r",
                              day_button: "h-full w-full p-0 font-normal",
                              day_selected: "", day_today: "", day_outside: "", day_disabled: "text-muted-foreground opacity-50",
                          }}
                          components={{ Day: CustomDay }}
                      />
                  </div>
                  <div className="lg:col-span-1">
                      <div className="sticky top-20">
                          <h3 className="font-semibold text-lg mb-2">{selectedDate ? format(selectedDate, "PPP") : "No date selected"}</h3>
                          <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-2 border rounded-md p-2">
                              {selectedDayEvents.length > 0 ? selectedDayEvents.map(event => (
                                  <div key={event.id} className={cn("p-2 rounded-md border-l-4", categoryBorderColors[event.category])}>
                                      <div className="flex items-start justify-between">
                                          <p className="font-semibold text-sm">{event.title}</p>
                                          <div className={cn("text-xs font-medium px-2 py-0.5 rounded-full", categoryBackgroundColors[event.category], categoryTextColors[event.category] )}>{event.category}</div>
                                      </div>
                                      {event.details && <p className="text-xs text-muted-foreground mt-1">{event.details}</p>}
                                  </div>
                              )) : (
                                  <p className="text-muted-foreground text-sm text-center py-4">No events scheduled.</p>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </section>

      <Separator />

      <section>
        <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-6">Today's Bible Reading</h2>
             <Accordion type="single" collapsible className="w-full">
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
            </Accordion>
        </div>
      </section>
    </div>
  );
}

    