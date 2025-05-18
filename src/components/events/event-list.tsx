"use client";

import { useEvents } from '@/hooks/use-events';
import EventCard from './event-card';
import { ListOrdered } from 'lucide-react';

export default function EventList() {
  const { events } = useEvents();

  if (events.length === 0) {
    return (
      <div className="text-center py-10">
        <ListOrdered className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-lg">No upcoming events.</p>
        <p className="text-sm text-muted-foreground">Admin can add events in the dashboard.</p>
      </div>
    );
  }

  // Events are pre-sorted in useEvents hook
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
