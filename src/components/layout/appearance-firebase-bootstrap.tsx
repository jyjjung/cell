"use client";

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useColorPalette } from '@/contexts/color-palette-context';
import { readStoredBibleVersion } from '@/lib/bible-versions';

/** Pushes local appearance prefs to Firebase when the user profile has no saved values yet. */
export function AppearanceFirebaseBootstrap() {
  const { currentUser, updateUserProfile } = useAuth();
  const { themeId, isReady: paletteReady } = useColorPalette();
  const bootstrappedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser || !paletteReady) return;
    if (bootstrappedFor.current === currentUser.uid) return;
    bootstrappedFor.current = currentUser.uid;

    const patch: Record<string, unknown> = {};
    if (!currentUser.appTheme) patch.appTheme = themeId;
    if (!currentUser.bibleTextVersion) patch.bibleTextVersion = readStoredBibleVersion();

    if (Object.keys(patch).length > 0) {
      void updateUserProfile(currentUser.uid, patch);
    }
  }, [currentUser, paletteReady, themeId, updateUserProfile]);

  return null;
}
