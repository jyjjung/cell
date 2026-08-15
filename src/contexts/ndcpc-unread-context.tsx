'use client';

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
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { hasNdcpcAccess } from '@/lib/app-access';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';
import type { Announcement, ChatMessage, PrayerTopic } from '@/types/ndcpc-ported';
import {
  getLastReadAt,
  READ_TRACKING_KEYS,
  setLastReadAt,
} from '@/lib/ndcpc/read-tracking';
import {
  countUnreadAnnouncements,
  countUnreadChatMessages,
  countUnreadPrayerTopics,
  getLatestAnnouncementReadAt,
  getLatestPrayerReadAt,
} from '@/lib/ndcpc/unread-counts';

type NdcpcUnreadContextValue = {
  chatUnread: number;
  announcementsUnread: number;
  prayerUnread: number;
  announcementsLastReadAt: number;
  prayerLastReadAt: number;
  markAnnouncementsRead: () => void;
  markPrayerRead: () => void;
};

const NdcpcUnreadContext = createContext<NdcpcUnreadContextValue>({
  chatUnread: 0,
  announcementsUnread: 0,
  prayerUnread: 0,
  announcementsLastReadAt: 0,
  prayerLastReadAt: 0,
  markAnnouncementsRead: () => {},
  markPrayerRead: () => {},
});

export function NdcpcUnreadProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const pathname = usePathname();
  const uid = currentUser?.uid;
  const canTrackNdcpc = Boolean(uid && hasNdcpcAccess(currentUser));

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [prayerTopics, setPrayerTopics] = useState<PrayerTopic[]>([]);
  const [announcementsLastRead, setAnnouncementsLastRead] = useState(0);
  const [prayerLastRead, setPrayerLastRead] = useState(0);

  useEffect(() => {
    if (!uid) return;
    setAnnouncementsLastRead(getLastReadAt(READ_TRACKING_KEYS.announcements, uid));
    setPrayerLastRead(getLastReadAt(READ_TRACKING_KEYS.prayer, uid));
  }, [uid]);

  useEffect(() => {
    if (!canTrackNdcpc) {
      setChatMessages([]);
      return;
    }
    const q = query(
      collection(db, NDCPc_COLLECTIONS.chatMessages),
      orderBy('createdAt', 'desc'),
      limit(100),
    );
    return onSnapshot(
      q,
      (snap) => {
        setChatMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage));
      },
      () => {
        setChatMessages([]);
      },
    );
  }, [canTrackNdcpc]);

  useEffect(() => {
    if (!canTrackNdcpc) {
      setAnnouncements([]);
      return;
    }
    const q = query(
      collection(db, NDCPc_COLLECTIONS.announcements),
      orderBy('date', 'desc'),
      limit(50),
    );
    return onSnapshot(
      q,
      (snap) => {
        setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Announcement));
      },
      () => {
        setAnnouncements([]);
      },
    );
  }, [canTrackNdcpc]);

  useEffect(() => {
    if (!canTrackNdcpc) {
      setPrayerTopics([]);
      return;
    }
    const q = query(
      collection(db, NDCPc_COLLECTIONS.prayerTopics),
      orderBy('date', 'desc'),
      limit(50),
    );
    return onSnapshot(
      q,
      (snap) => {
        setPrayerTopics(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PrayerTopic));
      },
      () => {
        setPrayerTopics([]);
      },
    );
  }, [canTrackNdcpc]);

  const markAnnouncementsRead = useCallback(() => {
    if (!uid) return;
    const readAt = getLatestAnnouncementReadAt(announcements);
    setLastReadAt(READ_TRACKING_KEYS.announcements, uid, readAt);
    setAnnouncementsLastRead(readAt);
  }, [uid, announcements]);

  const markPrayerRead = useCallback(() => {
    if (!uid) return;
    const readAt = getLatestPrayerReadAt(prayerTopics);
    setLastReadAt(READ_TRACKING_KEYS.prayer, uid, readAt);
    setPrayerLastRead(readAt);
  }, [uid, prayerTopics]);

  useEffect(() => {
    if (!uid || announcementsLastRead !== 0 || !announcements.length) return;
    markAnnouncementsRead();
  }, [uid, announcements, announcementsLastRead, markAnnouncementsRead]);

  useEffect(() => {
    if (!uid || prayerLastRead !== 0 || !prayerTopics.length) return;
    markPrayerRead();
  }, [uid, prayerTopics, prayerLastRead, markPrayerRead]);

  useEffect(() => {
    if (!uid || !pathname.startsWith('/ndcpc/chat')) return;
    setLastReadAt(READ_TRACKING_KEYS.chat, uid, Date.now());
  }, [uid, pathname]);

  const chatUnread = useMemo(() => {
    if (!uid || pathname.startsWith('/ndcpc/chat')) return 0;
    return countUnreadChatMessages(chatMessages, uid);
  }, [chatMessages, pathname, uid]);

  const announcementsUnread = useMemo(() => {
    if (!uid) return 0;
    return countUnreadAnnouncements(announcements, announcementsLastRead);
  }, [announcements, announcementsLastRead, uid]);

  const prayerUnread = useMemo(() => {
    if (!uid) return 0;
    return countUnreadPrayerTopics(prayerTopics, prayerLastRead);
  }, [prayerTopics, prayerLastRead, uid]);

  const value = useMemo(
    () => ({
      chatUnread,
      announcementsUnread,
      prayerUnread,
      announcementsLastReadAt: announcementsLastRead,
      prayerLastReadAt: prayerLastRead,
      markAnnouncementsRead,
      markPrayerRead,
    }),
    [
      chatUnread,
      announcementsUnread,
      prayerUnread,
      announcementsLastRead,
      prayerLastRead,
      markAnnouncementsRead,
      markPrayerRead,
    ],
  );

  return <NdcpcUnreadContext.Provider value={value}>{children}</NdcpcUnreadContext.Provider>;
}

export function useNdcpcUnread() {
  return useContext(NdcpcUnreadContext);
}
