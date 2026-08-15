"use client";

import { useFCMToken } from '@/hooks/use-fcm-token';
import { useNotifications } from '@/hooks/use-notifications';
import { useChats } from '@/hooks/useChats';
import { getFCMRegistration } from '@/lib/fcm-registration';
import { messagingPromise } from '@/lib/firebase';
import { sumChatUnreadMessageCounts } from '@/lib/notification-utils';
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

    const unreadMessages = sumChatUnreadMessageCounts(
      chats,
      currentUser.uid,
      (chat) =>
        pathname === `/chat/${chat.id}`
        || pathname === `/ndcpc/chat/${chat.id}`,
    );

    return unreadNotifs + unreadMessages;
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
    if (typeof window === 'undefined') return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const attach = async () => {
      const messaging = await messagingPromise;
      if (cancelled || !messaging) return;
      unsubscribe = onMessage(messaging, (payload) => {
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
              if (!registration) return;
              registration.showNotification(title, {
                body,
                icon: payload.data?.icon || '/icon-192x192-v5.png',
                tag,
                data: { link },
              });
            })
            .catch(() => {});
        }
      });
    };

    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback;

    let cancelSchedule: (() => void) | null = null;
    if (typeof ric === 'function') {
      const id = ric(attach, { timeout: 4000 });
      cancelSchedule = () => {
        (
          window as Window & { cancelIdleCallback?: (id: number) => void }
        ).cancelIdleCallback?.(id);
      };
    } else {
      const timer = window.setTimeout(attach, 2000);
      cancelSchedule = () => window.clearTimeout(timer);
    }

    return () => {
      cancelled = true;
      cancelSchedule?.();
      unsubscribe?.();
    };
  }, [currentUser.uid, pathname]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Soft refresh only — never force-delete the FCM token on foreground.
        // Throttled inside useFCMToken (20m) to limit Firestore getDoc/writes.
        registerToken({ refresh: true });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [registerToken]);

  return null;
}
