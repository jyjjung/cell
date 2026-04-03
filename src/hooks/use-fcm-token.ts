
"use client";

import { useEffect, useCallback, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';

const SW_PATH = '/firebase-messaging-sw.js';
const SW_SCOPE = '/';

/**
 * Ensures the Firebase Messaging service worker is registered and returns its
 * registration. Idempotent — safe to call multiple times.
 */
async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    // Check for an existing registration first (avoids duplicate installs)
    const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    if (existing?.active?.scriptURL?.endsWith(SW_PATH)) {
      return existing;
    }

    // Register (or re-register) with the correct scope
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: SW_SCOPE,
      updateViaCache: 'none', // Always check for SW updates
    });

    // Wait for the SW to become active
    if (registration.installing || registration.waiting) {
      await new Promise<void>((resolve) => {
        const sw = registration.installing ?? registration.waiting!;
        sw.addEventListener('statechange', function handler() {
          if (this.state === 'activated') {
            sw.removeEventListener('statechange', handler);
            resolve();
          }
        });
        // If it's already activated by the time we attach the listener
        if (registration.active) resolve();
      });
    }

    return registration;
  } catch (error) {
    console.error('[useFCMToken] Service worker registration failed:', error);
    return null;
  }
}

export function useFCMToken() {
  const { currentUser, updateUserProfile } = useAuth();
  const registering = useRef(false);

  const registerToken = useCallback(async () => {
    if (!messaging || !currentUser) return;
    if (registering.current) return; // Prevent concurrent calls
    registering.current = true;

    try {
      // iOS Safari PWA requires notification permission to be 'granted'
      if (Notification.permission !== 'granted') return;

      const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
      if (!vapidKey) {
        console.warn('[useFCMToken] Missing NEXT_PUBLIC_FCM_VAPID_KEY.');
        return;
      }

      const registration = await ensureServiceWorker();
      if (!registration) {
        console.warn('[useFCMToken] No service worker registration available.');
        return;
      }

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        const currentTokens: string[] = currentUser.fcmTokens || [];

        if (currentTokens[0] !== token) {
          console.log('[useFCMToken] Syncing FCM token.');
          const filtered = currentTokens.filter((t) => t !== token);
          const newList = [token, ...filtered].slice(0, 5);
          await updateUserProfile(currentUser.uid, { fcmTokens: newList });
        }
      } else {
        console.warn('[useFCMToken] FCM returned no token. Push notifications may not work on this device/browser.');
      }
    } catch (error) {
      console.error('[useFCMToken] Token registration failed:', error);
    } finally {
      registering.current = false;
    }
  }, [currentUser, updateUserProfile]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await registerToken();
        return true;
      }
    } catch (error) {
      console.error('[useFCMToken] Permission request failed:', error);
    }
    return false;
  }, [registerToken]);

  // On mount and whenever the user changes, try to register the token
  useEffect(() => {
    if (currentUser && typeof window !== 'undefined') {
      registerToken();
    }
  }, [currentUser, registerToken]);

  // Re-register on visibility change (catches iOS PWA token rotation after sleep)
  useEffect(() => {
    if (!currentUser) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        registerToken();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [currentUser, registerToken]);

  return { registerToken, requestPermission };
}
