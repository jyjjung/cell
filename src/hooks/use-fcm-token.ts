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

export function useFCMToken() {
  const { currentUser } = useAuth();
  const hasSynced = useRef(false);

  const registerToken = useCallback(async (isManual = false) => {
    if (!messaging || !currentUser) return;

    if (!isManual && hasSynced.current) return;
    if (isManual) hasSynced.current = false;
    hasSynced.current = true;

    try {
      if (Notification.permission !== 'granted') return;

      const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
      if (!vapidKey) {
        console.error('[useFCMToken] FATAL: Missing NEXT_PUBLIC_FCM_VAPID_KEY.');
        return;
      }

      // Heal decides whether a hard rebind is needed (stale SW / heal version / fcmNeedsResync).
      const healed = await healFcmSubscription(currentUser.uid, { force: isManual });
      if (healed || isManual) return;

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
        await registerToken(true);
        return true;
      }
    } catch (error) {
      console.error('[useFCMToken] Permission request failed:', error);
    }
    return false;
  }, [registerToken]);

  useEffect(() => {
    if (currentUser && typeof window !== 'undefined') {
      registerToken();
    }
  }, [currentUser, registerToken]);

  return { registerToken, requestPermission };
}
