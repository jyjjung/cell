
"use client";

import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import EventListItem from './event-list-item';
import { Skeleton } from '@/components/ui/skeleton';
import { Info } from 'lucide-react';

interface UpcomingEventsDisplayProps {
  events: AppEvent[];
  loading: boolean;
}

const CategoryHeader = ({ title }: { title: string }) => (
    <h3 className="text-lg font-semibold tracking-tight my-4">{title}</h3>
);

const EventListSkeleton = () => (
    <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-start space-x-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 w-16 text-center space-y-1">
                    <Skeleton className="h-5 w-10 mx-auto" />
                    <Skeleton className="h-8 w-14 mx-auto" />
                </div>
                <div className="flex-grow pt-1 space-y-2">
                    <div className="flex items-center space-x-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-6 w-32" />
                    </div>
                    <Skeleton className="h-4 w-20 ml-11" />
                </div>
            </div>
        ))}
    </div>
);

export default function UpcomingEventsDisplay({ events, loading }: UpcomingEventsDisplayProps) {
  if (loading) {
    return (
        <div className="space-y-8">
            <div>
                <Skeleton className="h-7 w-48 mb-4" />
                <EventListSkeleton />
            </div>
             <div>
                <Skeleton className="h-7 w-32 mb-4" />
                <EventListSkeleton />
            </div>
        </div>
    );
  }

  const categorizedEvents = {
    events: events.filter(e => e.category === EventCategory.Event || e.category === EventCategory.Birthday),
    qts: events.filter(e => e.category === EventCategory.QT),
    snacks: events.filter(e => e.category === EventCategory.Snack),
  };

  const hasEvents = categorizedEvents.events.length > 0;
  const hasQTs = categorizedEvents.qts.length > 0;
  const hasSnacks = categorizedEvents.snacks.length > 0;
  
  if (!hasEvents && !hasQTs && !hasSnacks) {
    return (
        <div className="text-center py-10 px-4 border border-dashed rounded-lg mt-4 flex flex-col items-center justify-center">
            <Info className="h-8 w-8 text-muted-foreground mb-2"/>
            <p className="text-muted-foreground">No upcoming dates scheduled.</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      {hasEvents && (
        <div id="events-birthdays-section">
          <CategoryHeader title="Events & Birthdays" />
          <div className="mt-4 divide-y divide-border rounded-lg border">
            {categorizedEvents.events.map(event => <EventListItem key={event.id} event={event} />)}
          </div>
        </div>
      )}

      {hasQTs && (
        <div id="qt-section">
            <CategoryHeader title="QT Schedule" />
            <div className="mt-4 divide-y divide-border rounded-lg border">
                {categorizedEvents.qts.map(event => <EventListItem key={event.id} event={event} />)}
            </div>
        </div>
      )}

      {hasSnacks && (
        <div id="snack-section">
            <CategoryHeader title="Snacks" />
            <div className="mt-4 divide-y divide-border rounded-lg border">
                {categorizedEvents.snacks.map(event => <EventListItem key={event.id} event={event} />)}
            </div>
        </div>
      )}
    </div>
  );
}
