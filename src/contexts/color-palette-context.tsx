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
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/auth-context';
import {
  APP_THEME_STORAGE_KEY,
  DEFAULT_APP_THEME_ID,
  normalizeAppThemeId,
  type AppThemeId,
} from '@/lib/app-themes';
import { applyAppTheme } from '@/lib/apply-app-theme';

type ColorPaletteContextValue = {
  themeId: AppThemeId;
  setThemeId: (id: AppThemeId) => Promise<void>;
  isReady: boolean;
};

const ColorPaletteContext = createContext<ColorPaletteContextValue | undefined>(undefined);

export function ColorPaletteProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const { currentUser, updateUserProfile } = useAuth();
  // Always start with the default on SSR + first client paint to avoid hydration
  // mismatches from reading localStorage in the useState initializer.
  const [themeId, setThemeIdState] = useState<AppThemeId>(DEFAULT_APP_THEME_ID);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const nextTheme = normalizeAppThemeId(
      currentUser?.appTheme ?? localStorage.getItem(APP_THEME_STORAGE_KEY),
    );
    setThemeIdState(nextTheme);
    setIsReady(true);
  }, [currentUser?.appTheme]);

  useEffect(() => {
    if (!isReady || !resolvedTheme) return;
    const isDark = resolvedTheme === 'dark';
    applyAppTheme(themeId, isDark);
  }, [themeId, resolvedTheme, isReady]);

  const persistPreferences = useCallback(
    async (nextTheme: AppThemeId) => {
      localStorage.setItem(APP_THEME_STORAGE_KEY, nextTheme);

      if (currentUser) {
        await updateUserProfile(currentUser.uid, {
          appTheme: nextTheme,
        });
      }
    },
    [currentUser, updateUserProfile],
  );

  const setThemeId = useCallback(
    async (id: AppThemeId) => {
      setThemeIdState(id);
      await persistPreferences(id);
    },
    [persistPreferences],
  );

  const value = useMemo(
    () => ({
      themeId,
      setThemeId,
      isReady,
    }),
    [themeId, setThemeId, isReady],
  );

  return (
    <ColorPaletteContext.Provider value={value}>
      {children}
    </ColorPaletteContext.Provider>
  );
}

export function useColorPalette() {
  const context = useContext(ColorPaletteContext);
  if (!context) {
    throw new Error('useColorPalette must be used within ColorPaletteProvider');
  }
  return context;
}
