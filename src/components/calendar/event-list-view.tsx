
"use client";

import { useMemo, useRef } from 'react';
import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { categoryTextColors, categoryBackgroundColors } from '@/lib/utils';
import { CalendarOff, Calendar, Cake, Coffee, Users } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

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
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const { scrollXProgress } = useScroll({ container: horizontalScrollRef });

  const upcomingEventsByCategory = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

  if (upcomingEventsByCategory.length === 0) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
            <Card className="max-w-md mx-auto">
                <CardContent className="p-8 text-center">
                    <CalendarOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold">No Upcoming Events</h3>
                    <p className="text-muted-foreground mt-2">There are no events scheduled for today or in the future.</p>
                </CardContent>
            </Card>
        </motion.div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={horizontalScrollRef}
        className="flex w-full overflow-x-auto py-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex-shrink-0 w-1/2 sm:w-1/3 md:w-1/4"></div>
        {upcomingEventsByCategory.map(([category, events], index) => {
          const Icon = categoryIcons[category] || Calendar;
          return (
            <motion.div
              key={category}
              className="w-full max-w-sm sm:max-w-md md:w-5/6 flex-shrink-0 px-4 snap-center"
              style={{
                scrollSnapAlign: 'center',
              }}
            >
              <Card className="shadow-xl overflow-hidden h-full flex flex-col">
                <CardHeader className={cn("p-4", categoryBackgroundColors[category])}>
                  <CardTitle className={cn("text-xl flex items-center gap-3", categoryTextColors[category])}>
                    <Icon className="h-6 w-6" />
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex-grow space-y-2 overflow-y-auto">
                  {events.map((event, eventIndex) => (
                    <motion.div
                      key={event.id}
                      className="flex justify-between items-center bg-background/60 p-3 rounded-lg"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: eventIndex * 0.05 }}
                      viewport={{ root: horizontalScrollRef, once: true }}
                    >
                      <span className="font-semibold text-foreground truncate pr-4">{event.title}</span>
                      <span className="text-sm text-muted-foreground whitespace-nowrap font-medium">{format(parseISO(event.date), 'MMM d, yyyy')}</span>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        <div className="flex-shrink-0 w-1/2 sm:w-1/3 md:w-1/4"></div>
      </div>
       <div className="absolute bottom-[-20px] left-0 right-0 h-2 flex justify-center items-center">
            <div className="w-1/3 max-w-xs h-1 rounded-full bg-border overflow-hidden">
                <motion.div className="h-full bg-primary rounded-full" style={{ width: '100%', scaleX: scrollXProgress }} />
            </div>
        </div>
    </div>
  );
}
