
"use client";

import { useMemo, useRef, useState, useEffect } from 'react';
import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { categoryTextColors, categoryBackgroundColors } from '@/lib/utils';
import { CalendarOff, Calendar, Cake, Coffee, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';

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

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  useEffect(() => {
    const scrollEl = scrollContainerRef.current;

    const checkArrows = () => {
      if (!scrollEl) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollEl;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1); // -1 for pixel rounding
    };

    checkArrows(); // Initial check

    scrollEl?.addEventListener('scroll', checkArrows);
    window.addEventListener('resize', checkArrows);

    return () => {
      scrollEl?.removeEventListener('scroll', checkArrows);
      window.removeEventListener('resize', checkArrows);
    };
  }, [upcomingEventsByCategory]); // Re-check when data changes

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
  };

  if (upcomingEventsByCategory.length === 0) {
    return (
        <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
                <Card className="max-w-md mx-auto">
                    <CardContent className="p-8 text-center">
                        <CalendarOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">No Upcoming Events</h3>
                        <p className="text-muted-foreground mt-2">There are no events scheduled for today or in the future.</p>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
  }

  return (
    <div className="relative w-full group">
        <div
            ref={scrollContainerRef}
            className="flex gap-4 sm:gap-6 w-full mx-auto pb-4 overflow-x-auto snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
            {upcomingEventsByCategory.map(([category, events], index) => {
            const Icon = categoryIcons[category] || Calendar;
            return (
                <motion.div
                key={category}
                className="flex-shrink-0 snap-start w-[85vw] max-w-72"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true, amount: 0.3 }}
                >
                <Card className="shadow-lg overflow-hidden h-full flex flex-col">
                    <CardHeader className={cn("p-2", categoryBackgroundColors[category])}>
                    <CardTitle className={cn("text-base flex items-center gap-3", categoryTextColors[category])}>
                        <Icon className="h-5 w-5" />
                        {category}
                    </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 flex-grow overflow-y-auto max-h-[60vh]">
                      <div className="flex flex-col">
                        {events.map((event, eventIndex) => (
                            <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: eventIndex * 0.05 }}
                            viewport={{ once: true }}
                            >
                              {eventIndex > 0 && <Separator className="my-1" />}
                              <div className="flex justify-between items-center py-1">
                                <span className="font-semibold text-sm text-foreground truncate pr-4">{event.title}</span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">{format(parseISO(event.date), 'dd/MM')}</span>
                              </div>
                            </motion.div>
                        ))}
                      </div>
                    </CardContent>
                </Card>
                </motion.div>
            );
            })}
        </div>
        
        {showLeftArrow && (
            <Button 
                variant="outline" 
                size="icon" 
                onClick={scrollLeft}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background/70 hover:bg-background"
            >
                <ChevronLeft className="h-6 w-6" />
            </Button>
        )}
        {showRightArrow && (
            <Button 
                variant="outline" 
                size="icon" 
                onClick={scrollRight}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background/70 hover:bg-background"
            >
                <ChevronRight className="h-6 w-6" />
            </Button>
        )}
    </div>
  );
}
