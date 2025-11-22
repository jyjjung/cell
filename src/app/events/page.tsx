
"use client";

import { useMemo, useState, useEffect } from 'react';
import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { useEvents } from '@/hooks/use-events';
import { format, parseISO, getMonth, getYear, isBefore, startOfToday, compareAsc, compareDesc } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { categoryTextColors, categoryBackgroundColors } from '@/lib/utils';
import { Calendar as CalendarIcon, Cake, Coffee, Users, Loader2, CalendarOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const categoryIcons: { [key in EventCategory]: React.ComponentType<{ className?: string }> } = {
    [EventCategory.Event]: Users,
    [EventCategory.QT]: CalendarIcon,
    [EventCategory.Snack]: Coffee,
    [EventCategory.Birthday]: Cake,
};

export default function EventsPage() {
    const { events, loading } = useEvents();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const { upcomingEventsByMonth, pastEventsByMonth } = useMemo(() => {
        const today = startOfToday();
        const upcoming = new Map<string, AppEvent[]>();
        const past = new Map<string, AppEvent[]>();

        if (!events) return { upcomingEventsByMonth: [], pastEventsByMonth: [] };

        const sortedEvents = [...events].sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));

        for (const event of sortedEvents) {
            try {
                const eventDate = parseISO(event.date);
                const monthYearKey = format(eventDate, 'MMMM yyyy');

                if (isBefore(eventDate, today)) {
                    if (!past.has(monthYearKey)) past.set(monthYearKey, []);
                    past.get(monthYearKey)!.push(event);
                } else {
                    if (!upcoming.has(monthYearKey)) upcoming.set(monthYearKey, []);
                    upcoming.get(monthYearKey)!.push(event);
                }
            } catch (e) {
                console.error("Error processing event for event page:", event, e);
            }
        }
        
        // Past events within each month should be reverse-chronological (newest first)
        past.forEach(monthEvents => monthEvents.reverse());

        return { 
            upcomingEventsByMonth: Array.from(upcoming.entries()), 
            pastEventsByMonth: Array.from(past.entries()).reverse() // Also reverse the order of past months
        };
    }, [events]);

    const EventMonthGroup = ({ month, events }: { month: string; events: AppEvent[] }) => (
        <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <h2 className="text-xl font-bold tracking-tight mb-4">{month}</h2>
            <div className="space-y-3">
                {events.map((event) => {
                    const Icon = categoryIcons[event.category] || CalendarIcon;
                    return (
                        <Card key={event.id} className="shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-3 flex items-center space-x-4">
                                <div className={cn("p-2 rounded-full", categoryBackgroundColors[event.category])}>
                                    <Icon className={cn("h-5 w-5", categoryTextColors[event.category])} />
                                </div>
                                <div className="flex-grow">
                                    <p className="font-semibold text-foreground">{event.title}</p>
                                    <p className="text-sm text-muted-foreground">{event.category}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-sm">{format(parseISO(event.date), 'EEE')}</p>
                                    <p className="font-bold text-lg">{format(parseISO(event.date), 'd')}</p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </motion.div>
    );

    if (!isMounted || loading) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center space-x-3 mb-6">
                <CalendarIcon className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">All Events</h1>
            </div>

            <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-sm mx-auto">
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="past">Past</TabsTrigger>
                </TabsList>
                <TabsContent value="upcoming">
                    <div className="mt-6">
                        {upcomingEventsByMonth.length > 0 ? (
                            upcomingEventsByMonth.map(([month, monthEvents]) => (
                                <EventMonthGroup key={`upcoming-${month}`} month={month} events={monthEvents} />
                            ))
                        ) : (
                             <Card className="mt-6 max-w-md mx-auto">
                                <CardContent className="p-8 text-center">
                                    <CalendarOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-semibold">No Upcoming Events</h3>
                                    <p className="text-muted-foreground mt-2">Check back later for new events.</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="past">
                    <div className="mt-6">
                        {pastEventsByMonth.length > 0 ? (
                            pastEventsByMonth.map(([month, monthEvents]) => (
                                <EventMonthGroup key={`past-${month}`} month={month} events={monthEvents} />
                            ))
                        ) : (
                             <Card className="mt-6 max-w-md mx-auto">
                                <CardContent className="p-8 text-center">
                                    <CalendarOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-semibold">No Past Events</h3>
                                    <p className="text-muted-foreground mt-2">The event history is empty.</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
