
"use client";

import type { AppEvent } from '@/types';
import EventCard from './event-card';
import { ListOrdered } from 'lucide-react';

interface EventListProps {
  eventsToDisplay: AppEvent[];
  isCompact: boolean;
}

export default function EventList({ eventsToDisplay, isCompact }: EventListProps) {
  if (eventsToDisplay.length === 0) {
    return (
      <div className="text-center py-10">
        <ListOrdered className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-lg">No upcoming events.</p>
        <p className="text-sm text-muted-foreground">Admin can add events in the dashboard.</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${isCompact ? 'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
      {eventsToDisplay.map((event) => (
        <EventCard key={event.id} event={event} isCompact={isCompact} />
      ))}
    </div>
  );
}

