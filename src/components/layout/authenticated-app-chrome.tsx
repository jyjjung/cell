"use client";

import { useEffect, useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/hooks/use-notifications';
import { useChats } from '@/hooks/useChats';
import { useFCMToken } from '@/hooks/use-fcm-token';
import { isChatUnread } from '@/lib/notification-utils';
import type { AppUser } from '@/types';

/** Subscribes to chats, notifications, FCM, and badge updates — only for signed-in users. */
export function AuthenticatedAppChrome({ currentUser }: { currentUser: AppUser }) {
  const pathname = usePathname();
  const { notifications } = useNotifications();
  const { chats } = useChats();
  const { registerToken } = useFCMToken();

  const totalUnreadCount = useMemo(() => {
    const unreadNotifs = notifications.filter((n) => {
      const readBy = Array.isArray(n.readBy) ? n.readBy : [];
      return !readBy.includes(currentUser.uid);
    }).length;

    const unreadChatCount = chats.filter((chat) => {
      if (pathname === `/chat/${chat.id}`) return false;
      return isChatUnread(chat, currentUser.uid);
    }).length;

    return unreadNotifs + unreadChatCount;
  }, [notifications, chats, currentUser.uid, pathname]);

  const updateNativeBadge = useCallback((count: number) => {
    if (typeof window !== 'undefined' && 'setAppBadge' in navigator) {
      if (count > 0) {
        (navigator as Navigator & { setAppBadge: (n: number) => Promise<void> })
          .setAppBadge(count)
          .catch(() => {});
      } else {
        (navigator as Navigator & { clearAppBadge: () => Promise<void> })
          .clearAppBadge()
          .catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    updateNativeBadge(totalUnreadCount);
    const baseTitle = 'em.';
    document.title = totalUnreadCount > 0 ? `(${totalUnreadCount}) ${baseTitle}` : baseTitle;
  }, [totalUnreadCount, updateNativeBadge]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      const title = payload.data?.title || 'New Notification';
      const body = payload.data?.body || '';
      const link = payload.data?.link || '/';
      const tag = payload.data?.tag || 'community-update';

      if (pathname === link && link.startsWith('/chat/')) return;

      if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready
          .then((registration) => {
            registration.showNotification(title, {
              body,
              icon: payload.data?.icon || '/icon.svg',
              tag,
              data: { link },
            });
          })
          .catch(() => {});
      }
    });

    return () => unsubscribe();
  }, [currentUser.uid, pathname]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        registerToken(true);
        window.dispatchEvent(new CustomEvent('chat:resync'));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [registerToken]);

  return null;
}
