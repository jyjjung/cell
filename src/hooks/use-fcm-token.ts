
"use client";

import { useEffect, useCallback, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

export function useFCMToken() {
  const { currentUser, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const registrationAttempted = useRef(false);

  const registerToken = useCallback(async (isManual = false) => {
    if (!messaging || !currentUser) return;
    
    // Auto-attempts are throttled, manual ones are always permitted
    if (!isManual && registrationAttempted.current) return;
    registrationAttempted.current = true;

    try {
      // Check current permission state
      const permission = Notification.permission;
      
      if (permission === 'granted') {
        const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
        if (!vapidKey) {
            console.warn('[useFCMToken] Missing VAPID key in environment.');
            return;
        }

        const registration = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
        
        if (token) {
          const currentTokens = currentUser.fcmTokens || [];
          
          // If the current token is not at the front of the list, update user profile.
          // We truncate to the 3 most recent tokens to prevent "Graveyards" of stale endpoints.
          if (currentTokens[0] !== token) {
            console.log('[useFCMToken] Syncing push tokens (pruning old ones)');
            const filtered = currentTokens.filter(t => t !== token);
            const newList = [token, ...filtered].slice(0, 3);
            await updateUserProfile(currentUser.uid, { fcmTokens: newList });
          }
        }
      }
    } catch (error) {
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
