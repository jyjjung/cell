import type { AppEvent } from '@/types';

/** Normalize Firestore date fields (string, Timestamp, or {seconds}) to ISO strings. */
export function toEventIsoString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate().toISOString();
    }
    if ('_seconds' in value && typeof (value as { _seconds: number })._seconds === 'number') {
      return new Date((value as { _seconds: number })._seconds * 1000).toISOString();
    }
    if ('seconds' in value && typeof (value as { seconds: number }).seconds === 'number') {
      return new Date((value as { seconds: number }).seconds * 1000).toISOString();
    }
  }
  return undefined;
}

export function normalizeEventFromFirestore(
  id: string,
  data: Record<string, unknown>,
): AppEvent {
  return {
    id,
    title: (data.title as string) ?? '',
    date: toEventIsoString(data.date) ?? '',
    endDate: toEventIsoString(data.endDate),
    startTime: data.startTime as string | undefined,
    endTime: data.endTime as string | undefined,
    allDay: (data.allDay as boolean | undefined) ?? true,
    category: (data.category as AppEvent['category']) ?? 'Event',
    details: (data.details as string | undefined) ?? '',
    location: data.location as string | undefined,
    userId: data.userId as string | undefined,
    allowedRoleIds: data.allowedRoleIds as string[] | undefined,
    recurrence: data.recurrence as AppEvent['recurrence'],
    recurrenceUntil: toEventIsoString(data.recurrenceUntil),
    weekdays: Array.isArray(data.weekdays) ? (data.weekdays as number[]) : undefined,
    createdAt: data.createdAt as AppEvent['createdAt'],
    updatedAt: data.updatedAt as AppEvent['updatedAt'],
  };
}
