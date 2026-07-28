"use client";

import { useFCMToken } from '@/hooks/use-fcm-token';
import { useNotifications } from '@/hooks/use-notifications';
import { useChats } from '@/hooks/useChats';
import { getFCMRegistration } from '@/lib/fcm-registration';
import { messaging } from '@/lib/firebase';
import { isChatUnread } from '@/lib/notification-utils';
import {
  NOTIFICATION_UNREAD_LOOKBACK_DAYS,
  countUnreadNotificationsForUser,
} from '@/lib/notification-visibility';
import { toMillisSafe } from '@/lib/firestore-timestamp';
import type { AppUser } from '@/types';
import { onMessage } from 'firebase/messaging';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';

/** Subscribes to chats, notifications, FCM, and badge updates — only for signed-in users. */
export function AuthenticatedAppChrome({ currentUser }: { currentUser: AppUser }) {
  const pathname = usePathname();
  const { notifications } = useNotifications();
  const { chats } = useChats();
  const { registerToken } = useFCMToken();

  const totalUnreadCount = useMemo(() => {
    const lookbackMs = Date.now() - NOTIFICATION_UNREAD_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    const recentNotifications = notifications.filter(
      (n) => toMillisSafe(n.createdAt) >= lookbackMs,
    );
    const unreadNotifs = countUnreadNotificationsForUser(recentNotifications, currentUser.uid);

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

      const normalizePath = (value: string) => {
        try {
          const url = value.startsWith('http') ? new URL(value) : new URL(value, window.location.origin);
          return url.pathname.replace(/\/+$/, '') || '/';
        } catch {
          return value.replace(/\/+$/, '') || '/';
        }
      };

      if (normalizePath(pathname) === normalizePath(link) && normalizePath(link).startsWith('/chat/')) {
        return;
      }

      if (Notification.permission === 'granted') {
        getFCMRegistration()
          .then((registration) => {
            registration.showNotification(title, {
              body,
              icon: payload.data?.icon || '/icon-192x192-v4.png',
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
        // Soft refresh only — never force-delete the FCM token on foreground.
        registerToken({ refresh: true });
        window.dispatchEvent(new CustomEvent('chat:resync'));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [registerToken]);

  return null;
}
