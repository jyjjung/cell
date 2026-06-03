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
  BACKGROUND_MODE_STORAGE_KEY,
  COLOR_PALETTE_STORAGE_KEY,
  COLOR_PALETTES,
  DEFAULT_BACKGROUND_MODE,
  DEFAULT_COLOR_PALETTE_ID,
  type BackgroundMode,
  type ColorPaletteId,
  isBackgroundMode,
  isColorPaletteId,
} from '@/lib/color-palettes';
import { applyColorPalette } from '@/lib/apply-color-palette';
import {
  applyGlassEffect,
  GLASS_ENABLED_STORAGE_KEY,
  readStoredGlassEnabled,
} from '@/lib/glass-effect';

type ColorPaletteContextValue = {
  paletteId: ColorPaletteId;
  backgroundMode: BackgroundMode;
  glassEnabled: boolean;
  setPaletteId: (id: ColorPaletteId) => Promise<void>;
  setBackgroundMode: (mode: BackgroundMode) => Promise<void>;
  setGlassEnabled: (enabled: boolean) => Promise<void>;
  overlayScale: number;
  isReady: boolean;
};

const ColorPaletteContext = createContext<ColorPaletteContextValue | undefined>(undefined);

function readStoredPalette(): ColorPaletteId {
  if (typeof window === 'undefined') return DEFAULT_COLOR_PALETTE_ID;
  const stored = localStorage.getItem(COLOR_PALETTE_STORAGE_KEY);
  return isColorPaletteId(stored) ? stored : DEFAULT_COLOR_PALETTE_ID;
}

function readStoredBackgroundMode(): BackgroundMode {
  if (typeof window === 'undefined') return DEFAULT_BACKGROUND_MODE;
  const stored = localStorage.getItem(BACKGROUND_MODE_STORAGE_KEY);
  return isBackgroundMode(stored) ? stored : DEFAULT_BACKGROUND_MODE;
}

export function ColorPaletteProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const { currentUser, updateUserProfile } = useAuth();
  const [paletteId, setPaletteIdState] = useState<ColorPaletteId>(() => readStoredPalette());
  const [backgroundMode, setBackgroundModeState] = useState<BackgroundMode>(() => readStoredBackgroundMode());
  const [glassEnabled, setGlassEnabledState] = useState(() => readStoredGlassEnabled());
  const [isReady, setIsReady] = useState(() => typeof window !== 'undefined');

  useEffect(() => {
    const nextPalette = currentUser?.colorPalette ?? readStoredPalette();
    const nextBackground = currentUser?.backgroundMode ?? readStoredBackgroundMode();
    const nextGlass =
      currentUser?.glassEnabled !== undefined
        ? currentUser.glassEnabled
        : readStoredGlassEnabled();
    setPaletteIdState(nextPalette);
    setBackgroundModeState(nextBackground);
    setGlassEnabledState(nextGlass);
    setIsReady(true);
  }, [currentUser?.colorPalette, currentUser?.backgroundMode, currentUser?.glassEnabled]);

  useEffect(() => {
    if (!isReady || !resolvedTheme) return;
    const isDark = resolvedTheme === 'dark';
    applyColorPalette(paletteId, isDark);
  }, [paletteId, resolvedTheme, isReady]);

  useEffect(() => {
    if (!isReady) return;
    applyGlassEffect(glassEnabled);
  }, [glassEnabled, isReady]);

  const persistPreferences = useCallback(
    async (
      nextPalette: ColorPaletteId,
      nextBackground: BackgroundMode,
      nextGlassEnabled: boolean
    ) => {
      localStorage.setItem(COLOR_PALETTE_STORAGE_KEY, nextPalette);
      localStorage.setItem(BACKGROUND_MODE_STORAGE_KEY, nextBackground);
      localStorage.setItem(GLASS_ENABLED_STORAGE_KEY, String(nextGlassEnabled));

      if (currentUser) {
        await updateUserProfile(currentUser.uid, {
          colorPalette: nextPalette,
          backgroundMode: nextBackground,
          glassEnabled: nextGlassEnabled,
        });
      }
    },
    [currentUser, updateUserProfile]
  );

  const setPaletteId = useCallback(
    async (id: ColorPaletteId) => {
      setPaletteIdState(id);
      await persistPreferences(id, backgroundMode, glassEnabled);
    },
    [backgroundMode, glassEnabled, persistPreferences]
  );

  const setBackgroundMode = useCallback(
    async (mode: BackgroundMode) => {
      setBackgroundModeState(mode);
      await persistPreferences(paletteId, mode, glassEnabled);
    },
    [paletteId, glassEnabled, persistPreferences]
  );

  const setGlassEnabled = useCallback(
    async (enabled: boolean) => {
      setGlassEnabledState(enabled);
      await persistPreferences(paletteId, backgroundMode, enabled);
    },
    [paletteId, backgroundMode, persistPreferences]
  );

  const overlayScale = COLOR_PALETTES[paletteId].overlayScale;

  const value = useMemo(
    () => ({
      paletteId,
      backgroundMode,
      glassEnabled,
      setPaletteId,
      setBackgroundMode,
      setGlassEnabled,
      overlayScale,
      isReady,
    }),
    [
      paletteId,
      backgroundMode,
      glassEnabled,
      setPaletteId,
      setBackgroundMode,
      setGlassEnabled,
      overlayScale,
      isReady,
    ]
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
