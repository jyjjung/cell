
"use client";

import { useEffect, useCallback, useRef } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';

export function useFCMToken() {
  const { currentUser, updateUserProfile } = useAuth();
  const hasSynced = useRef(false);

  const registerToken = useCallback(async (isManual = false) => {
    if (!messaging || !currentUser) return;
    
    // The hasSynced lock prevents redundant auto-registrations on re-renders.
    // isManual=true (from heartbeat / permission grant) always bypasses it so
    // the token can be refreshed after an iOS rotation or service-worker update.
    if (!isManual && hasSynced.current) return;

    // For manual calls, reset the lock so the next auto-sync can also run once.
    if (isManual) hasSynced.current = false;
    hasSynced.current = true;

    try {
      // Check current permission state
      const permission = Notification.permission;
      
      if (permission === 'granted') {
        const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
        if (!vapidKey) {
            console.error('[useFCMToken] FATAL: Missing NEXT_PUBLIC_FCM_VAPID_KEY in environment.');
            return;
        }

        const registration = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
        
        if (token) {
          const currentTokens = currentUser.fcmTokens || [];
          
          // Always keep the freshest token at index 0.
          // Truncate to the 3 most recent to prevent stale token graveyards.
          if (currentTokens[0] !== token) {
            console.log('[useFCMToken] Syncing push tokens (token rotated)');
            const filtered = currentTokens.filter(t => t !== token);
            const newList = [token, ...filtered].slice(0, 3);
            await updateUserProfile(currentUser.uid, { fcmTokens: newList });
          }
        }
      }
    } catch (error) {
      // Reset the lock on failure so it can retry next time
      hasSynced.current = false;
      console.error('[useFCMToken] Token registration failed:', error);
    }
  }, [currentUser, updateUserProfile]);

  const requestPermission = useCallback(async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        registerToken(true);
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
