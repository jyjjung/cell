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
  COLOR_PALETTE_STORAGE_KEY,
  type ColorPaletteId,
} from '@/lib/color-palettes';
import {
  APP_THEME_STORAGE_KEY,
  APP_THEMES,
  DEFAULT_APP_THEME_ID,
  normalizeAppThemeId,
  type AppThemeId,
} from '@/lib/app-themes';
import { applyAppTheme } from '@/lib/apply-app-theme';
import { applyGlassEffect } from '@/lib/glass-effect';
import {
  SURFACE_BACKGROUND_STORAGE_KEY,
  type SurfaceBackgroundId,
} from '@/lib/surface-backgrounds';

type ColorPaletteContextValue = {
  themeId: AppThemeId;
  /** @deprecated Use themeId */
  paletteId: ColorPaletteId;
  /** @deprecated Use themeId */
  surfaceBackgroundId: SurfaceBackgroundId;
  setThemeId: (id: AppThemeId) => Promise<void>;
  /** @deprecated Use setThemeId */
  setPaletteId: (id: ColorPaletteId) => Promise<void>;
  /** @deprecated Use setThemeId */
  setSurfaceBackgroundId: (id: SurfaceBackgroundId) => Promise<void>;
  isReady: boolean;
};

const ColorPaletteContext = createContext<ColorPaletteContextValue | undefined>(undefined);

function readStoredTheme(): AppThemeId {
  if (typeof window === 'undefined') return DEFAULT_APP_THEME_ID;
  const storedTheme = localStorage.getItem(APP_THEME_STORAGE_KEY);
  const storedPalette = localStorage.getItem(COLOR_PALETTE_STORAGE_KEY);
  const storedSurface = localStorage.getItem(SURFACE_BACKGROUND_STORAGE_KEY);
  return normalizeAppThemeId(storedTheme, storedPalette, storedSurface);
}

export function ColorPaletteProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const { currentUser, updateUserProfile } = useAuth();
  const [themeId, setThemeIdState] = useState<AppThemeId>(() => readStoredTheme());
  const [isReady, setIsReady] = useState(() => typeof window !== 'undefined');

  const activeTheme = APP_THEMES[themeId];

  useEffect(() => {
    const nextTheme = normalizeAppThemeId(
      currentUser?.appTheme ?? localStorage.getItem(APP_THEME_STORAGE_KEY),
      currentUser?.colorPalette,
      currentUser?.surfaceBackground,
    );
    setThemeIdState(nextTheme);
    setIsReady(true);
  }, [currentUser?.appTheme, currentUser?.colorPalette, currentUser?.surfaceBackground]);

  useEffect(() => {
    if (!isReady || !resolvedTheme) return;
    const isDark = resolvedTheme === 'dark';
    applyAppTheme(themeId, isDark);
    applyGlassEffect(false);
  }, [themeId, resolvedTheme, isReady]);

  const persistPreferences = useCallback(
    async (nextTheme: AppThemeId) => {
      const theme = APP_THEMES[nextTheme];
      localStorage.setItem(APP_THEME_STORAGE_KEY, nextTheme);
      localStorage.setItem(COLOR_PALETTE_STORAGE_KEY, theme.legacyPalette);
      localStorage.setItem(SURFACE_BACKGROUND_STORAGE_KEY, theme.legacySurface);

      if (currentUser) {
        await updateUserProfile(currentUser.uid, {
          appTheme: nextTheme,
          colorPalette: theme.legacyPalette as ColorPaletteId,
          surfaceBackground: theme.legacySurface as SurfaceBackgroundId,
          glassEnabled: false,
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

  const setPaletteId = useCallback(
    async (id: ColorPaletteId) => {
      const next = normalizeAppThemeId(null, id, APP_THEMES[themeId].legacySurface);
      await setThemeId(next);
    },
    [setThemeId, themeId],
  );

  const setSurfaceBackgroundId = useCallback(
    async (id: SurfaceBackgroundId) => {
      const next = normalizeAppThemeId(null, APP_THEMES[themeId].legacyPalette, id);
      await setThemeId(next);
    },
    [setThemeId, themeId],
  );

  const paletteId = activeTheme.legacyPalette as ColorPaletteId;
  const surfaceBackgroundId = activeTheme.legacySurface as SurfaceBackgroundId;

  const value = useMemo(
    () => ({
      themeId,
      paletteId,
      surfaceBackgroundId,
      setThemeId,
      setPaletteId,
      setSurfaceBackgroundId,
      isReady,
    }),
    [themeId, paletteId, surfaceBackgroundId, setThemeId, setPaletteId, setSurfaceBackgroundId, isReady],
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
