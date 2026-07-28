"use client";

import { useEffect, useCallback, useRef } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging, db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFCMRegistration } from '@/lib/fcm-registration';
import {
  MAX_FCM_TOKENS,
  healFcmSubscription,
} from '@/lib/fcm-heal';

type RegisterTokenOptions = {
  /** Hard rebind: deleteToken + rewrite. Only for Repair / permission grant. */
  force?: boolean;
  /** Re-check token even if we already synced this session (e.g. app foreground). */
  refresh?: boolean;
};

export function useFCMToken() {
  const { currentUser } = useAuth();
  const hasSynced = useRef(false);

  const registerToken = useCallback(async (options: boolean | RegisterTokenOptions = false) => {
    if (!messaging || !currentUser) return;

    const opts: RegisterTokenOptions =
      typeof options === 'boolean' ? { force: options, refresh: options } : options;
    const force = Boolean(opts.force);
    const refresh = Boolean(opts.refresh || opts.force);

    if (!refresh && hasSynced.current) return;
    hasSynced.current = true;

    try {
      if (Notification.permission !== 'granted') return;

      const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
      if (!vapidKey) {
        console.error('[useFCMToken] FATAL: Missing NEXT_PUBLIC_FCM_VAPID_KEY.');
        return;
      }

      // Heal decides whether a hard rebind is needed (stale SW / heal version / fcmNeedsResync).
      // Never force-delete on ordinary foreground refresh — that invalidates tokens mid-chat.
      const healed = await healFcmSubscription(currentUser.uid, { force });
      if (healed || force) return;

      const registration = await getFCMRegistration();
      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });

      if (token) {
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
        const currentTokens = Array.isArray(userSnap.data()?.fcmTokens)
          ? (userSnap.data()!.fcmTokens as string[])
          : [];

        if (currentTokens[0] !== token) {
          const filtered = currentTokens.filter((t) => t !== token);
          const newList = [token, ...filtered].slice(0, MAX_FCM_TOKENS);

          await updateDoc(doc(db, 'users', currentUser.uid), {
            fcmTokens: newList,
          });
          try {
            await updateDoc(doc(db, 'users', currentUser.uid), { fcmNeedsResync: false });
          } catch {
            // optional heal metadata
          }
        }
      }
    } catch (error) {
      hasSynced.current = false;
      console.error('[useFCMToken] Token registration failed:', error);
    }
  }, [currentUser]);

  const requestPermission = useCallback(async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await registerToken({ force: true });
        return true;
      }
    } catch (error) {
      console.error('[useFCMToken] Permission request failed:', error);
    }
    return false;
  }, [registerToken]);

  useEffect(() => {
    if (!currentUser || typeof window === 'undefined') return;

    const run = () => {
      void registerToken();
    };

    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback;

    if (typeof ric === 'function') {
      const id = ric(run, { timeout: 4000 });
      return () => {
        (
          window as Window & { cancelIdleCallback?: (id: number) => void }
        ).cancelIdleCallback?.(id);
      };
    }

    const timer = window.setTimeout(run, 2500);
    return () => window.clearTimeout(timer);
  }, [currentUser, registerToken]);

  return { registerToken, requestPermission };
}
