"use client";

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  normalizeBibleVersion,
  readStoredBibleVersion,
  writeStoredBibleVersion,
  type BibleTextVersion,
} from '@/lib/bible-versions';

export function useBibleTextVersion() {
  const { currentUser, updateUserProfile } = useAuth();
  const [version, setVersionState] = useState<BibleTextVersion>(() => readStoredBibleVersion());

  useEffect(() => {
    const next = currentUser?.bibleTextVersion
      ? normalizeBibleVersion(currentUser.bibleTextVersion)
      : readStoredBibleVersion();
    setVersionState(next);
    writeStoredBibleVersion(next);
  }, [currentUser?.bibleTextVersion]);

  const setVersion = useCallback(
    (next: BibleTextVersion) => {
      setVersionState(next);
      writeStoredBibleVersion(next);
      if (currentUser) {
        void updateUserProfile(currentUser.uid, { bibleTextVersion: next });
      }
    },
    [currentUser, updateUserProfile]
  );

  return { version, setVersion };
}
