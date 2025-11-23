
"use client";

import { useMemo } from 'react';
import { useEvents } from '@/hooks/use-events';
import WidgetCard from './widget-card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { isBefore, parseISO, startOfToday, isValid } from 'date-fns';
import { Loader2, Calendar, Users, Coffee, Cake, CalendarOff } from 'lucide-react';
import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import { cn } from '@/lib/utils';

const categoryIcons: { [key in EventCategory]: React.ComponentType<{ className?: string }> } = {
    [EventCategory.Event]: Users,
    [EventCategory.QT]: Calendar,
    [EventCategory.Snack]: Coffee,
    [EventCategory.Birthday]: Cake,
};

const EventItem = ({ event }: { event: AppEvent }) => {
    const Icon = categoryIcons[event.category] || Calendar;
    return (
        <div className="flex items-center space-x-3 text-sm">
            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium flex-grow truncate min-w-0">{event.title}</span>
            <span className="text-muted-foreground shrink-0">{parseISO(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}</span>
        </div>
    )
}

export default function UpcomingEventsWidget() {
    const { events, loading } = useEvents();
    const router = useRouter();
    const { setIsPageLoading } = usePageLoading();

    const upcomingEvents = useMemo(() => {
        if (!events) return [];
        const today = startOfToday();
        return events
            .filter(event => {
                try {
                    const eventDate = parseISO(event.date);
                    return isValid(eventDate) && !isBefore(eventDate, today);
                } catch {
                    return false;
                }
            })
            .slice(0, 5); // Take the next 5
    }, [events]);

    const handleGoToEvents = () => {
        setIsPageLoading(true);
        router.push('/events');
    };

    return (
        <WidgetCard
            title="Upcoming Events"
            description={upcomingEvents.length > 0 ? `Next ${upcomingEvents.length} upcoming events.` : "No upcoming events."}
            footer={
                <Button variant="outline" size="sm" className="w-full" onClick={handleGoToEvents}>
                    View All Events
                </Button>
            }
        >
            {loading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            ) : upcomingEvents.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                    <CalendarOff className="h-10 w-10 mb-2" />
                    <p className="text-sm font-medium">No events scheduled</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {upcomingEvents.map(event => (
                        <EventItem key={event.id} event={event} />
                    ))}
                </div>
            )}
        </WidgetCard>
    );
}
