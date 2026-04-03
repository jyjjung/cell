
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
  Timestamp,
  deleteField,
  type DocumentData,
} from 'firebase/firestore';

const EVENTS_COLLECTION = 'events';

function toIsoString(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  return undefined;
}

export function useEvents() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, EVENTS_COLLECTION), orderBy("date", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsData: AppEvent[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        eventsData.push({
          id: docSnap.id,
          title: data.title,
          date: toIsoString(data.date) ?? '',
          endDate: toIsoString(data.endDate),
          startTime: data.startTime,
          endTime: data.endTime,
          allDay: data.allDay ?? true,
          category: data.category,
          details: data.details ?? '',
          location: data.location,
          allowedRoleIds: data.allowedRoleIds,
          userId: data.userId,
          recurrence: data.recurrence,
          recurrenceUntil: toIsoString(data.recurrenceUntil),
          weekdays: Array.isArray(data.weekdays) ? data.weekdays : undefined,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
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

  const addEvent = useCallback(async (eventData: Omit<AppEvent, 'id'>): Promise<string> => {
    try {
      const dataToSend: Record<string, unknown> = {
        title: eventData.title,
        date: eventData.date,
        category: eventData.category,
        details: eventData.details ?? '',
        allDay: eventData.allDay ?? true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (!eventData.allDay) {
        if (eventData.startTime) dataToSend.startTime = eventData.startTime;
        if (eventData.endTime) dataToSend.endTime = eventData.endTime;
      }
      if (eventData.userId) dataToSend.userId = eventData.userId;
      if (eventData.location) dataToSend.location = eventData.location;
      if (eventData.allowedRoleIds) dataToSend.allowedRoleIds = eventData.allowedRoleIds;

      if (eventData.recurrence && eventData.recurrence !== 'none') {
        dataToSend.recurrence = eventData.recurrence;
        dataToSend.recurrenceUntil = eventData.recurrenceUntil;
        if (eventData.recurrence === 'weekly') {
          dataToSend.weekdays = eventData.weekdays?.length ? eventData.weekdays : [];
        } else if ((eventData.weekdays?.length ?? 0) > 0) {
          dataToSend.weekdays = eventData.weekdays;
        }
      } else {
        if (eventData.endDate) dataToSend.endDate = eventData.endDate;
        if (eventData.weekdays?.length) dataToSend.weekdays = eventData.weekdays;
      }

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
      const dataToUpdate: Record<string, unknown> = {
        title: eventProps.title,
        date: eventProps.date,
        category: eventProps.category,
        details: eventProps.details ?? '',
        allDay: eventProps.allDay ?? true,
        updatedAt: serverTimestamp(),
      };
      if (eventProps.allDay) {
        dataToUpdate.startTime = deleteField();
        dataToUpdate.endTime = deleteField();
      } else {
        dataToUpdate.startTime = eventProps.startTime || deleteField();
        dataToUpdate.endTime = eventProps.endTime || deleteField();
      }

      if (eventProps.location !== undefined) {
        dataToUpdate.location = eventProps.location || deleteField();
      }
      if (eventProps.allowedRoleIds !== undefined) {
        dataToUpdate.allowedRoleIds = eventProps.allowedRoleIds || deleteField();
      }

      if (eventProps.recurrence && eventProps.recurrence !== 'none') {
        dataToUpdate.recurrence = eventProps.recurrence;
        dataToUpdate.recurrenceUntil = eventProps.recurrenceUntil;
        dataToUpdate.endDate = deleteField();
        if (eventProps.recurrence === 'weekly') {
          dataToUpdate.weekdays = eventProps.weekdays?.length ? eventProps.weekdays : [];
        } else if ((eventProps.weekdays?.length ?? 0) > 0) {
          dataToUpdate.weekdays = eventProps.weekdays;
        } else {
          dataToUpdate.weekdays = deleteField();
        }
      } else {
        dataToUpdate.recurrence = deleteField();
        dataToUpdate.recurrenceUntil = deleteField();
        dataToUpdate.weekdays = eventProps.weekdays?.length ? eventProps.weekdays : deleteField();
        dataToUpdate.endDate = eventProps.endDate ? eventProps.endDate : deleteField();
      }

      await updateDoc(eventDocRef, dataToUpdate as DocumentData);
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
