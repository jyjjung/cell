
"use client";

import { useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { format, parseISO, startOfDay, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import CalendarKey from '@/components/calendar/calendar-key';
import type { AppEvent } from '@/types';
import { categoryBackgroundColors, categoryTextColors, categoryBorderColors } from '@/lib/utils';
import { CalendarOff } from 'lucide-react';


interface MobileCalendarViewProps {
  eventsByDate: Map<string, AppEvent[]>;
}

export default function MobileCalendarView({
  eventsByDate,
}: MobileCalendarViewProps) {
  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const allFutureEvents: { date: Date, event: AppEvent }[] = [];

    eventsByDate.forEach((dayEvents) => {
        dayEvents.forEach(event => {
            try {
                const eventDate = parseISO(event.date);
                if (!isBefore(eventDate, today)) {
                    allFutureEvents.push({ date: eventDate, event });
                }
            } catch (e) {
                console.error("Error parsing event date for mobile list:", event.date, e);
            }
        });
    });

    allFutureEvents.sort((a,b) => a.date.getTime() - b.date.getTime());

    const groupedByDate = new Map<string, AppEvent[]>();
    allFutureEvents.forEach(({ event }) => {
        const dateStr = format(parseISO(event.date), 'PPP');
        if (!groupedByDate.has(dateStr)) {
            groupedByDate.set(dateStr, []);
        }
        groupedByDate.get(dateStr)!.push(event);
    });

    return Array.from(groupedByDate.entries());

  }, [eventsByDate]);


  return (
    <div className="space-y-4">
        {upcomingEvents.length > 0 ? (
            upcomingEvents.map(([dateStr, dayEvents]) => (
                <div key={dateStr}>
                    <h3 className="font-semibold text-lg mb-2 sticky top-16 bg-background py-2">{dateStr}</h3>
                    <div className="space-y-2">
                        {dayEvents.map(event => (
                             <Card key={event.id} className={cn("p-2 rounded-md border-l-4", categoryBorderColors[event.category])}>
                                <div className="flex items-start justify-between">
                                    <p className="font-semibold text-sm">{event.title}</p>
                                    <div className={cn("text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap", categoryBackgroundColors[event.category], categoryTextColors[event.category])}>
                                        {event.category}
                                    </div>
                                </div>
                                {event.details && <p className="text-xs text-muted-foreground mt-1">{event.details}</p>}
                            </Card>
                        ))}
                    </div>
                </div>
            ))
        ) : (
             <Card>
                <CardContent className="p-8 text-center">
                    <CalendarOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold">No Upcoming Events</h3>
                    <p className="text-muted-foreground mt-2">There are no events scheduled for today or in the future.</p>
                </CardContent>
            </Card>
        )}
      
      <CalendarKey />
    </div>
  );
}
