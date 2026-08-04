"use client";

import { useAuth } from '@/contexts/auth-context';
import { getClientAuthHeaders } from '@/lib/client-auth-headers';
import {
    NOTIFICATIONS_CACHE_TTL_MS,
    readLocalCollectionCache,
    readLocalCollectionCacheStale,
    writeLocalCollectionCache
} from '@/lib/collection-cache';
import { db } from '@/lib/firebase';
import { reviveTimestamp, toMillisSafe } from '@/lib/firestore-timestamp';
import { NOTIFICATION_QUERY_LIMITS, NOTIFICATION_UNREAD_LOOKBACK_DAYS } from '@/lib/notification-visibility';
import { shouldDeferScheduledAnnouncement } from '@/lib/scheduled-notifications';
import { reactionsMapsEqual, toggleReactionMap, type ReactionMap } from '@/lib/reaction-utils';
import type { AppNotification } from '@/types';
import {
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { usePathname } from 'next/navigation';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode
} from 'react';

const NOTIFICATIONS_COLLECTION = 'notifications';
const CACHE_KEY_PREFIX = 'notifications_v3';

function cacheKey(uid: string, mode: 'app' | 'admin') {
  return `${CACHE_KEY_PREFIX}_${mode}_${uid}`;
}

function normalizeNotification(raw: AppNotification): AppNotification {
  const createdAt = reviveTimestamp(raw.createdAt);
  return {
    ...raw,
    createdAt: createdAt ?? raw.createdAt,
    readBy: Array.isArray(raw.readBy) ? raw.readBy : [],
    reactions: raw.reactions && typeof raw.reactions === 'object' ? raw.reactions : undefined,
  };
}

function normalizeNotifications(items: AppNotification[]): AppNotification[] {
  return items.map(normalizeNotification);
}

function mergeById(...lists: AppNotification[][]): AppNotification[] {
  const map = new Map<string, AppNotification>();
  for (const list of lists) {
    for (const item of list) {
      map.set(item.id, normalizeNotification(item));
    }
  }
  return [...map.values()].sort((a, b) => toMillisSafe(b.createdAt) - toMillisSafe(a.createdAt));
}

function mapSnapshot(docs: { id: string; data: () => Record<string, unknown> }[]): AppNotification[] {
  return normalizeNotifications(
    docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification)),
  );
}

function notificationLookbackTimestamp(): Timestamp {
  const since = new Date();
  since.setDate(since.getDate() - NOTIFICATION_UNREAD_LOOKBACK_DAYS);
  return Timestamp.fromDate(since);
}

function scheduleIdle(callback: () => void, timeoutMs = 2000): () => void {
  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    }
  ).requestIdleCallback;

  if (typeof ric === 'function') {
    const id = ric(callback, { timeout: timeoutMs });
    return () => {
      (
        window as Window & { cancelIdleCallback?: (id: number) => void }
      ).cancelIdleCallback?.(id);
    };
  }

  const timer = window.setTimeout(callback, Math.min(timeoutMs, 1500));
  return () => window.clearTimeout(timer);
}

const triggerPushNotification = async (notificationId: string): Promise<void> => {
  const delivered = await tryTriggerPushNotification(notificationId, 3);
  if (delivered) return;

  // One delayed retry only — extra bursts burn Vercel Fluid CPU for little gain.
  setTimeout(() => {
    void tryTriggerPushNotification(notificationId, 2);
  }, 15_000);
};

async function tryTriggerPushNotification(
  notificationId: string,
  maxAttempts: number,
): Promise<boolean> {
  const baseDelayMs = 500;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const headers = await getClientAuthHeaders();
      const res = await fetch('/api/send-push', {
        method: 'POST',
        headers,
        body: JSON.stringify({ notificationId }),
        keepalive: true,
      });

      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.alreadySent || body.deferred) return true;
        if (typeof body.delivered === 'number' && body.delivered > 0) return true;
        // delivered === 0: keep retrying in case tokens appear / FCM recovers
        lastError = new Error('Push delivered to 0 devices');
      } else {
        const body = await res.json().catch(() => ({ error: 'Server returned a non-JSON or empty response.' }));
        lastError = new Error(`Push API failed (${res.status}): ${body.error || res.statusText}`);
        if (res.status === 401 || res.status === 403 || res.status === 400) break;
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }

  console.error('Failed to trigger push notification API:', lastError);
  return false;
}

type NotificationsContextValue = {
  notifications: AppNotification[];
  loading: boolean;
  createNotification: (
    notificationData: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>,
  ) => Promise<{ notificationId: string }>;
  deleteNotification: (notificationId: string) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: (notificationIdsToMark?: string[]) => void;
  toggleReaction: (
    notificationId: string,
    emoji: string,
    baseReactions?: ReactionMap,
  ) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { currentUser, isAdmin } = useAuth();
  const adminMode = pathname.startsWith('/admin/notifications');
  const mode: 'app' | 'admin' = adminMode ? 'admin' : 'app';

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (!currentUser) return [];
    const cached = readLocalCollectionCacheStale<AppNotification[]>(cacheKey(currentUser.uid, mode));
    return cached ? normalizeNotifications(cached) : [];
  });
  const [loading, setLoading] = useState(notifications.length === 0);
  const notificationsRef = useRef(notifications);
  /** Pending optimistic reactions so unrelated snapshot merges don't clobber them. */
  const reactionOverridesRef = useRef<Map<string, ReactionMap>>(new Map());
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVis = () => setTabVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // Pause live listeners while the tab is backgrounded (Firebase reads; no Vercel).
    if (!tabVisible && !adminMode) {
      return;
    }

    const key = cacheKey(currentUser.uid, mode);
    const cached = readLocalCollectionCache<AppNotification[]>(key, NOTIFICATIONS_CACHE_TTL_MS);
    if (cached) {
      setNotifications(normalizeNotifications(cached));
      setLoading(false);
    } else {
      const stale = readLocalCollectionCacheStale<AppNotification[]>(key);
      if (stale) {
        setNotifications(normalizeNotifications(stale));
        setLoading(false);
      } else {
        setLoading(true);
      }
    }

    let cancelled = false;
    let detachListeners: (() => void) | null = null;

    const applyReactionOverrides = (items: AppNotification[]): AppNotification[] => {
      if (reactionOverridesRef.current.size === 0) return items;
      return items.map((n) => {
        const override = reactionOverridesRef.current.get(n.id);
        if (!override) return n;
        if (reactionsMapsEqual(n.reactions, override)) {
          reactionOverridesRef.current.delete(n.id);
          return n;
        }
        return { ...n, reactions: override };
      });
    };

    const persist = (items: AppNotification[]) => {
      if (cancelled) return;
      const next = applyReactionOverrides(items);
      notificationsRef.current = next;
      setNotifications(next);
      writeLocalCollectionCache(key, next);
      setLoading(false);
    };

    const attachAppListeners = () => {
      if (cancelled || detachListeners) return;

      const since = notificationLookbackTimestamp();
      const personalQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', currentUser.uid),
        where('createdAt', '>=', since),
        orderBy('createdAt', 'desc'),
        limit(NOTIFICATION_QUERY_LIMITS.personal),
      );
      const announcementsQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('type', '==', 'announcement'),
        where('createdAt', '>=', since),
        orderBy('createdAt', 'desc'),
        limit(NOTIFICATION_QUERY_LIMITS.announcements),
      );
      // Globals (birthdays, memory verses) are isGlobal but not always type=announcement.
      // Must match server badge queries or icon badges disagree with the in-app list.
      const globalsQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('isGlobal', '==', true),
        where('createdAt', '>=', since),
        orderBy('createdAt', 'desc'),
        limit(NOTIFICATION_QUERY_LIMITS.globals),
      );

      let personalItems: AppNotification[] = cached
        ? normalizeNotifications(cached).filter((n) => n.userId === currentUser.uid)
        : [];
      let announcementItems: AppNotification[] = cached
        ? normalizeNotifications(cached).filter((n) => n.type === 'announcement')
        : [];
      let globalItems: AppNotification[] = cached
        ? normalizeNotifications(cached).filter((n) => n.isGlobal === true)
        : [];

      const mergeAndPersist = () => {
        persist(mergeById(personalItems, announcementItems, globalItems));
      };

      const unsubscribers = [
        onSnapshot(
          personalQuery,
          (snapshot) => {
            personalItems = mapSnapshot(snapshot.docs);
            mergeAndPersist();
          },
          (error) => console.error('Notification listener error:', error),
        ),
        onSnapshot(
          announcementsQuery,
          (snapshot) => {
            announcementItems = mapSnapshot(snapshot.docs);
            mergeAndPersist();
          },
          (error) => console.error('Notification listener error:', error),
        ),
        onSnapshot(
          globalsQuery,
          (snapshot) => {
            globalItems = mapSnapshot(snapshot.docs);
            mergeAndPersist();
          },
          (error) => console.error('Notification listener error:', error),
        ),
      ];

      detachListeners = () => unsubscribers.forEach((u) => u());
    };

    if (adminMode) {
      const announcementsQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('type', '==', 'announcement'),
        orderBy('createdAt', 'desc'),
        limit(100),
      );

      const unsubscribe = onSnapshot(
        announcementsQuery,
        (snapshot) => persist(mapSnapshot(snapshot.docs)),
        (error) => {
          console.error('Error fetching admin notifications:', error);
          setLoading(false);
        },
      );
      return () => {
        cancelled = true;
        unsubscribe();
      };
    }

    // Fresh cache: paint immediately, attach live listeners after idle to protect LCP.
    let cancelIdle: (() => void) | null = null;
    if (cached) {
      cancelIdle = scheduleIdle(attachAppListeners, 2000);
    } else {
      attachAppListeners();
    }

    return () => {
      cancelled = true;
      cancelIdle?.();
      detachListeners?.();
    };
  }, [currentUser, adminMode, mode, tabVisible]);

  const createNotification = useCallback(async (
    notificationData: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>,
  ): Promise<{ notificationId: string }> => {
    if (!notificationData.isGlobal && !notificationData.userId) {
      throw new Error('A non-global notification must have a userId.');
    }

    if (notificationData.type === 'reading_progress' && notificationData.userId) {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', notificationData.userId),
        where('type', '==', 'reading_progress'),
        where('title', '==', notificationData.title),
      );
      const existing = await getDocs(q);
      if (!existing.empty) {
        return { notificationId: existing.docs[0].id };
      }
    }

    const docRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
    const notificationId = docRef.id;
    const dataToSave = {
      ...notificationData,
      createdAt: serverTimestamp(),
      readBy: [],
    };

    await setDoc(docRef, dataToSave);
    const deferPush = shouldDeferScheduledAnnouncement(notificationData.scheduledFor);
    if (!deferPush) {
      // Await the first burst so navigation doesn't cancel auth/fetch mid-flight.
      // Delayed follow-up retries continue in the background.
      await triggerPushNotification(notificationId);
    }

    return { notificationId };
  }, []);

  const deleteNotification = useCallback((notificationId: string) => {
    if (!isAdmin) throw new Error('Unauthorized.');
    deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId)).catch((e) => console.error(e));
  }, [isAdmin]);

  const markAsRead = useCallback((notificationId: string) => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const previous = notificationsRef.current;
    const target = previous.find((n) => n.id === notificationId);
    if (!target || (target.readBy || []).includes(uid)) {
      updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
        readBy: arrayUnion(uid),
      }).catch((e) => console.error('Error marking read:', e));
      return;
    }
    const next = previous.map((n) =>
      n.id === notificationId ? { ...n, readBy: [...(n.readBy || []), uid] } : n,
    );
    setNotifications(next);
    writeLocalCollectionCache(cacheKey(uid, mode), next);
    updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
      readBy: arrayUnion(uid),
    }).catch((e) => {
      console.error('Error marking read:', e);
      setNotifications(previous);
      writeLocalCollectionCache(cacheKey(uid, mode), previous);
    });
  }, [currentUser, mode]);

  const markAllAsRead = useCallback((notificationIdsToMark?: string[]) => {
    if (!currentUser) return;
    const uid = currentUser.uid;

    const notificationsToUpdate = notificationIdsToMark
      ? notificationsRef.current.filter((n) => notificationIdsToMark.includes(n.id))
      : notificationsRef.current.filter((n) => !(n.readBy || []).includes(uid));

    if (notificationsToUpdate.length === 0) return;

    const ids = new Set(notificationsToUpdate.map((n) => n.id));
    const previous = notificationsRef.current;
    const next = previous.map((n) =>
      ids.has(n.id) && !(n.readBy || []).includes(uid)
        ? { ...n, readBy: [...(n.readBy || []), uid] }
        : n,
    );
    setNotifications(next);
    writeLocalCollectionCache(cacheKey(uid, mode), next);

    const batch = writeBatch(db);
    notificationsToUpdate.forEach((n) => {
      batch.update(doc(db, NOTIFICATIONS_COLLECTION, n.id), { readBy: arrayUnion(uid) });
    });
    batch.commit().catch((e) => {
      console.error('Batch mark all as read error:', e);
      setNotifications(previous);
      writeLocalCollectionCache(cacheKey(uid, mode), previous);
    });
  }, [currentUser, mode]);

  const toggleReaction = useCallback((
    notificationId: string,
    emoji: string,
    baseReactions?: ReactionMap,
  ) => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const existing = notificationsRef.current.find((n) => n.id === notificationId);
    const base = baseReactions ?? existing?.reactions;
    const nextReactions = toggleReactionMap(base, emoji, uid);

    reactionOverridesRef.current.set(notificationId, nextReactions);

    const previous = notificationsRef.current;
    const next = existing
      ? previous.map((n) =>
          n.id === notificationId ? { ...n, reactions: nextReactions } : n,
        )
      : previous;
    notificationsRef.current = next;
    setNotifications(next);
    writeLocalCollectionCache(cacheKey(uid, mode), next);

    updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
      reactions: nextReactions,
    }).catch((e) => {
      console.error('Error toggling announcement reaction:', e);
      reactionOverridesRef.current.delete(notificationId);
      notificationsRef.current = previous;
      setNotifications(previous);
      writeLocalCollectionCache(cacheKey(uid, mode), previous);
    });
  }, [currentUser, mode]);

  const value = useMemo(
    () => ({
      notifications,
      loading,
      createNotification,
      deleteNotification,
      markAsRead,
      markAllAsRead,
      toggleReaction,
    }),
    [notifications, loading, createNotification, deleteNotification, markAsRead, markAllAsRead, toggleReaction],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return ctx;
}
