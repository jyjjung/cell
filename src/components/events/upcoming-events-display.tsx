
"use client";

import { useMemo } from 'react';
import type { AppEvent } from '@/types';
import EventListItem from './event-list-item';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, CalendarDays } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { startOfWeek, endOfWeek, parseISO, format, isValid } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface UpcomingEventsDisplayProps {
  events: AppEvent[];
  loading: boolean;
}

interface WeeklyEventGroup {
  weekKey: string;
  startDate: Date;
  endDate: Date;
  events: AppEvent[];
}

const EventListSkeleton = () => (
    <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
    </div>
);

export default function UpcomingEventsDisplay({ events, loading }: UpcomingEventsDisplayProps) {
  const weeklyGroupedEvents = useMemo((): WeeklyEventGroup[] => {
    if (!events) return [];

    const weeksMap = new Map<string, AppEvent[]>();

    for (const event of events) {
      try {
        const date = parseISO(event.date);
        if (!isValid(date)) continue;
        
        const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
        const weekKey = format(weekStart, 'yyyy-MM-dd');

        if (!weeksMap.has(weekKey)) {
          weeksMap.set(weekKey, []);
        }
        weeksMap.get(weekKey)!.push(event);
      } catch (e) {
        console.error("[UpcomingEventsDisplay] Error processing event for week grouping:", event, e);
      }
    }

    return Array.from(weeksMap.entries())
      .map(([weekKey, weeklyEvents]) => {
        const weekStartDate = parseISO(weekKey);
        const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 0 });
        
        return {
          weekKey,
          startDate: weekStartDate,
          endDate: weekEndDate,
          events: weeklyEvents.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()),
        };
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  }, [events]);


  if (loading) {
    return <EventListSkeleton />;
  }
  
  if (weeklyGroupedEvents.length === 0) {
    return (
        <div className="text-center py-10 px-4 border border-dashed rounded-lg mt-4 flex flex-col items-center justify-center">
            <Info className="h-8 w-8 text-muted-foreground mb-2"/>
            <p className="text-muted-foreground">No upcoming dates scheduled.</p>
        </div>
    );
  }

  return (
    <div className="space-y-3">
        <Accordion type="single" collapsible className="w-full space-y-2">
            {weeklyGroupedEvents.map((week) => (
                <AccordionItem value={week.weekKey} key={week.weekKey} className="border-b-0">
                    <Card className="bg-card/90 rounded-lg shadow-sm w-full transition-colors duration-200">
                        <AccordionTrigger className="p-4 hover:no-underline w-full">
                           <div className="flex items-center space-x-3">
                                <CalendarDays className="h-6 w-6 text-primary" />
                                <div className="text-left">
                                     <CardTitle className="text-lg">{`${format(week.startDate, 'MMM d')} - ${format(week.endDate, 'd, yyyy')}`}</CardTitle>
                                </div>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <div className="divide-y divide-border border-t">
                                {week.events.map(event => <EventListItem key={event.id} event={event} />)}
                            </div>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            ))}
        </Accordion>
    </div>
  );
}
