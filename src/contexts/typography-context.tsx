"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  DEFAULT_TYPOGRAPHY,
  TYPOGRAPHY_STORAGE_KEY,
  applyTypographyPreferences,
  parseTypographyPreferences,
  type TypographyPreferences,
} from '@/lib/typography-preferences';

type TypographyContextValue = {
  typography: TypographyPreferences;
  setTypography: (next: Partial<TypographyPreferences>) => Promise<void>;
  isReady: boolean;
};

const TypographyContext = createContext<TypographyContextValue | undefined>(undefined);

function readStoredTypography(): TypographyPreferences {
  if (typeof window === 'undefined') return DEFAULT_TYPOGRAPHY;
  try {
    const stored = localStorage.getItem(TYPOGRAPHY_STORAGE_KEY);
    return stored ? parseTypographyPreferences(JSON.parse(stored)) : DEFAULT_TYPOGRAPHY;
  } catch {
    return DEFAULT_TYPOGRAPHY;
  }
}

export function TypographyProvider({ children }: { children: ReactNode }) {
  const { currentUser, updateUserProfile } = useAuth();
  const [typography, setTypographyState] = useState<TypographyPreferences>(DEFAULT_TYPOGRAPHY);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const next = currentUser?.typography
      ? parseTypographyPreferences(currentUser.typography)
      : readStoredTypography();
    setTypographyState(next);
    setIsReady(true);
  }, [currentUser?.typography]);

  useEffect(() => {
    if (!isReady) return;
    applyTypographyPreferences(typography);
  }, [typography, isReady]);

  const persistTypography = useCallback(
    async (next: TypographyPreferences) => {
      localStorage.setItem(TYPOGRAPHY_STORAGE_KEY, JSON.stringify(next));

      if (currentUser) {
        await updateUserProfile(currentUser.uid, { typography: next });
      }
    },
    [currentUser, updateUserProfile]
  );

  const setTypography = useCallback(
    async (patch: Partial<TypographyPreferences>) => {
      const next = { ...typography, ...patch };
      setTypographyState(next);
      await persistTypography(next);
    },
    [typography, persistTypography]
  );

  const value = useMemo(
    () => ({ typography, setTypography, isReady }),
    [typography, setTypography, isReady]
  );

  return <TypographyContext.Provider value={value}>{children}</TypographyContext.Provider>;
}

export function useTypography() {
  const context = useContext(TypographyContext);
  if (!context) {
    throw new Error('useTypography must be used within TypographyProvider');
  }
  return context;
}
