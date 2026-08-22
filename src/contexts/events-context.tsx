"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import type { AppEvent } from '@/types';
import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { getCachedEvents, loadEventsDirectory } from '@/lib/events-directory';
import { writeLocalCollectionCache } from '@/lib/collection-cache';
import { useAuth } from '@/contexts/auth-context';

const EVENTS_COLLECTION = 'events';
const CACHE_KEY = 'events_directory_v1';

type EventsContextValue = {
  events: AppEvent[];
  loading: boolean;
  refreshEvents: () => Promise<AppEvent[]>;
  addEvent: (eventData: Omit<AppEvent, 'id'>) => Promise<string>;
  updateEvent: (updatedEvent: AppEvent) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
};

const EventsContext = createContext<EventsContextValue | null>(null);

function toIsoString(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

export function EventsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { currentUser, loadingAuth } = useAuth();
  const realtime = pathname.startsWith('/admin/events');
  const [events, setEvents] = useState<AppEvent[]>(() => getCachedEvents());
  const [loading, setLoading] = useState(events.length === 0);

  useEffect(() => {
    if (loadingAuth) return;

    if (!currentUser) {
      setEvents([]);
      setLoading(false);
      return;
    }

    if (realtime) {
      setLoading(true);
      const q = query(collection(db, EVENTS_COLLECTION), orderBy('date', 'asc'));
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const eventsData = querySnapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
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
            } as AppEvent;
          });
          setEvents(eventsData);
          writeLocalCollectionCache(CACHE_KEY, eventsData);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching events from Firestore:', error);
          setLoading(false);
        },
      );
      return () => unsubscribe();
    }

    let cancelled = false;

    void loadEventsDirectory().then((loaded) => {
      if (!cancelled) {
        setEvents(loaded);
        setLoading(false);
      }
    });

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void loadEventsDirectory().then((loaded) => {
        if (!cancelled) setEvents(loaded);
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [realtime, currentUser, loadingAuth]);

  const refreshEvents = useCallback(async () => {
    const loaded = await loadEventsDirectory({ forceRefresh: true });
    setEvents(loaded);
    return loaded;
  }, []);

  const addEvent = useCallback(async (eventData: Omit<AppEvent, 'id'>): Promise<string> => {
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
    void refreshEvents();
    return docRef.id;
  }, [refreshEvents]);

  const updateEvent = useCallback(async (updatedEvent: AppEvent) => {
    if (!updatedEvent.id) throw new Error('Event ID is missing for update');
    const eventDocRef = doc(db, EVENTS_COLLECTION, updatedEvent.id);
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
    void refreshEvents();
  }, [refreshEvents]);

  const deleteEvent = useCallback(async (eventId: string) => {
    await deleteDoc(doc(db, EVENTS_COLLECTION, eventId));
    void refreshEvents();
  }, [refreshEvents]);

  const value = useMemo(
    () => ({ events, loading, refreshEvents, addEvent, updateEvent, deleteEvent }),
    [events, loading, refreshEvents, addEvent, updateEvent, deleteEvent],
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

const emptyEvents: EventsContextValue = {
  events: [],
  loading: false,
  refreshEvents: async () => [],
  addEvent: async () => {
    console.warn('[useEvents] write ignored until EventsProvider mounts');
    return '';
  },
  updateEvent: async () => {
    console.warn('[useEvents] write ignored until EventsProvider mounts');
  },
  deleteEvent: async () => {
    console.warn('[useEvents] write ignored until EventsProvider mounts');
  },
};

/** Safe outside EventsProvider (guest / pre-session SSR) — empty directory until session mounts. */
export function useEvents(enabled = true) {
  const ctx = useContext(EventsContext) ?? emptyEvents;
  if (!enabled) {
    return {
      events: [] as AppEvent[],
      loading: false,
      refreshEvents: ctx.refreshEvents,
      addEvent: ctx.addEvent,
      updateEvent: ctx.updateEvent,
      deleteEvent: ctx.deleteEvent,
    };
  }
  return ctx;
}
