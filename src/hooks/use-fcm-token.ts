
"use client";

import { useEffect, useCallback } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';

// ─── Module-level singleton ───────────────────────────────────────────────────
// The SW is registered ONCE per page load, not once per hook mount.
// This prevents race conditions and eliminates repeated SW registrations
// that were causing pages to refresh (via skipWaiting + clients.claim cycles).

const SW_PATH  = '/firebase-messaging-sw.js';
// A dedicated scope that does NOT overlap with Next.js / Workbox sw.js (scope '/').
// This SW only needs to receive push events — it never needs to control a page.
const SW_SCOPE = '/firebase-cloud-messaging-push-scope';

let _swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

function getOrRegisterSW(): Promise<ServiceWorkerRegistration | null> {
  if (_swRegistrationPromise) return _swRegistrationPromise;

  _swRegistrationPromise = (async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

    try {
      // Re-use an existing registration if it's already healthy
      const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
      if (existing?.active) {
        existing.update().catch(() => {}); // Check for SW updates silently
        return existing;
      }

      const reg = await navigator.serviceWorker.register(SW_PATH, {
        scope: SW_SCOPE,
        updateViaCache: 'none',
      });

      // Wait until the SW is active (handles installing → waiting → activated)
      if (!reg.active) {
        await new Promise<void>((resolve) => {
          const sw = reg.installing ?? reg.waiting;
          if (!sw) { resolve(); return; }
          sw.addEventListener('statechange', function onState() {
            if (sw.state === 'activated') {
              sw.removeEventListener('statechange', onState);
              resolve();
            }
          });
          // Guard: already activated by the time listener attached
          if (reg.active) resolve();
        });
      }

      return reg;
    } catch (err) {
      console.error('[useFCMToken] SW registration failed:', err);
      _swRegistrationPromise = null; // Allow retry on next call
      return null;
    }
  })();

  return _swRegistrationPromise;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFCMToken() {
  const { currentUser, updateUserProfile } = useAuth();

  const registerToken = useCallback(async () => {
    if (!messaging || !currentUser) return;
    if (Notification.permission !== 'granted') return;

    const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
    if (!vapidKey) {
      console.warn('[useFCMToken] Missing NEXT_PUBLIC_FCM_VAPID_KEY.');
      return;
    }

    try {
      const registration = await getOrRegisterSW();
      if (!registration) {
        console.warn('[useFCMToken] No SW registration — push unavailable.');
        return;
      }

      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });

      if (!token) {
        console.warn('[useFCMToken] FCM returned no token.');
        return;
      }

      const currentTokens: string[] = currentUser.fcmTokens || [];
      if (currentTokens[0] !== token) {
        console.log('[useFCMToken] Syncing FCM token.');
        const deduped = currentTokens.filter((t) => t !== token);
        await updateUserProfile(currentUser.uid, { fcmTokens: [token, ...deduped].slice(0, 5) });
      }
    } catch (err) {
      console.error('[useFCMToken] Token registration error:', err);
    }
  }, [currentUser, updateUserProfile]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        await registerToken();
        return true;
      }
    } catch (err) {
      console.error('[useFCMToken] Permission request failed:', err);
    }
    return false;
  }, [registerToken]);

  // Register token once on login
  useEffect(() => {
    if (currentUser && typeof window !== 'undefined') {
      registerToken();
    }
  }, [currentUser, registerToken]);

  // Refresh token when user returns to the tab (iOS PWA token rotation)
  useEffect(() => {
    if (!currentUser) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') registerToken();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [currentUser, registerToken]);

  return { registerToken, requestPermission };
}
