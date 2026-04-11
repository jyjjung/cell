
"use client";

import { useEffect, useCallback, useRef } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging, db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * Explicitly registers firebase-messaging-sw.js and returns its registration.
 * 
 * CRITICAL: We CANNOT use navigator.serviceWorker.ready here — that returns
 * whatever SW is active (e.g. sw.js from next-pwa). Push subscriptions are
 * BOUND to the SW that registers them, so if sw.js registers the subscription,
 * FCM pushes go to sw.js which has no Firebase messaging code, and
 * onBackgroundMessage is NEVER called.
 */
async function getFCMRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: '/',
  });
  // If the SW is still installing, wait for it to activate
  if (registration.installing) {
    await new Promise<void>((resolve) => {
      registration.installing!.addEventListener('statechange', function () {
        if (this.state === 'activated') resolve();
      });
    });
  }
  return registration;
}

export function useFCMToken() {
  const { currentUser } = useAuth();
  const hasSynced = useRef(false);

  const registerToken = useCallback(async (isManual = false) => {
    if (!messaging || !currentUser) return;
    
    if (!isManual && hasSynced.current) return;
    if (isManual) hasSynced.current = false;
    hasSynced.current = true;

    try {
      const permission = Notification.permission;
      
      if (permission === 'granted') {
        const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
        if (!vapidKey) {
          console.error('[useFCMToken] FATAL: Missing NEXT_PUBLIC_FCM_VAPID_KEY.');
          return;
        }

        const registration = await getFCMRegistration();
        const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
        
        if (token) {
          const currentTokens = currentUser.fcmTokens || [];
          
          if (currentTokens[0] !== token) {
            console.log('[useFCMToken] New token — updating (direct SET to avoid arrayUnion accumulation)');
            const filtered = currentTokens.filter(t => t !== token);
            const newList = [token, ...filtered].slice(0, 3);
            
            // CRITICAL: Use direct updateDoc (SET) instead of updateUserProfile.
            // updateUserProfile uses arrayUnion which ADDS to the existing list,
            // causing tokens to accumulate to 84+ over time rather than trimming to 3.
            await updateDoc(doc(db, 'users', currentUser.uid), { fcmTokens: newList });
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
