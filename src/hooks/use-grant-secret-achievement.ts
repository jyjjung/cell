"use client";

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { grantSecretAchievement, type SecretAchievementKey } from '@/lib/achievement-secrets';

export function useGrantSecretAchievement(secretKey: SecretAchievementKey, enabled = true) {
  const { currentUser, registerSecretUnlock } = useAuth();

  useEffect(() => {
    if (!enabled || !currentUser?.uid) return;
    if (currentUser.unlockedSecrets?.includes(secretKey)) return;

    let active = true;

    void (async () => {
      try {
        const achievement = await grantSecretAchievement(currentUser.uid, secretKey);
        if (!active) return;
        if (achievement) {
          registerSecretUnlock(secretKey);
        }
      } catch (error) {
        console.error('[useGrantSecretAchievement]', secretKey, error);
      }
    })();

    return () => {
      active = false;
    };
  }, [
    enabled,
    secretKey,
    currentUser?.uid,
    currentUser?.unlockedSecrets,
    registerSecretUnlock,
  ]);
}
