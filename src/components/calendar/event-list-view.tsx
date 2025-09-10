
"use client";

import { useMemo } from 'react';
import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { categoryTextColors, categoryBackgroundColors } from '@/lib/utils';
import { CalendarOff, Calendar, Cake, Coffee, Users } from 'lucide-react';

interface EventListViewProps {
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

export default function EventListView({ eventsByDate }: EventListViewProps) {
  const upcomingEventsByCategory = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const groupedByCategory = new Map<EventCategory, AppEvent[]>();
    categoryOrder.forEach(cat => groupedByCategory.set(cat, []));

    eventsByDate.forEach((dayEvents) => {
        dayEvents.forEach(event => {
            try {
                const eventDate = parseISO(event.date);
                if (eventDate >= today) {
                    const categoryEvents = groupedByCategory.get(event.category);
                    if (categoryEvents) {
                        categoryEvents.push(event);
                    }
                }
            } catch (e) {
                console.error("Error parsing event date for list view:", event.date, e);
            }
        });
    });

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
                    <Card key={category} className="shadow-md overflow-hidden">
                        <CardHeader className={cn("p-3", categoryBackgroundColors[category])}>
                            <CardTitle className={cn("text-lg flex items-center", categoryTextColors[category])}>
                               <Icon className="h-5 w-5 mr-2" />
                               {category}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 text-sm">
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
