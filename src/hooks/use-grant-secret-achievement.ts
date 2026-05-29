"use client";

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { grantSecretAchievement, type SecretAchievementKey } from '@/lib/achievement-secrets';

export function useGrantSecretAchievement(secretKey: SecretAchievementKey, enabled = true) {
  const { currentUser } = useAuth();
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled || !currentUser?.uid || inFlightRef.current) return;
    if (currentUser.unlockedSecrets?.includes(secretKey)) return;

    inFlightRef.current = true;
    const userId = currentUser.uid;

    void (async () => {
      try {
        await grantSecretAchievement(userId, secretKey);
      } catch {
        // Allow retry on transient failures.
        inFlightRef.current = false;
      }
    })();
  }, [enabled, secretKey, currentUser?.uid]);
}
