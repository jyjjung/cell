
"use client";

import { useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { format, parseISO, startOfDay, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CalendarKey from '@/components/calendar/calendar-key';
import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { categoryBackgroundColors, categoryTextColors, categoryBorderColors } from '@/lib/utils';
import { CalendarOff, Calendar, Cake, Coffee, Users } from 'lucide-react';


interface MobileCalendarViewProps {
  eventsByDate: Map<string, AppEvent[]>;
}

const categoryOrder = [
    EventCategory.Event,
    EventCategory.QT,
    EventCategory.Snack,
    EventCategory.Birthday,
];

const categoryIcons: { [key in EventCategory]: React.ComponentType<{ className?: string }> } = {
    [EventCategory.Event]: Users,
    [EventCategory.QT]: Calendar,
    [EventCategory.Snack]: Coffee,
    [EventCategory.Birthday]: Cake,
};

export default function MobileCalendarView({
  eventsByDate,
}: MobileCalendarViewProps) {
  const upcomingEventsByCategory = useMemo(() => {
    const today = startOfDay(new Date());
    const groupedByCategory = new Map<EventCategory, AppEvent[]>();

    // Initialize map with all categories to maintain order
    categoryOrder.forEach(cat => groupedByCategory.set(cat, []));

    eventsByDate.forEach((dayEvents) => {
        dayEvents.forEach(event => {
            try {
                const eventDate = parseISO(event.date);
                if (!isBefore(eventDate, today)) {
                    const categoryEvents = groupedByCategory.get(event.category);
                    if (categoryEvents) {
                        categoryEvents.push(event);
                    }
                }
            } catch (e) {
                console.error("Error parsing event date for mobile list:", event.date, e);
            }
        });
    });

    // Sort events within each category
    groupedByCategory.forEach((events) => {
        events.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    });

    return Array.from(groupedByCategory.entries()).filter(([_, events]) => events.length > 0);

  }, [eventsByDate]);


  return (
    <div className="space-y-6">
        {upcomingEventsByCategory.length > 0 ? (
            upcomingEventsByCategory.map(([category, events]) => {
                 const Icon = categoryIcons[category] || Calendar;
                 return (
                    <Card key={category} className="shadow-md border-l-4" style={{ borderLeftColor: `var(--${category.toLowerCase()}-border-color)` }}>
                        <CardHeader className="p-3">
                            <CardTitle className="text-lg flex items-center">
                               <Icon className={cn("h-5 w-5 mr-2", categoryTextColors[category])} />
                               {category}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 text-sm">
                           <div className="space-y-1.5">
                            {events.map(event => (
                                <div key={event.id} className="flex justify-between items-center bg-background/50 p-2 rounded-md">
                                    <span className="font-medium">{event.title}</span>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">{format(parseISO(event.date), 'MMM d')}</span>
                                </div>
                            ))}
                           </div>
                        </CardContent>
                    </Card>
                 )
            })
        ) : (
             <Card>
                <CardContent className="p-8 text-center">
                    <CalendarOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold">No Upcoming Events</h3>
                    <p className="text-muted-foreground mt-2">There are no events scheduled for today or in the future.</p>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
