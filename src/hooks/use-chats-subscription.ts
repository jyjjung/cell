"use client";

import { useState, useEffect } from 'react';
import type { Chat, ChatMemberInfo } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { UsersContext } from '@/contexts/users-context';
import { useContext } from 'react';
import { mergeAvatarData } from '@/lib/avatar-utils';
import { primeMediaUrls } from '@/lib/media-cache';

const CHATS_COLLECTION = 'chats';

type UseChatsSubscriptionOptions = {
  enabled?: boolean;
};

export function useChatsSubscription(options: UseChatsSubscriptionOptions = {}) {
  const { enabled = true } = options;
  const { currentUser } = useAuth();
  const usersContext = useContext(UsersContext);
  const patchUsers = usersContext?.patchUsers;
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !currentUser?.uid) {
      setChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const chatsQuery = query(
      collection(db, CHATS_COLLECTION),
      where('members', 'array-contains', currentUser.uid),
    );

    const unsubscribe = onSnapshot(
      chatsQuery,
      (snapshot) => {
        const chatsData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        } as Chat));

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

        primeMediaUrls(
          chatsData.filter((c) => c.type === 'group').map((c) => c.photoURL),
        );

        if (patchUsers) {
          const byUid = new Map<
            string,
            { uid: string; firstName?: string; lastName?: string; avatar?: ChatMemberInfo['avatar'] }
          >();
          for (const chat of chatsData) {
            for (const [uid, info] of Object.entries(chat.memberInfo || {})) {
              const prev = byUid.get(uid);
              byUid.set(uid, {
                uid,
                firstName: info.firstName ?? prev?.firstName,
                lastName: info.lastName ?? prev?.lastName,
                avatar: prev?.avatar ? mergeAvatarData(prev.avatar, info.avatar) : info.avatar,
              });
            }
          }
          patchUsers([...byUid.values()]);
        }
      },
      (error) => {
        console.error('Error fetching user chats:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [enabled, currentUser?.uid, patchUsers]);

  return { chats, loading };
}
