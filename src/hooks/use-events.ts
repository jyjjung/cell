"use client";

import { useCallback } from 'react';
import type { AppEvent } from '@/types';
import { EventCategory } from '@/types';
import useLocalStorage from './use-local-storage';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

// Ensure uuid is installed if not already: npm install uuid @types/uuid
// It might be better to use crypto.randomUUID() if environments support it broadly
// For this scaffold, assuming uuid is fine. If not, will adjust.

const EVENTS_STORAGE_KEY = 'cell_dates_events';

const initialEvents: AppEvent[] = [
  // Sample data can be added here if needed for initial setup
  // { id: uuidv4(), date: new Date(2024, 6, 20).toISOString(), category: EventCategory.Event, title: "Summer BBQ", details: "Community gathering at the park." },
  // { id: uuidv4(), date: new Date(2024, 6, 25).toISOString(), category: EventCategory.Birthday, title: "Alice's Birthday" },
];


export function useEvents() {
  const [events, setEvents] = useLocalStorage<AppEvent[]>(EVENTS_STORAGE_KEY, initialEvents);

  const addEvent = useCallback((eventData: Omit<AppEvent, 'id'>) => {
    const newEvent: AppEvent = { ...eventData, id: uuidv4() };
    setEvents(prevEvents => [...prevEvents, newEvent].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  }, [setEvents]);

  const updateEvent = useCallback((updatedEvent: AppEvent) => {
    setEvents(prevEvents =>
      prevEvents.map(event => (event.id === updatedEvent.id ? updatedEvent : event))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    );
  }, [setEvents]);

  const deleteEvent = useCallback((eventId: string) => {
    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
  }, [setEvents]);

  return { events, addEvent, updateEvent, deleteEvent };
}
