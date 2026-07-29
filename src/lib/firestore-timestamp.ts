import { Timestamp } from 'firebase/firestore';

export function reviveTimestamp(value: unknown): Timestamp | undefined {
  if (!value) return undefined;
  if (value instanceof Timestamp) return value;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Timestamp.fromMillis(value);
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    if (typeof record.seconds === 'number') {
      const nanoseconds = typeof record.nanoseconds === 'number' ? record.nanoseconds : 0;
      return new Timestamp(record.seconds, nanoseconds);
    }
    if (typeof record._seconds === 'number') {
      const nanoseconds = typeof record._nanoseconds === 'number' ? record._nanoseconds : 0;
      return new Timestamp(record._seconds, nanoseconds);
    }
    if (typeof record.toDate === 'function') {
      try {
        const date = (record as { toDate: () => Date }).toDate();
        if (date instanceof Date && !Number.isNaN(date.getTime())) {
          return Timestamp.fromDate(date);
        }
      } catch {
        /* ignore */
      }
    }
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return Timestamp.fromDate(date);
  }
  return undefined;
}

export function toDateSafe(value: unknown): Date | null {
  const ts = reviveTimestamp(value);
  if (ts) return ts.toDate();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  return null;
}

export function toMillisSafe(value: unknown): number {
  const ts = reviveTimestamp(value);
  if (ts) return ts.toMillis();
  const date = toDateSafe(value);
  return date ? date.getTime() : 0;
}
