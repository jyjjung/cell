"use client";

import { useState, useEffect, useRef } from 'react';
import type { Chat } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, type QuerySnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { UsersContext } from '@/contexts/users-context';
import { useContext } from 'react';
import { usePathname } from 'next/navigation';
import { primeMediaUrls } from '@/lib/media-cache';
import { scheduleIdle } from '@/lib/schedule-idle';

const CHATS_COLLECTION = 'chats';

type UseChatsSubscriptionOptions = {
  enabled?: boolean;
};

function isChatRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === '/cell/chat' ||
    pathname.startsWith('/cell/chat/') ||
    pathname === '/ndcpc/chat' ||
    pathname.startsWith('/ndcpc/chat/') ||
    pathname === '/chat' ||
    pathname.startsWith('/chat/')
  );
}

export function useChatsSubscription(options: UseChatsSubscriptionOptions = {}) {
  const { enabled = true } = options;
  const { currentUser } = useAuth();
  const pathname = usePathname();
  const usersContext = useContext(UsersContext);
  const patchUsers = usersContext?.patchUsers;
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedUidRef = useRef<string | null>(null);
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  );
  const [listenersReady, setListenersReady] = useState(() => isChatRoute(pathname));

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVis = () => setTabVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Chat routes need data immediately; elsewhere idle-defer to protect LCP (badges catch up after paint).
  useEffect(() => {
    if (!enabled || !currentUser?.uid) {
      setListenersReady(false);
      return;
    }
    if (isChatRoute(pathname) || loadedUidRef.current === currentUser.uid) {
      setListenersReady(true);
      return;
    }
    setListenersReady(false);
    return scheduleIdle(() => setListenersReady(true), 2000);
  }, [enabled, currentUser?.uid, pathname]);

  useEffect(() => {
    if (!enabled || !currentUser?.uid || !listenersReady) {
      if (!enabled || !currentUser?.uid) {
        loadedUidRef.current = null;
        setChats([]);
        setLoading(false);
      }
      return;
    }

    // Pause after a successful load while backgrounded. Always subscribe until
    // the first snapshot so hidden webviews (KakaoTalk, iOS) still get chats.
    if (!tabVisible && loadedUidRef.current === currentUser.uid) {
      return;
    }

    setLoading(loadedUidRef.current !== currentUser.uid);
    const chatsQuery = query(
      collection(db, CHATS_COLLECTION),
      where('members', 'array-contains', currentUser.uid),
    );
    const archivedBirthdayChatsQuery = query(
      collection(db, CHATS_COLLECTION),
      where('kind', '==', 'birthday'),
    );
    const snapshots = new Map<string, Chat>();

    const handleSnapshot = (snapshot: QuerySnapshot) => {
      for (const docSnap of snapshot.docs) {
        snapshots.set(docSnap.id, {
          id: docSnap.id,
          ...docSnap.data(),
        } as Chat);
      }

      const chatsData = [...snapshots.values()];

      chatsData.sort((a, b) => {
        const getMillis = (c: Chat) => {
          const ts = c.lastMessageSentAt || c.createdAt;
          if (!ts) return 0;
          if (typeof (ts as { toMillis?: () => number }).toMillis === 'function') {
            return (ts as { toMillis: () => number }).toMillis();
          }
          if (ts instanceof Date) return ts.getTime();
          return 0;
        };
        return getMillis(b) - getMillis(a);
      });

      setChats(chatsData);
      setLoading(false);
      loadedUidRef.current = currentUser.uid;

      primeMediaUrls(
        chatsData.filter((c) => c.type === 'group').map((c) => c.photoURL),
      );

      // Names only — never copy chat memberInfo.avatar into the users directory.
      // That field is app-scoped (cell vs ndcpc) and would bleed em. photos into preschool.
      if (patchUsers) {
        const byUid = new Map<
          string,
          { uid: string; firstName?: string; lastName?: string }
        >();
        for (const chat of chatsData) {
          for (const [uid, info] of Object.entries(chat.memberInfo || {})) {
            const prev = byUid.get(uid);
            byUid.set(uid, {
              uid,
              firstName: info.firstName ?? prev?.firstName,
              lastName: info.lastName ?? prev?.lastName,
            });
          }
        }
        patchUsers([...byUid.values()]);
      }
    };

    const unsubscribeMemberChats = onSnapshot(
      chatsQuery,
      handleSnapshot,
      (error) => {
        console.error('Error fetching user chats:', error);
        setLoading(false);
      },
    );
    const unsubscribeArchivedBirthdayChats = onSnapshot(
      archivedBirthdayChatsQuery,
      handleSnapshot,
      (error) => {
        console.error('Error fetching archived birthday chats:', error);
        setLoading(false);
      },
    );

    return () => {
      unsubscribeMemberChats();
      unsubscribeArchivedBirthdayChats();
    };
  }, [enabled, currentUser?.uid, patchUsers, tabVisible, listenersReady]);

  return { chats, loading };
}
