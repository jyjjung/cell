'use client';

const STORAGE_PREFIX = 'ndcpc-read:';

export const READ_TRACKING_KEYS = {
  announcements: 'announcements',
  chat: 'chat',
  prayer: 'prayer',
} as const;

export type ReadTrackingKey = (typeof READ_TRACKING_KEYS)[keyof typeof READ_TRACKING_KEYS];

export function getLastReadAt(key: ReadTrackingKey, uid: string): number {
  if (typeof window === 'undefined') return 0;

  try {
    return Number(localStorage.getItem(`${STORAGE_PREFIX}${key}:${uid}`) ?? 0);
  } catch {
    return 0;
  }
}

export function setLastReadAt(key: ReadTrackingKey, uid: string, at = Date.now()) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}:${uid}`, String(at));
  } catch {
    // ignore quota errors
  }
}
