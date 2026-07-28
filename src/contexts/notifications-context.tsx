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
import { NOTIFICATION_QUERY_LIMITS } from '@/lib/notification-visibility';
import { shouldDeferScheduledAnnouncement } from '@/lib/scheduled-notifications';
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

const triggerPushNotification = async (notificationId: string): Promise<void> => {
  try {
    const headers = await getClientAuthHeaders();
    const res = await fetch('/api/send-push', {
      method: 'POST',
      headers,
      body: JSON.stringify({ notificationId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Server returned a non-JSON or empty response.' }));
      console.error('Failed to trigger push notification API:', res.status, body.error);
    }
  } catch (error) {
    console.error('Error calling /api/send-push:', error);
  }
};

type NotificationsContextValue = {
  notifications: AppNotification[];
  loading: boolean;
  createNotification: (
    notificationData: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>,
  ) => Promise<{ notificationId: string }>;
  deleteNotification: (notificationId: string) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: (notificationIdsToMark?: string[]) => void;
  toggleAnnouncementReaction: (notificationId: string, emoji: string) => void;
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

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
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

    const persist = (items: AppNotification[]) => {
      if (cancelled) return;
      setNotifications(items);
      writeLocalCollectionCache(key, items);
      setLoading(false);
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

    const personalQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(NOTIFICATION_QUERY_LIMITS.personal),
    );
    const announcementsQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('type', '==', 'announcement'),
      orderBy('createdAt', 'desc'),
      limit(NOTIFICATION_QUERY_LIMITS.announcements),
    );
    // Globals (e.g. memory-verse alerts) are isGlobal but not always type=announcement.
    // Must match server badge queries or icon badges disagree with the in-app list.
    const globalsQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('isGlobal', '==', true),
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

    return () => {
      cancelled = true;
      unsubscribers.forEach((u) => u());
    };
  }, [currentUser, adminMode, mode]);

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
    updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
      readBy: arrayUnion(currentUser.uid),
    }).catch((e) => console.error('Error marking read:', e));
  }, [currentUser]);

  const markAllAsRead = useCallback((notificationIdsToMark?: string[]) => {
    if (!currentUser) return;

    const notificationsToUpdate = notificationIdsToMark
      ? notificationsRef.current.filter((n) => notificationIdsToMark.includes(n.id))
      : notificationsRef.current.filter((n) => !(n.readBy || []).includes(currentUser.uid));

    if (notificationsToUpdate.length === 0) return;

    const batch = writeBatch(db);
    notificationsToUpdate.forEach((n) => {
      batch.update(doc(db, NOTIFICATIONS_COLLECTION, n.id), { readBy: arrayUnion(currentUser.uid) });
    });
    batch.commit().catch((e) => console.error('Batch mark all as read error:', e));
  }, [currentUser]);

  const toggleAnnouncementReaction = useCallback((notificationId: string, emoji: string) => {
    if (!currentUser) return;
    const previous = notificationsRef.current.find((n) => n.id === notificationId);
    if (!previous || previous.type !== 'announcement') return;

    const currentReactions = { ...(previous.reactions || {}) };
    const reactors = new Set(currentReactions[emoji] || []);
    if (reactors.has(currentUser.uid)) reactors.delete(currentUser.uid);
    else reactors.add(currentUser.uid);

    if (reactors.size === 0) delete currentReactions[emoji];
    else currentReactions[emoji] = Array.from(reactors);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, reactions: currentReactions } : n)),
    );

    updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
      reactions: currentReactions,
    }).catch((e) => {
      console.error('Error toggling announcement reaction:', e);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, reactions: previous.reactions } : n,
        ),
      );
    });
  }, [currentUser]);

  const value = useMemo(
    () => ({
      notifications,
      loading,
      createNotification,
      deleteNotification,
      markAsRead,
      markAllAsRead,
      toggleAnnouncementReaction,
    }),
    [notifications, loading, createNotification, deleteNotification, markAsRead, markAllAsRead, toggleAnnouncementReaction],
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
