
"use client";

import type { AppEvent } from '@/types';
import EventCard from './event-card';

interface EventListProps {
  eventsToDisplay: AppEvent[];
}

export default function EventList({ eventsToDisplay }: EventListProps) {
  if (eventsToDisplay.length === 0) {
    return (
      <div className="text-center py-6 px-4 border border-dashed rounded-lg mt-2">
        <p className="text-muted-foreground text-sm">No upcoming dates for this category.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4">
        <div className="flex gap-4 px-4 pb-4">
            {eventsToDisplay.map((event) => (
            <EventCard key={event.id} event={event} />
            ))}
        </div>
    </div>
  );
}
