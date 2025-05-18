
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { AppEvent } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

const EVENTS_COLLECTION = 'events';

export function useEvents() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, EVENTS_COLLECTION), orderBy("date", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsData: AppEvent[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        eventsData.push({
          ...data,
          id: doc.id,
          // Ensure date is string, Firestore might return Timestamp for date fields if not careful
          date: typeof data.date === 'string' ? data.date : (data.date as Timestamp)?.toDate().toISOString(),
        } as AppEvent);
      });
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addEvent = useCallback(async (eventData: Omit<AppEvent, 'id'>) => {
    try {
      await addDoc(collection(db, EVENTS_COLLECTION), {
        ...eventData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error adding event:", error);
    }
  }, []);

  const updateEvent = useCallback(async (updatedEvent: AppEvent) => {
    if (!updatedEvent.id) {
      console.error("Event ID is missing for update");
      return;
    }
    const eventDocRef = doc(db, EVENTS_COLLECTION, updatedEvent.id);
    try {
      // Exclude id from the data to be written to Firestore
      const { id, ...dataToUpdate } = updatedEvent;
      await updateDoc(eventDocRef, {
        ...dataToUpdate,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating event:", error);
    }
  }, []);

  const deleteEvent = useCallback(async (eventId: string) => {
    const eventDocRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
      await deleteDoc(eventDocRef);
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  }, []);

  return { events, addEvent, updateEvent, deleteEvent, loading };
}
