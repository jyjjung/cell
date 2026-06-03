"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { useColorPalette } from "@/contexts/color-palette-context";
import {
  cacheScenicWallpapersForOffline,
  primeAllScenicWallpapers,
  primeWallpaperUrls,
} from "@/lib/wallpaper-cache";

type LightPhase = "dawn" | "morning" | "afternoon" | "sunset";
type DarkPhase = "thunder-clouds" | "rain" | "thunder" | "moon-clear";

function getLightPhaseByHour(now: Date): LightPhase {
  const h = now.getHours();
  if (h >= 5 && h < 9) return "dawn";
  if (h >= 9 && h < 13) return "morning";
  if (h >= 13 && h < 17) return "afternoon";
  return "sunset";
}

function getDarkPhaseByHour(now: Date): DarkPhase {
  const h = now.getHours();
  if (h >= 20 || h < 1) return "thunder-clouds";
  if (h >= 1 && h < 4) return "rain";
  if (h >= 4 && h < 7) return "thunder";
  return "moon-clear";
}

const LIGHT_IMAGES: Record<LightPhase, string> = {
  dawn: "/wallpapers/light-dawn.svg",
  morning: "/wallpapers/light-morning.svg",
  afternoon: "/wallpapers/light-afternoon.svg",
  sunset: "/wallpapers/light-sunset.svg",
};

const DARK_IMAGES: Record<DarkPhase, string> = {
  "thunder-clouds": "/wallpapers/dark-thunder-clouds.svg",
  rain: "/wallpapers/dark-rain.svg",
  thunder: "/wallpapers/dark-thunder.svg",
  "moon-clear": "/wallpapers/dark-moon-clear.svg",
};

const PHASE_STYLE_LIGHT: Record<LightPhase, { filter: string; overlay: string; baseVeil: string }> = {
  dawn: {
    filter: "saturate(1.08) brightness(0.96)",
    overlay: "rgba(255, 165, 112, 0.16)",
    baseVeil: "rgba(12, 18, 30, 0.18)",
  },
  morning: {
    filter: "saturate(1.04) brightness(0.98) contrast(1.03)",
    overlay: "rgba(105, 194, 255, 0.08)",
    baseVeil: "rgba(12, 18, 30, 0.14)",
  },
  afternoon: {
    filter: "saturate(1.06) brightness(0.97) contrast(1.02)",
    overlay: "rgba(110, 203, 234, 0.11)",
    baseVeil: "rgba(10, 15, 24, 0.16)",
  },
  sunset: {
    filter: "saturate(1.12) brightness(0.82)",
    overlay: "rgba(124, 84, 176, 0.24)",
    baseVeil: "rgba(10, 14, 25, 0.26)",
  },
};

const PHASE_STYLE_DARK: Record<DarkPhase, { filter: string; overlay: string; baseVeil: string }> = {
  "thunder-clouds": {
    filter: "saturate(1.02) brightness(0.88) contrast(1.16)",
    overlay: "rgba(28, 36, 66, 0.18)",
    baseVeil: "rgba(2, 4, 8, 0.16)",
  },
  rain: {
    filter: "saturate(1.03) brightness(0.84) contrast(1.18)",
    overlay: "rgba(36, 50, 86, 0.2)",
    baseVeil: "rgba(2, 4, 8, 0.2)",
  },
  thunder: {
    filter: "saturate(1.0) brightness(0.8) contrast(1.2)",
    overlay: "rgba(26, 40, 74, 0.22)",
    baseVeil: "rgba(2, 4, 8, 0.22)",
  },
  "moon-clear": {
    filter: "saturate(1.04) brightness(0.9) contrast(1.16)",
    overlay: "rgba(34, 48, 82, 0.16)",
    baseVeil: "rgba(2, 4, 8, 0.14)",
  },
};

function scaleAlpha(rgba: string, scale: number): string {
  const match = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (!match) return rgba;
  const alpha = Math.min(parseFloat(match[4]) * scale, 0.35);
  return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
}

export default function DynamicLakeWallpaper() {
  const [lightPhase, setLightPhase] = useState<LightPhase>(() => getLightPhaseByHour(new Date()));
  const [darkPhase, setDarkPhase] = useState<DarkPhase>(() => getDarkPhaseByHour(new Date()));
  const { resolvedTheme } = useTheme();
  const { backgroundMode, overlayScale, isReady } = useColorPalette();

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setLightPhase(getLightPhaseByHour(now));
      setDarkPhase(getDarkPhaseByHour(now));
    };

    tick();
    const id = window.setInterval(tick, 1000 * 60 * 5);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isReady || backgroundMode !== "scenic") return;
    void cacheScenicWallpapersForOffline();
    const idleId =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(() => primeAllScenicWallpapers(), { timeout: 8000 })
        : window.setTimeout(() => primeAllScenicWallpapers(), 2000);
    return () => {
      if (typeof window.requestIdleCallback === "function") {
        window.cancelIdleCallback(idleId as number);
      } else {
        window.clearTimeout(idleId as number);
      }
    };
  }, [isReady, backgroundMode]);

  const isDark = resolvedTheme === "dark";
  const image = isDark ? DARK_IMAGES[darkPhase] : LIGHT_IMAGES[lightPhase];

  useEffect(() => {
    if (!isReady || backgroundMode !== "scenic") return;
    primeWallpaperUrls([image]);
  }, [image, isReady, backgroundMode]);

  const phaseStyle = useMemo(() => {
    const base = isDark ? PHASE_STYLE_DARK[darkPhase] : PHASE_STYLE_LIGHT[lightPhase];
    return {
      filter: base.filter,
      overlay: scaleAlpha(base.overlay, overlayScale),
      baseVeil: scaleAlpha(base.baseVeil, overlayScale),
    };
  }, [darkPhase, lightPhase, isDark, overlayScale]);

  if (!isReady) {
    return <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-background" />;
  }

  if (backgroundMode === "minimal") {
    return <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-background" />;
  }

  if (backgroundMode === "gradient") {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
        <div
          className="absolute inset-0 transition-opacity transition-duration-[1200ms]"
          style={{
            background: isDark
              ? "radial-gradient(ellipse 120% 80% at 20% 10%, hsl(var(--primary) / 0.22), transparent 55%), radial-gradient(ellipse 100% 70% at 85% 90%, hsl(var(--route-accent) / 0.16), transparent 50%), hsl(var(--background))"
              : "radial-gradient(ellipse 120% 80% at 15% 15%, hsl(var(--primary) / 0.14), transparent 55%), radial-gradient(ellipse 100% 70% at 85% 85%, hsl(var(--route-accent) / 0.1), transparent 50%), hsl(var(--background))",
          }}
        />
      </div>
    );
  }

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 transition-all transition-duration-[1200ms]"
        style={{
          backgroundImage: `url("${image}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: phaseStyle.filter,
        }}
      />
      <div
        className="absolute inset-0 transition-colors transition-duration-[1200ms]"
        style={{ backgroundColor: phaseStyle.overlay }}
      />
      <div
        className="absolute inset-0 transition-colors transition-duration-[1200ms]"
        style={{ backgroundColor: phaseStyle.baseVeil }}
      />
      {isDark && (
        <div
          className="absolute inset-0 transition-opacity transition-duration-[1200ms]"
          style={{
            backgroundImage:
              "radial-gradient(110% 85% at 50% 28%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 34%, rgba(0,0,0,0.18) 100%)",
            mixBlendMode: "soft-light",
            opacity: 0.72 * overlayScale,
          }}
        />
      )}
    </div>
  );
}
