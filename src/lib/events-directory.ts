import type { AppEvent } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  getDocsFromCache,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import {
  COLLECTION_CACHE_TTL_MS,
  readLocalCollectionCache,
  readLocalCollectionCacheStale,
  writeLocalCollectionCache,
} from '@/lib/collection-cache';

const EVENTS_COLLECTION = 'events';
const CACHE_KEY = 'events_directory_v1';

function toIsoString(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  return undefined;
}

function docToEvent(docSnap: { id: string; data: () => Record<string, unknown> }): AppEvent {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title as string,
    date: toIsoString(data.date) ?? '',
    endDate: toIsoString(data.endDate),
    startTime: data.startTime as string | undefined,
    endTime: data.endTime as string | undefined,
    allDay: (data.allDay as boolean | undefined) ?? true,
    category: data.category as AppEvent['category'],
    details: (data.details as string | undefined) ?? '',
    location: data.location as string | undefined,
    allowedRoleIds: data.allowedRoleIds as string[] | undefined,
    userId: data.userId as string | undefined,
    recurrence: data.recurrence as AppEvent['recurrence'],
    recurrenceUntil: toIsoString(data.recurrenceUntil),
    weekdays: Array.isArray(data.weekdays) ? (data.weekdays as number[]) : undefined,
    createdAt: data.createdAt as AppEvent['createdAt'],
    updatedAt: data.updatedAt as AppEvent['updatedAt'],
  };
}

export function getCachedEvents(): AppEvent[] {
  return readLocalCollectionCacheStale<AppEvent[]>(CACHE_KEY) ?? [];
}

export async function loadEventsDirectory(options?: { forceRefresh?: boolean }): Promise<AppEvent[]> {
  if (!options?.forceRefresh) {
    const fresh = readLocalCollectionCache<AppEvent[]>(CACHE_KEY, COLLECTION_CACHE_TTL_MS);
    if (fresh) return fresh;

    try {
      const cachedSnap = await getDocsFromCache(
        query(collection(db, EVENTS_COLLECTION), orderBy('date', 'asc')),
      );
      if (!cachedSnap.empty) {
        const events = cachedSnap.docs.map(docToEvent);
        writeLocalCollectionCache(CACHE_KEY, events);
        return events;
      }
    } catch {
      /* persistent cache not warm yet */
    }
  }

  const serverSnap = await getDocs(query(collection(db, EVENTS_COLLECTION), orderBy('date', 'asc')));
  const events = serverSnap.docs.map(docToEvent);
  writeLocalCollectionCache(CACHE_KEY, events);
  return events;
}
