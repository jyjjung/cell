
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

  const registerToken = useCallback(async () => {
    if (!messaging || !currentUser) return;
    
    // Only attempt once per session/mount to avoid spamming
    if (registrationAttempted.current) return;
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
          const existingTokens = currentUser.fcmTokens || [];
          if (!existingTokens.includes(token)) {
            console.log('[useFCMToken] Registering new push token');
            await updateUserProfile(currentUser.uid, { fcmTokens: [token] });
          }
        }
      }
    } catch (error) {
      console.error('[useFCMToken] Token registration failed:', error);
    }
  }, [currentUser, updateUserProfile]);

  useEffect(() => {
    if (currentUser && typeof window !== 'undefined') {
       registerToken();
    }
  }, [currentUser, registerToken]);

  return { registerToken };
}
