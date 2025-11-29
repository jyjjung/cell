
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
          date: typeof data.date === 'string' ? data.date : (data.date as Timestamp)?.toDate().toISOString(),
          details: data.details ?? '', // Default to empty string
          summary: data.summary ?? '', // Default to empty string
        } as AppEvent);
      });
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events from Firestore:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addEvent = useCallback(async (eventData: Omit<AppEvent, 'id'>, sendNotification = true): Promise<string> => {
    try {
      const dataToSend = {
        ...eventData,
        details: eventData.details ?? '',
        summary: eventData.summary ?? '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, EVENTS_COLLECTION), dataToSend);
      return docRef.id;
    } catch (error: any) {
      console.error("Error adding event to Firestore. Data:", eventData, "Error:", error, "Error Code:", error.code, "Error Message:", error.message);
      if (error.code === 'permission-denied') {
        console.error("Firestore permission denied. Check your security rules.");
      }
      throw error;
    }
  }, []);

  const updateEvent = useCallback(async (updatedEvent: AppEvent) => {
    if (!updatedEvent.id) {
      console.error("Event ID is missing for update. Data:", updatedEvent);
      throw new Error("Event ID is missing for update");
    }
    const eventDocRef = doc(db, EVENTS_COLLECTION, updatedEvent.id);
    try {
      const { id, ...eventProps } = updatedEvent;
      const dataToUpdate = {
        ...eventProps,
        details: eventProps.details ?? '',
        summary: eventProps.summary ?? '',
        updatedAt: serverTimestamp(),
      };
      await updateDoc(eventDocRef, dataToUpdate);
    } catch (error: any) {
      console.error("Error updating event in Firestore. Data:", updatedEvent, "Error:", error, "Error Code:", error.code, "Error Message:", error.message);
      if (error.code === 'permission-denied') {
        console.error("Firestore permission denied. Check your security rules.");
      }
      throw error;
    }
  }, []);

  const deleteEvent = useCallback(async (eventId: string) => {
    const eventDocRef = doc(db, EVENTS_COLLECTION, eventId);
    try {
      await deleteDoc(eventDocRef);
    } catch (error: any) {
      console.error("Error deleting event from Firestore. Event ID:", eventId, "Error:", error, "Error Code:", error.code, "Error Message:", error.message);
      if (error.code === 'permission-denied') {
        console.error("Firestore permission denied. Check your security rules.");
      }
      throw error;
    }
  }, []);

  return { events, addEvent, updateEvent, deleteEvent, loading };
}
