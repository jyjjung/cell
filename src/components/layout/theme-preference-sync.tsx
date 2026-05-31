"use client";

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/auth-context';
import type { ColorSchemePreference } from '@/types';

export function ThemePreferenceSync() {
  const { currentUser, updateUserProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const appliedFromProfile = useRef(false);
  const skipNextPersist = useRef(false);

  useEffect(() => {
    if (!currentUser?.colorScheme) {
      appliedFromProfile.current = false;
      return;
    }
    if (appliedFromProfile.current) return;
    if (theme === currentUser.colorScheme) {
      appliedFromProfile.current = true;
      return;
    }
    skipNextPersist.current = true;
    setTheme(currentUser.colorScheme);
    appliedFromProfile.current = true;
  }, [currentUser?.uid, currentUser?.colorScheme, setTheme, theme]);

  useEffect(() => {
    if (!currentUser || !theme) return;
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    const next = theme as ColorSchemePreference;
    if (next === currentUser.colorScheme) return;
    void updateUserProfile(currentUser.uid, { colorScheme: next });
  }, [theme, currentUser, updateUserProfile]);

  return null;
}
