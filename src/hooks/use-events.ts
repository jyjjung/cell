
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { AppEvent } from '@/types';
import { EventCategory } from '@/types'; // Ensure EventCategory is imported
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
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { format, parseISO, getYear, getMonth, getDate } from 'date-fns';
import { useNotifications } from './use-notifications'; // Import the notifications hook


const EVENTS_COLLECTION = 'events';

export function useEvents() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { createNotification } = useNotifications();

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

  const addEvent = useCallback(async (eventData: Omit<AppEvent, 'id'>): Promise<string> => {
    try {
      const dataToSend = {
        ...eventData,
        details: eventData.details ?? '',
        summary: eventData.summary ?? '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, EVENTS_COLLECTION), dataToSend);
      
      // Create a notification for the new event, except for birthdays which are handled separately
      if (eventData.category !== EventCategory.Birthday) {
          try {
              await createNotification({
                  title: `New ${eventData.category}: ${eventData.title}`,
                  message: `Scheduled for ${format(parseISO(eventData.date), 'MMMM d, yyyy')}.`,
                  type: 'event',
                  isGlobal: true,
                  relatedUrl: `/events#${docRef.id}`
              });
          } catch(notifError) {
              console.error("Failed to create notification for new event:", notifError);
              // Do not block the main flow if notification fails
          }
      }

      return docRef.id; // Return the new document ID
    } catch (error: any) {
      console.error("Error adding event to Firestore. Data:", eventData, "Error:", error, "Error Code:", error.code, "Error Message:", error.message);
      if (error.code === 'permission-denied') {
        console.error("Firestore permission denied. Check your security rules.");
      }
      throw error; // Re-throw error
    }
  }, [createNotification]);

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

  const addOrUpdateBirthdayEvent = useCallback(async (userId: string, displayName: string, birthdayISO: string) => {
    try {
      const birthdayDate = parseISO(birthdayISO); 
      const currentYear = getYear(new Date());
      
      const eventDateForCurrentYear = new Date(Date.UTC(currentYear, getMonth(birthdayDate), getDate(birthdayDate)));
      const eventDateISO = eventDateForCurrentYear.toISOString().split('T')[0]; 

      const q = query(
        collection(db, EVENTS_COLLECTION),
        where("userId", "==", userId),
        where("category", "==", EventCategory.Birthday)
      );
      const querySnapshot = await getDocs(q);

      const eventTitle = `${displayName}'s Birthday`;
      const eventDetails = `Happy Birthday to ${displayName}!`; 

      if (!querySnapshot.empty) {
        const existingEventDoc = querySnapshot.docs[0];
        await updateDoc(existingEventDoc.ref, {
          title: eventTitle,
          date: eventDateISO,
          details: eventDetails, 
          summary: '', 
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, EVENTS_COLLECTION), {
          title: eventTitle,
          date: eventDateISO,
          category: EventCategory.Birthday,
          details: eventDetails, 
          summary: '', 
          userId: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error(`Error adding/updating birthday event for user ${userId}:`, error);
    }
  }, []);


  return { events, addEvent, updateEvent, deleteEvent, addOrUpdateBirthdayEvent, loading };
}

